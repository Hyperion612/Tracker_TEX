import { create } from 'zustand';
import * as api from '../lib/supabase';
import type { ScheduleItem, DayOfWeek } from '../types';

interface ScheduleState {
  schedule: ScheduleItem[];
  isLoading: boolean;
  fetchSchedule: (userId: string) => Promise<void>;
  addScheduleItem: (item: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => Promise<void>;
  deleteScheduleItem: (id: string) => Promise<void>;
  getScheduleForDay: (day: DayOfWeek) => ScheduleItem[];
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedule: [],
  isLoading: false,

  fetchSchedule: async (userId: string) => {
    set({ isLoading: true });
    try {
      const schedule = await api.getSchedule(userId);
      set({ schedule, isLoading: false });
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
      set({ isLoading: false });
    }
  },

  addScheduleItem: async (item) => {
    // Optimistic update
    const tempId = crypto.randomUUID();
    const newItem: ScheduleItem = {
      ...item,
      id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set((state) => ({
      schedule: [...state.schedule, newItem].sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
        return a.start_time.localeCompare(b.start_time);
      }),
    }));

    try {
      const created = await api.createScheduleItem(item);
      // Replace temp with real
      set((state) => ({
        schedule: state.schedule.map((s) => (s.id === tempId ? created : s)),
      }));
    } catch (error) {
      console.error('Ошибка создания пары:', error);
      // Rollback
      set((state) => ({
        schedule: state.schedule.filter((s) => s.id !== tempId),
      }));
    }
  },

  updateScheduleItem: async (id, updates) => {
    // Optimistic update
    set((state) => ({
      schedule: state.schedule
        .map((s) => (s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s))
        .sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
          return a.start_time.localeCompare(b.start_time);
        }),
    }));

    try {
      await api.updateScheduleItem(id, updates);
    } catch (error) {
      console.error('Ошибка обновления пары:', error);
      // Reload from server
      const userId = get().schedule[0]?.user_id;
      if (userId) {
        await get().fetchSchedule(userId);
      }
    }
  },

  deleteScheduleItem: async (id) => {
    // Optimistic update
    set((state) => ({
      schedule: state.schedule.filter((s) => s.id !== id),
    }));

    try {
      await api.deleteScheduleItem(id);
    } catch (error) {
      console.error('Ошибка удаления пары:', error);
      // Reload from server
      const userId = get().schedule[0]?.user_id;
      if (userId) {
        await get().fetchSchedule(userId);
      }
    }
  },

  getScheduleForDay: (day: DayOfWeek) => {
    return get()
      .schedule.filter((s) => s.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  },
}));
