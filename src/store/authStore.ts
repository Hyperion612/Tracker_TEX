import { create } from 'zustand';
import { supabase, getCurrentProfile, createProfile, updateProfile as apiUpdateProfile } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, groupName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getCurrentProfile();
        set({ user: profile, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      set({ user: null, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      if (data.user) {
        const profile = await getCurrentProfile();
        set({ user: profile, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (email: string, password: string, fullName: string, groupName: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, group_name: groupName },
        },
      });
      
      if (error) {
        throw new Error(getReadableAuthError(error));
      }
      
      if (data.user) {
        // Ждём немного чтобы сессия полностью установилась
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Пробуем получить профиль (созданный триггером)
        let profile = await getCurrentProfile();
        
        // Если профиль не создан (триггер не сработал), создаём вручную
        if (!profile) {
          console.log('Профиль не создан триггером, создаём вручную...');
          // Ждём ещё немного перед созданием
          await new Promise(resolve => setTimeout(resolve, 500));
          profile = await createProfile(data.user.id, email, fullName, groupName);
        }
        
        set({ user: profile, isLoading: false });
      } else {
        set({ user: null, isLoading: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка регистрации';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    const { user } = get();
    if (!user) return;
    const updated = await apiUpdateProfile(user.id, updates);
    set({ user: updated });
  },

  clearError: () => set({ error: null }),
}));

/** Преобразовать ошибку авторизации в читаемое сообщение */
function getReadableAuthError(error: { message: string; status?: number }): string {
  const msg = error.message.toLowerCase();
  
  if (msg.includes('user already') || msg.includes('already registered')) {
    return 'Пользователь с таким email уже существует';
  }
  if (msg.includes('invalid login credentials')) {
    return 'Неверный email или пароль';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email не подтверждён. Проверьте почту';
  }
  if (msg.includes('database error')) {
    return 'Ошибка базы данных. Проверьте SQL миграцию';
  }
  if (msg.includes('password')) {
    return 'Пароль должен быть не менее 6 символов';
  }
  
  return error.message || 'Ошибка авторизации';
}
