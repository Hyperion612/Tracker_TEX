import { create } from 'zustand';
import * as api from '../lib/supabase';
import type { AttendanceRecord, AttendanceStatus, AbsenceReason, UndoAction } from '../types';

interface AttendanceState {
  records: AttendanceRecord[];
  isLoading: boolean;
  undoAction: UndoAction | null;
  selectedDates: string[];
  fetchRecords: (userId: string, month?: string) => Promise<void>;
  markAttendance: (userId: string, date: string, status: AttendanceStatus, reason?: AbsenceReason | null, minutes?: number | null, note?: string | null) => Promise<void>;
  markRange: (userId: string, dates: string[], status: AttendanceStatus, reason?: AbsenceReason | null, minutes?: number | null, note?: string | null) => Promise<void>;
  clearRecord: (userId: string, date: string) => Promise<void>;
  toggleDateSelection: (date: string) => void;
  clearSelection: () => void;
  selectRange: (start: string, end: string) => void;
  performUndo: () => void;
  getRecordForDate: (date: string) => AttendanceRecord | undefined;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  isLoading: false,
  undoAction: null,
  selectedDates: [],

  fetchRecords: async (userId: string, month?: string) => {
    set({ isLoading: true });
    try {
      const records = await api.getAttendance(userId, month);
      set({ records, isLoading: false });
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
      set({ isLoading: false });
    }
  },

  markAttendance: async (userId, date, status, reason, minutes, note) => {
    const previousRecord = get().records.find(r => r.date === date) || null;

    // Optimistic update
    set((state) => {
      const existingIdx = state.records.findIndex(r => r.date === date);
      const now = new Date().toISOString();
      const record: AttendanceRecord = {
        id: existingIdx >= 0 ? state.records[existingIdx].id : crypto.randomUUID(),
        user_id: userId,
        date,
        status,
        absence_reason: reason || null,
        late_minutes: minutes || null,
        note: note || null,
        created_at: existingIdx >= 0 ? state.records[existingIdx].created_at : now,
        updated_at: now,
      };
      const newRecords = [...state.records];
      if (existingIdx >= 0) {
        newRecords[existingIdx] = record;
      } else {
        newRecords.push(record);
      }
      return { records: newRecords };
    });

    // Persist
    try {
      await api.upsertAttendance({
        user_id: userId,
        date,
        status,
        absence_reason: reason || null,
        late_minutes: minutes || null,
        note: note || null,
      });
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      // Откатить optimistic update
      set((state) => ({
        records: state.records.filter(r => r.date !== date || (previousRecord && r.id === previousRecord.id)),
      }));
      if (previousRecord) {
        set((state) => ({
          records: [...state.records.filter(r => r.date !== date), previousRecord],
        }));
      }
      return;
    }

    // Setup undo
    const timeoutId = setTimeout(() => {
      set({ undoAction: null });
    }, 5000);

    set({
      undoAction: {
        id: date,
        previousRecord,
        timeoutId,
      },
    });
  },

  markRange: async (userId, dates, status, reason, minutes, note) => {
    // Optimistic update for all dates
    set((state) => {
      const now = new Date().toISOString();
      const newRecords = [...state.records];
      for (const date of dates) {
        const existingIdx = newRecords.findIndex(r => r.date === date);
        const record: AttendanceRecord = {
          id: existingIdx >= 0 ? newRecords[existingIdx].id : crypto.randomUUID(),
          user_id: userId,
          date,
          status,
          absence_reason: reason || null,
          late_minutes: minutes || null,
          note: note || null,
          created_at: existingIdx >= 0 ? newRecords[existingIdx].created_at : now,
          updated_at: now,
        };
        if (existingIdx >= 0) {
          newRecords[existingIdx] = record;
        } else {
          newRecords.push(record);
        }
      }
      return { records: newRecords, selectedDates: [] };
    });

    // Persist
    try {
      for (const date of dates) {
        await api.upsertAttendance({
          user_id: userId,
          date,
          status,
          absence_reason: reason || null,
          late_minutes: minutes || null,
          note: note || null,
        });
      }
    } catch (error) {
      console.error('Ошибка сохранения диапазона:', error);
    }
  },

  clearRecord: async (userId, date) => {
    const previousRecord = get().records.find(r => r.date === date) || null;

    // Optimistic
    set((state) => ({
      records: state.records.filter(r => r.date !== date),
    }));

    try {
      await api.deleteAttendance(userId, date);
    } catch (error) {
      console.error('Ошибка удаления:', error);
      // Откатить
      if (previousRecord) {
        set((state) => ({
          records: [...state.records, previousRecord],
        }));
      }
      return;
    }

    const timeoutId = setTimeout(() => {
      set({ undoAction: null });
    }, 5000);

    set({
      undoAction: {
        id: date,
        previousRecord,
        timeoutId,
      },
    });
  },

  toggleDateSelection: (date) => {
    set((state) => {
      const isSelected = state.selectedDates.includes(date);
      return {
        selectedDates: isSelected
          ? state.selectedDates.filter(d => d !== date)
          : [...state.selectedDates, date],
      };
    });
  },

  clearSelection: () => set({ selectedDates: [] }),

  selectRange: (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    set({ selectedDates: dates });
  },

  performUndo: () => {
    const { undoAction } = get();
    if (!undoAction) return;

    clearTimeout(undoAction.timeoutId);

    if (undoAction.previousRecord) {
      // Restore previous state
      set((state) => {
        const existingIdx = state.records.findIndex(r => r.date === undoAction.previousRecord!.date);
        const newRecords = [...state.records];
        if (existingIdx >= 0) {
          newRecords[existingIdx] = undoAction.previousRecord!;
        } else {
          newRecords.push(undoAction.previousRecord!);
        }
        return { records: newRecords, undoAction: null };
      });
      // Persist
      api.upsertAttendance(undoAction.previousRecord).catch(console.error);
    } else {
      // Remove the record that was just created
      const actionId = undoAction.id;
      set((state) => ({
        records: state.records.filter(r => r.date !== actionId),
        undoAction: null,
      }));
      api.deleteAttendance('', actionId).catch(console.error);
    }
  },

  getRecordForDate: (date) => {
    return get().records.find(r => r.date === date);
  },
}));
