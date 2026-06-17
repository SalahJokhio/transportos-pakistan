import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: string;
  loyaltyPoints: number;
  cnic?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setAccessToken: (token: string) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        }
        set({ user, accessToken, refreshToken: refreshToken ?? null, isAuthenticated: true });
      },

      setAccessToken: (token) => {
        if (typeof window !== 'undefined') localStorage.setItem('accessToken', token);
        set({ accessToken: token });
      },

      updateUser: (partial) => set((state) => ({
        user: state.user ? { ...state.user, ...partial } : null,
      })),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    { name: 'transport-os-auth' },
  ),
);
