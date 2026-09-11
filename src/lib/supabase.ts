import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AttendanceRecord, UserProfile, AbsenceReasonItem } from '../types';

// =============================================
// Ключи localStorage для хранения настроек
// =============================================
const STORAGE_KEY_URL = 'tt_supabase_url';
const STORAGE_KEY_ANON = 'tt_supabase_anon_key';

// =============================================
// Получение настроек из localStorage или env
// =============================================
function getSupabaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY_URL) || import.meta.env.VITE_SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  return localStorage.getItem(STORAGE_KEY_ANON) || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
}

// =============================================
// Создание клиента Supabase
// =============================================
let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key || url === 'https://placeholder.supabase.co') {
    // Возвращаем mock-клиент чтобы не упасть
    return createClient('https://placeholder.supabase.co', 'placeholder-key');
  }

  return createClient(url, key);
}

// Ленивая инициализация клиента
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

// Пересоздание клиента (после изменения настроек)
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}

// Прокси для обратной совместимости
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});

// =============================================
// Сохранение настроек подключения
// =============================================
export function saveConnectionSettings(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  resetSupabaseClient();
}

export function clearConnectionSettings(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  resetSupabaseClient();
}

export function getConnectionSettings(): { url: string; anonKey: string } {
  return {
    url: getSupabaseUrl(),
    anonKey: getSupabaseAnonKey(),
  };
}

// =============================================
// Проверка что Supabase настроен
// =============================================
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url &&
    key &&
    url !== 'https://placeholder.supabase.co' &&
    url.startsWith('https://') &&
    url.includes('.supabase.co')
  );
}

// =============================================
// Тест подключения к Supabase
// =============================================
export async function testConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = createClient(url.trim(), anonKey.trim());
    const { error } = await client.from('absence_reasons').select('id').limit(1);

    if (error) {
      // Если таблица не найдена — подключение работает, но миграция не выполнена
      if (error.message.toLowerCase().includes('does not exist') || error.code === '42P01') {
        return {
          success: true,
          error: 'Подключение работает, но база данных не настроена. Выполните SQL миграцию.',
        };
      }
      // Ошибка RLS — подключение работает, но нужен вход
      if (error.message.toLowerCase().includes('row-level security') || error.code === '42501') {
        return { success: true };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка',
    };
  }
}

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

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const authResult = await getSupabase().auth.getUser();
  const user = authResult.data.user;
  if (!user) return null;

  const profileResult = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileResult.error) {
    console.error('Ошибка получения профиля:', profileResult.error);
    return null;
  }

  return profileResult.data as unknown as UserProfile;
}

export async function createProfile(userId: string, email: string, fullName: string, groupName: string): Promise<UserProfile> {
  // Пробуем через RPC (обходит RLS)
  const { error: rpcError } = await getSupabase().rpc('create_profile_rpc', {
    p_id: userId,
    p_email: email,
    p_full_name: fullName || 'Студент',
    p_group_name: groupName || 'Не указана',
  });

  if (!rpcError) {
    const profile = await getCurrentProfile();
    if (profile) return profile;
  }

  // Fallback на прямую вставку
  const { data, error } = await getSupabase()
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

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const { data, error } = await getSupabase()
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

export async function getAttendance(userId: string, month?: string): Promise<AttendanceRecord[]> {
  return withRetry(async () => {
    let query = getSupabase()
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
  });
}

export async function upsertAttendance(record: Partial<AttendanceRecord> & { user_id: string; date: string; status: AttendanceRecord['status'] }): Promise<AttendanceRecord> {
  return withRetry(async () => {
    const { data, error } = await getSupabase()
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
  });
}

export async function deleteAttendance(userId: string, date: string): Promise<void> {
  return withRetry(async () => {
    const { error } = await getSupabase()
      .from('attendance')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Ошибка удаления записи:', error);
      throw new Error(getReadableError(error));
    }
  });
}

// =============================================
// Realtime
// =============================================

export function subscribeToAttendance(userId: string, callback: (payload: { eventType: string; new: AttendanceRecord; old: AttendanceRecord }) => void) {
  return getSupabase()
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

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 429 && i < maxRetries - 1) {
        console.warn(`429 Too Many Requests, retry ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

function getReadableError(error: { message: string; code?: string; status?: number }): string {
  const msg = error.message.toLowerCase();

  if (error.status === 429) {
    return 'Слишком много запросов. Подождите немного и попробуйте снова';
  }
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
