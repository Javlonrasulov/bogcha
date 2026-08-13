import 'server-only';
import { redirect } from 'next/navigation';
import { getAccessToken } from './session';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Tokensiz so'rov (masalan, login). */
  anonymous?: boolean;
}

/**
 * Server komponentlari va server action'lari uchun API mijozi.
 * Token httpOnly cookie'dan olinadi; muddati o'tgan bo'lsa middleware
 * yangilaydi, yangilash imkonsiz bo'lsa foydalanuvchi login sahifasiga qaytariladi.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, anonymous, headers, ...rest } = options;
  const token = anonymous ? null : await getAccessToken();

  if (!anonymous && !token) redirect('/login');

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    cache: rest.cache ?? 'no-store',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 401 && !anonymous) redirect('/login?reason=expired');

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const data = (payload ?? {}) as {
      message?: string | string[];
      errors?: Array<{ field: string; message: string }>;
    };
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : (data.message ?? 'Server xatosi yuz berdi');
    throw new ApiError(message, response.status, data.errors);
  }

  return payload as T;
}

/**
 * Dashboard vidjetlari uchun: bitta bo'lim xato bersa ham sahifa ishlashda davom etadi.
 */
export async function apiSafe<T>(path: string, fallback: T, options?: ApiFetchOptions): Promise<T> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`[api] ${path} → ${error.status} ${error.message}`);
      return fallback;
    }
    throw error;
  }
}
