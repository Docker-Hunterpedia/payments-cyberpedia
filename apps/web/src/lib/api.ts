import { logger } from './logger';
import { tokenStore } from './auth';

const BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3600';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
    };
    tokenStore.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const doFetch = () => {
    const headers: Record<string, string> = {};
    if (options.body !== undefined)
      headers['Content-Type'] = 'application/json';
    const access = tokenStore.access;
    if (access) headers.Authorization = `Bearer ${access}`;
    return fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await doFetch();

  // one silent refresh + retry when the access token has expired
  if (res.status === 401 && tokenStore.refresh && !path.startsWith('/auth/')) {
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) {
      res = await doFetch();
    } else {
      tokenStore.clear();
      window.location.assign('/login');
      throw new ApiError(401, 'Your session has expired — sign in again');
    }
  }

  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const payload = data as {
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    logger.warn(
      { path, status: res.status, message: payload?.message },
      'api error',
    );
    throw new ApiError(
      res.status,
      payload?.message ?? 'Something went wrong — try again',
      payload?.errors,
    );
  }
  return data as T;
}
