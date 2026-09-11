import { create } from 'zustand';
import { supabase } from '../lib/supabase';
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
      const user = await supabase.auth.getSession();
      set({ user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await supabase.auth.signInWithPassword({ email, password });
      set({ user, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  register: async (email: string, password: string, fullName: string, groupName: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, group_name: groupName } },
      });
      set({ user, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
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
    const updated = await supabase.updateProfile(user.id, updates);
    set({ user: updated });
  },

  clearError: () => set({ error: null }),
}));
