/**
 * Mock Supabase layer — имитирует Supabase API через localStorage.
 * Для подключения реального Supabase замените этот файл на:
 * import { createClient } from '@supabase/supabase-js'
 * export const supabase = createClient(
 *   import.meta.env.VITE_SUPABASE_URL,
 *   import.meta.env.VITE_SUPABASE_ANON_KEY
 * )
 */

import type { AttendanceRecord, UserProfile, AbsenceReasonItem } from '../types';

const STORAGE_KEYS = {
  users: 'tt_users',
  attendance: 'tt_attendance',
  currentUser: 'tt_current_user',
  session: 'tt_session',
};

const ABSENCE_REASONS: AbsenceReasonItem[] = [
  { id: 'illness_certificate', label: 'Болезнь со справкой', is_excused: true },
  { id: 'personal', label: 'Личные', is_excused: false },
  { id: 'family', label: 'Семейные', is_excused: true },
  { id: 'valid_reason', label: 'Уважительная', is_excused: true },
  { id: 'skip', label: 'Прогул', is_excused: false },
  { id: 'academic_event', label: 'Учебное мероприятие', is_excused: true },
  { id: 'other', label: 'Другое', is_excused: false },
];

function getStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Listeners for realtime simulation
type RealtimeCallback = (payload: { event: string; data: unknown }) => void;
const realtimeListeners: RealtimeCallback[] = [];

function notifyRealtime(event: string, data: unknown): void {
  realtimeListeners.forEach(cb => cb({ event, data }));
}

// Auth
async function signUp(email: string, password: string, fullName: string, groupName: string) {
  const users = getStorage<UserProfile[]>(STORAGE_KEYS.users, []);
  const existing = users.find(u => u.email === email);
  if (existing) throw new Error('Пользователь с таким email уже существует');

  const user: UserProfile = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    email,
    full_name: fullName,
    group_name: groupName,
    admission_threshold: 75,
    created_at: new Date().toISOString(),
  };

  users.push(user);
  setStorage(STORAGE_KEYS.users, users);
  setStorage(`tt_pwd_${user.id}`, password);
  setStorage(STORAGE_KEYS.session, { user_id: user.id });

  return { user, error: null };
}

async function signIn(email: string, password: string) {
  const users = getStorage<UserProfile[]>(STORAGE_KEYS.users, []);
  const user = users.find(u => u.email === email);
  if (!user) throw new Error('Пользователь не найден');

  const storedPwd = getStorage<string>(`tt_pwd_${user.id}`, '');
  if (storedPwd !== password) throw new Error('Неверный пароль');

  setStorage(STORAGE_KEYS.session, { user_id: user.id });
  return { user, error: null };
}

async function signOut() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

async function getSession() {
  const session = getStorage<{ user_id: string } | null>(STORAGE_KEYS.session, null);
  if (!session) return null;

  const users = getStorage<UserProfile[]>(STORAGE_KEYS.users, []);
  return users.find(u => u.id === session.user_id) || null;
}

async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const users = getStorage<UserProfile[]>(STORAGE_KEYS.users, []);
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) throw new Error('Пользователь не найден');

  users[idx] = { ...users[idx], ...updates };
  setStorage(STORAGE_KEYS.users, users);
  return users[idx];
}

// Attendance
async function getAttendance(userId: string, month?: string) {
  const records = getStorage<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  let filtered = records.filter(r => r.user_id === userId);
  if (month) {
    filtered = filtered.filter(r => r.date.startsWith(month));
  }
  return filtered;
}

async function upsertAttendance(record: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
  const records = getStorage<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  const existingIdx = records.findIndex(r => r.user_id === record.user_id && r.date === record.date);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    records[existingIdx] = {
      ...records[existingIdx],
      ...record,
      updated_at: now,
    };
    setStorage(STORAGE_KEYS.attendance, records);
    notifyRealtime('UPDATE', records[existingIdx]);
    return records[existingIdx];
  } else {
    const newRecord: AttendanceRecord = {
      id: record.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
      ...record,
      created_at: now,
      updated_at: now,
    };
    records.push(newRecord);
    setStorage(STORAGE_KEYS.attendance, records);
    notifyRealtime('INSERT', newRecord);
    return newRecord;
  }
}

async function deleteAttendance(userId: string, date: string) {
  const records = getStorage<AttendanceRecord[]>(STORAGE_KEYS.attendance, []);
  const filtered = records.filter(r => !(r.user_id === userId && r.date === date));
  setStorage(STORAGE_KEYS.attendance, filtered);
  notifyRealtime('DELETE', { user_id: userId, date });
}

async function upsertRange(userId: string, dates: string[], status: AttendanceRecord['status'], reason?: AttendanceRecord['absence_reason'], minutes?: number, note?: string) {
  const results: AttendanceRecord[] = [];
  for (const date of dates) {
    const record = await upsertAttendance({
      user_id: userId,
      date,
      status,
      absence_reason: reason || null,
      late_minutes: minutes || null,
      note: note || null,
    });
    results.push(record);
  }
  return results;
}

export const supabase = {
  auth: {
    signUp: ({ email, password, options }: { email: string; password: string; options?: { data?: { full_name?: string; group_name?: string } } }) =>
      signUp(email, password, options?.data?.full_name || '', options?.data?.group_name || ''),
    signInWithPassword: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    signOut,
    getSession,
  },
  from: (_table: string) => ({
    select: () => ({ data: null, error: null }),
  }),
  // Custom methods
  getAttendance,
  upsertAttendance,
  deleteAttendance,
  upsertRange,
  updateProfile,
  getAbsenceReasons: () => ABSENCE_REASONS,
  onRealtime: (callback: RealtimeCallback) => {
    realtimeListeners.push(callback);
    return () => {
      const idx = realtimeListeners.indexOf(callback);
      if (idx >= 0) realtimeListeners.splice(idx, 1);
    };
  },
};
