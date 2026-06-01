import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
}

const getStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem('bot_saham_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const initialUser = getStoredUser();

export const useAuthStore = create<AuthState>()((set) => ({
  user: initialUser,
  isAuthenticated: initialUser !== null,
  isLoading: false,
  error: null,
  login: (user: User) => {
    localStorage.setItem('bot_saham_user', JSON.stringify(user));
    set({ user, isAuthenticated: true, error: null });
  },
  logout: () => {
    localStorage.removeItem('bot_saham_user');
    set({ user: null, isAuthenticated: false });
  },
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (err: string | null) => set({ error: err })
}));
