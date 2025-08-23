import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  color: string;
  notes: string;
  isRecurring: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTasks: Task[] = data.map(task => ({
        id: task.id,
        text: task.text,
        completed: task.completed,
        color: task.color,
        notes: task.notes,
        isRecurring: task.is_recurring,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at),
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          text: taskData.text,
          completed: taskData.completed,
          color: taskData.color,
          notes: taskData.notes,
          is_recurring: taskData.isRecurring,
        })
        .select()
        .single();

      if (error) throw error;

      const newTask: Task = {
        id: data.id,
        text: data.text,
        completed: data.completed,
        color: data.color,
        notes: data.notes,
        isRecurring: data.is_recurring,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setTasks(prev => [newTask, ...prev]);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          text: updates.text,
          completed: updates.completed,
          color: updates.color,
          notes: updates.notes,
          is_recurring: updates.isRecurring,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.id === id ? { ...task, ...updates, updatedAt: new Date() } : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const resetRecurringTasks = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('user_id', user.id)
        .eq('is_recurring', true)
        .eq('completed', true);

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.isRecurring && task.completed 
          ? { ...task, completed: false, updatedAt: new Date() }
          : task
      ));
    } catch (error) {
      console.error('Error resetting recurring tasks:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();

      // Check for daily recurring tasks reset
      const today = new Date().toDateString();
      const lastResetDate = localStorage.getItem('lastResetDate');
      
      if (lastResetDate !== today) {
        resetRecurringTasks();
        localStorage.setItem('lastResetDate', today);
      }
    }
  }, [user]);

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    refreshTasks: fetchTasks,
  };
};