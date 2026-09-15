import { create } from 'zustand';
import * as api from '../lib/supabase';
import type { Homework, HomeworkPriority, HomeworkStatus } from '../types';

interface HomeworkState {
  homework: Homework[];
  isLoading: boolean;
  fetchHomework: (userId: string) => Promise<void>;
  addHomework: (homework: Omit<Homework, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateHomework: (id: string, updates: Partial<Homework>) => Promise<void>;
  deleteHomework: (id: string) => Promise<void>;
  getUpcomingHomework: () => Homework[];
  getOverdueHomework: () => Homework[];
}

export const useHomeworkStore = create<HomeworkState>((set, get) => ({
  homework: [],
  isLoading: false,

  fetchHomework: async (userId: string) => {
    set({ isLoading: true });
    try {
      const homework = await api.getHomework(userId);
      set({ homework, isLoading: false });
    } catch (error) {
      console.error('Ошибка загрузки домашних заданий:', error);
      set({ isLoading: false });
    }
  },

  addHomework: async (homework) => {
    // Optimistic update
    const tempId = crypto.randomUUID();
    const newHomework: Homework = {
      ...homework,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set((state) => ({
      homework: [...state.homework, newHomework],
    }));

    try {
      const created = await api.createHomework(homework);
      // Replace temp with real
      set((state) => ({
        homework: state.homework.map((h) => (h.id === tempId ? created : h)),
      }));
    } catch (error) {
      console.error('Ошибка создания домашнего задания:', error);
      // Rollback
      set((state) => ({
        homework: state.homework.filter((h) => h.id !== tempId),
      }));
    }
  },

  updateHomework: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      homework: state.homework.map((h) =>
        h.id === id ? { ...h, ...updates, updated_at: new Date().toISOString() } : h
      ),
    }));

    try {
      await api.updateHomework(id, updates);
    } catch (error) {
      console.error('Ошибка обновления домашнего задания:', error);
      // Reload from server
      const userId = get().homework[0]?.user_id;
      if (userId) {
        await get().fetchHomework(userId);
      }
    }
  },

  deleteHomework: async (id) => {
    // Optimistic update
    set((state) => ({
      homework: state.homework.filter((h) => h.id !== id),
    }));

    try {
      await api.deleteHomework(id);
    } catch (error) {
      console.error('Ошибка удаления домашнего задания:', error);
      // Reload from server
      const userId = get().homework[0]?.user_id;
      if (userId) {
        await get().fetchHomework(userId);
      }
    }
  },

  getUpcomingHomework: () => {
    const today = new Date().toISOString().split('T')[0];
    return get()
      .homework.filter((h) => h.due_date >= today && h.status !== 'completed')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  },

  getOverdueHomework: () => {
    const today = new Date().toISOString().split('T')[0];
    return get()
      .homework.filter((h) => h.due_date < today && h.status !== 'completed')
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  },
}));
