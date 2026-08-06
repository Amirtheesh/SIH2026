import { create } from 'zustand';

type Role = 'Public' | 'Operator' | 'Admin' | null;

interface User {
  id: string;
  name: string;
  role: Role;
  token: string | null;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, role: Role) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: { id: '1', name: 'Admin User', role: 'Admin', token: 'mock-admin-token' },
  isAuthenticated: true,
  login: (token, role) =>
    set({
      user: { id: '1', name: 'Demo User', role, token },
      isAuthenticated: true,
    }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
