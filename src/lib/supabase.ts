import { createClient } from '@supabase/supabase-js';
import type { AttendanceRecord, UserProfile, AbsenceReasonItem } from '../types';

// =============================================
// Подключение к реальному Supabase
// Переменные берутся из .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
// =============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '⚠️ Supabase не настроен! Создайте файл .env в корне проекта и добавьте:\n' +
    'VITE_SUPABASE_URL=https://ваш-проект.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=ваш-anon-ключ\n\n' +
    'Использую localStorage как fallback.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// =============================================
// Справочник причин отсутствия
// =============================================
export const ABSENCE_REASONS: AbsenceReasonItem[] = [
  { id: 'illness_certificate', label: 'Болезнь со справкой', is_excused: true },
  { id: 'personal', label: 'Личные', is_excused: false },
  { id: 'family', label: 'Семейные', is_excused: true },
  { id: 'valid_reason', label: 'Уважительная', is_excused: true },
  { id: 'skip', label: 'Прогул', is_excused: false },
  { id: 'academic_event', label: 'Учебное мероприятие', is_excused: true },
  { id: 'other', label: 'Другое', is_excused: false },
];

// =============================================
// Хелперы для работы с данными
// =============================================

/** Получить профиль текущего пользователя */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;
  return data as unknown as UserProfile;
}

/** Получить записи посещаемости */
export async function getAttendance(userId: string, month?: string): Promise<AttendanceRecord[]> {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (month) {
    const startDate = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const endDate = new Date(y, m, 0).toISOString().split('T')[0];
    query = query.gte('date', startDate).lte('date', endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as AttendanceRecord[];
}

/** Создать или обновить запись посещаемости */
export async function upsertAttendance(record: Partial<AttendanceRecord> & { user_id: string; date: string; status: AttendanceRecord['status'] }): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance')
    .upsert({
      user_id: record.user_id,
      date: record.date,
      status: record.status,
      absence_reason: record.absence_reason || null,
      late_minutes: record.late_minutes || null,
      note: record.note || null,
    }, {
      onConflict: 'user_id,date',
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as AttendanceRecord;
}

/** Удалить запись посещаемости */
export async function deleteAttendance(userId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);

  if (error) throw error;
}

/** Обновить профиль */
export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.full_name,
      group_name: updates.group_name,
      admission_threshold: updates.admission_threshold,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as UserProfile;
}

/** Подписка на realtime изменения в attendance */
export function subscribeToAttendance(userId: string, callback: (payload: { eventType: string; new: AttendanceRecord; old: AttendanceRecord }) => void) {
  return supabase
    .channel('attendance-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as unknown as AttendanceRecord,
          old: payload.old as unknown as AttendanceRecord,
        });
      }
    )
    .subscribe();
}

/** Проверка что Supabase настроен */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
}
