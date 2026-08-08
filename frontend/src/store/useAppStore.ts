import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Role values match backend DB exactly (lowercase)
type Role = 'public' | 'operator' | 'admin' | null;

interface User {
  id?: string;
  name: string;
  email: string;
  role: Role;
  token: string;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  // Derived helpers — computed from the DB-authoritative role stored in `user`
  isAdmin: () => boolean;
  isOperator: () => boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      // Returns true only when the backend confirmed role is 'admin'
      isAdmin: () => get().user?.role === 'admin',

      // Returns true when role is 'operator' OR 'admin'
      isOperator: () => {
        const role = get().user?.role;
        return role === 'operator' || role === 'admin';
      },

      login: (user: User) =>
        set({
          user,
          isAuthenticated: true,
        }),

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'app-auth-storage', // persists to localStorage so page refresh keeps you logged in
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
