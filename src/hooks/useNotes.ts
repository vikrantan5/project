import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Note {
  id: string;
  title: string;
  content: string;
  reminderDate?: string;
  reminderTriggered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const useNotes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedNotes: Note[] = data.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        reminderDate: note.reminder_date,
        reminderTriggered: note.reminder_triggered,
        createdAt: new Date(note.created_at),
        updatedAt: new Date(note.updated_at),
      }));

      setNotes(formattedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
          title: noteData.title,
          content: noteData.content,
          reminder_date: noteData.reminderDate,
          reminder_triggered: noteData.reminderTriggered,
        })
        .select()
        .single();

      if (error) throw error;

      const newNote: Note = {
        id: data.id,
        title: data.title,
        content: data.content,
        reminderDate: data.reminder_date,
        reminderTriggered: data.reminder_triggered,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setNotes(prev => [newNote, ...prev]);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: updates.title,
          content: updates.content,
          reminder_date: updates.reminderDate,
          reminder_triggered: updates.reminderTriggered,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotes(prev => prev.map(note => 
        note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note
      ));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== id));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const checkReminders = async () => {
    if (!user) return;

    const now = new Date();
    const dueNotes = notes.filter(note => 
      note.reminderDate && 
      !note.reminderTriggered && 
      new Date(note.reminderDate) <= now
    );

    for (const note of dueNotes) {
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('TaskMaster Reminder', {
          body: `${note.title}: ${note.content.substring(0, 100)}...`,
          icon: '/vite.svg'
        });
      }

      // Mark as triggered
      await updateNote(note.id, { reminderTriggered: true });
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotes();

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Check reminders every 30 seconds
      const interval = setInterval(checkReminders, 30000);
      checkReminders(); // Check immediately

      return () => clearInterval(interval);
    }
  }, [user, notes]);

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes: fetchNotes,
  };
};