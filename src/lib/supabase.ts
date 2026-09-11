import { createClient } from '@supabase/supabase-js';
import type { AttendanceRecord, UserProfile, AbsenceReasonItem } from '../types';

// =============================================
// Подключение к реальному Supabase
// =============================================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase не настроен! Создайте файл .env и добавьте:\n' +
    'VITE_SUPABASE_URL=https://ваш-проект.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=ваш-anon-ключ'
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
// Работа с профилем
// =============================================

/** Получить профиль текущего пользователя */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Ошибка получения профиля:', error);
    return null;
  }

  return data as unknown as UserProfile;
}

/** Создать профиль вручную (fallback если триггер не сработал) */
export async function createProfile(userId: string, email: string, fullName: string, groupName: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      full_name: fullName || 'Студент',
      group_name: groupName || 'Не указана',
    }, {
      onConflict: 'id',
    })
    .select()
    .single();

  if (error) {
    console.error('Ошибка создания профиля:', error);
    throw new Error(getReadableError(error));
  }

  return data as unknown as UserProfile;
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

  if (error) {
    console.error('Ошибка обновления профиля:', error);
    throw new Error(getReadableError(error));
  }

  return data as unknown as UserProfile;
}

// =============================================
// Работа с посещаемостью
// =============================================

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
  if (error) {
    console.error('Ошибка загрузки посещаемости:', error);
    return [];
  }
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

  if (error) {
    console.error('Ошибка сохранения посещаемости:', error);
    throw new Error(getReadableError(error));
  }

  return data as unknown as AttendanceRecord;
}

/** Удалить запись посещаемости */
export async function deleteAttendance(userId: string, date: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('user_id', userId)
    .eq('date', date);

  if (error) {
    console.error('Ошибка удаления записи:', error);
    throw new Error(getReadableError(error));
  }
}

// =============================================
// Realtime
// =============================================

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

// =============================================
// Утилиты
// =============================================

/** Проверка что Supabase настроен */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
}

/** Преобразовать ошибку Supabase в читаемое сообщение */
function getReadableError(error: { message: string; code?: string }): string {
  const msg = error.message.toLowerCase();
  
  if (msg.includes('duplicate') || error.code === '23505') {
    return 'Запись уже существует';
  }
  if (msg.includes('row-level security') || msg.includes('rls')) {
    return 'Нет доступа. Проверьте настройки RLS в Supabase';
  }
  if (msg.includes('relation') && msg.includes('does not exist')) {
    return 'Таблица не найдена. Выполните SQL миграцию';
  }
  if (msg.includes('invalid') && msg.includes('email')) {
    return 'Некорректный email';
  }
  if (msg.includes('password')) {
    return 'Пароль должен быть не менее 6 символов';
  }
  if (msg.includes('check')) {
    return 'Данные не соответствуют требованиям';
  }
  
  return error.message || 'Ошибка базы данных';
}
