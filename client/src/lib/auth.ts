import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  UserProfileResponse,
  UserStats,
} from '@mal/shared';
import { ApiError, apiFetch } from './api';
import { getAuthToken, setAuthToken } from './auth-token';
import { createStore } from './store';
import { queryClient } from './queryClient';

const USER_STORAGE_KEY = 'mal.auth.user';

export const FALLBACK_DEMO_USERS: DemoUserCard[] = [
  {
    id: '000000000000000000000003',
    email: 'meera.iyer@meetingactionlog.dev',
    name: 'Meera Iyer',
    role: 'Designer',
    avatarHue: 320,
    memberId: '000000000000000000000003',
  },
  {
    id: '000000000000000000000005',
    email: 'priya.menon@meetingactionlog.dev',
    name: 'Priya Menon',
    role: 'Marketing',
    avatarHue: 250,
    memberId: '000000000000000000000005',
  },
  {
    id: '000000000000000000000004',
    email: 'rahul.nair@meetingactionlog.dev',
    name: 'Rahul Nair',
    role: 'QA engineer',
    avatarHue: 46,
    memberId: '000000000000000000000004',
  },
];

function getInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUserToStorage(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export interface DemoUserCard {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarHue: number;
  memberId: string;
}

export interface AuthState {
  user: AuthUser | null;
  stats: UserStats | null;
  token: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  demoUsers: DemoUserCard[];
  init: () => Promise<void>;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
  fetchProfile: () => Promise<UserProfileResponse | null>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  fetchDemoUsers: () => Promise<DemoUserCard[]>;
  clearError: () => void;
}

const initialToken = getAuthToken();
const initialUser = getInitialUser();

export const useAuthStore = createStore<AuthState>((set, get) => ({
  user: initialUser,
  stats: null,
  token: initialToken,
  status: initialToken ? (initialUser ? 'authenticated' : 'loading') : 'unauthenticated',
  error: null,
  demoUsers: [],

  clearError: () => set({ error: null }),

  init: async () => {
    const token = getAuthToken();
    if (!token) {
      set({ status: 'unauthenticated', user: null, token: null });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await apiFetch<AuthUser>('/auth/me');
      saveUserToStorage(user);
      set({ user, token, status: 'authenticated', error: null });
    } catch {
      setAuthToken(null);
      saveUserToStorage(null);
      set({ user: null, token: null, status: 'unauthenticated' });
    }
  },

  login: async (input: LoginInput) => {
    set({ status: 'loading', error: null });
    try {
      const resp = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: input,
      });
      setAuthToken(resp.token);
      saveUserToStorage(resp.user);
      set({
        user: resp.user,
        token: resp.token,
        status: 'authenticated',
        error: null,
      });
      void queryClient.invalidateQueries();
      return resp.user;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
        const matched = FALLBACK_DEMO_USERS.find((d) => d.email === input.email);
        const fallbackUser: AuthUser = {
          id: matched?.id ?? '000000000000000000000003',
          email: input.email,
          name: matched?.name ?? (input.email.split('@')[0] || 'User'),
          role: matched?.role ?? 'Designer',
          avatarHue: matched?.avatarHue ?? 320,
          memberId: matched?.memberId ?? '000000000000000000000003',
          createdAt: new Date().toISOString(),
        };
        const token = 'ghpages-demo-token';
        setAuthToken(token);
        saveUserToStorage(fallbackUser);
        set({
          user: fallbackUser,
          token,
          status: 'authenticated',
          error: null,
        });
        void queryClient.invalidateQueries();
        return fallbackUser;
      }
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      set({ status: 'unauthenticated', error: message });
      throw err;
    }
  },

  register: async (input: RegisterInput) => {
    set({ status: 'loading', error: null });
    try {
      const resp = await apiFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: input,
      });
      setAuthToken(resp.token);
      saveUserToStorage(resp.user);
      set({
        user: resp.user,
        token: resp.token,
        status: 'authenticated',
        error: null,
      });
      void queryClient.invalidateQueries();
      return resp.user;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
        const fallbackUser: AuthUser = {
          id: 'demo-' + Date.now(),
          email: input.email,
          name: input.name,
          role: input.role || 'Member',
          avatarHue: 176,
          memberId: '000000000000000000000001',
          createdAt: new Date().toISOString(),
        };
        const token = 'ghpages-demo-token';
        setAuthToken(token);
        saveUserToStorage(fallbackUser);
        set({
          user: fallbackUser,
          token,
          status: 'authenticated',
          error: null,
        });
        void queryClient.invalidateQueries();
        return fallbackUser;
      }
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ status: 'unauthenticated', error: message });
      throw err;
    }
  },

  logout: () => {
    setAuthToken(null);
    saveUserToStorage(null);
    set({
      user: null,
      stats: null,
      token: null,
      status: 'unauthenticated',
      error: null,
    });
    void queryClient.invalidateQueries();
  },

  fetchProfile: async () => {
    try {
      const profile = await apiFetch<UserProfileResponse>('/auth/profile');
      saveUserToStorage(profile.user);
      set({
        user: profile.user,
        stats: profile.stats,
        status: 'authenticated',
      });
      return profile;
    } catch {
      if (get().token) {
        get().logout();
      }
      return null;
    }
  },

  updateProfile: async (input: UpdateProfileInput) => {
    set({ error: null });
    try {
      const updated = await apiFetch<AuthUser>('/auth/profile', {
        method: 'PATCH',
        body: input,
      });
      saveUserToStorage(updated);
      set({ user: updated, error: null });
      void queryClient.invalidateQueries();
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Profile update failed';
      set({ error: message });
      throw err;
    }
  },

  fetchDemoUsers: async () => {
    try {
      const users = await apiFetch<DemoUserCard[]>('/auth/demo-users');
      if (Array.isArray(users) && users.length > 0) {
        set({ demoUsers: users });
        return users;
      }
    } catch {
      // In static demo / GitHub Pages mode without backend, provide fallback demo accounts
    }
    set({ demoUsers: FALLBACK_DEMO_USERS });
    return FALLBACK_DEMO_USERS;
  },
}));

export { getAuthToken, setAuthToken };
