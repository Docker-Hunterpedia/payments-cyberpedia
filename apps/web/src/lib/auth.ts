import type { Role } from '@cyberpedia/shared';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const ACCESS_KEY = 'cp.access';
const REFRESH_KEY = 'cp.refresh';
const USER_KEY = 'cp.user';

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
