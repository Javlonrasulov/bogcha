'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { loginSchema } from '@bogcha/shared';
import { API_URL, ApiError, apiFetch } from '../../lib/api';
import {
  clearSessionCookies,
  getRefreshToken,
  LOCALE_COOKIE,
  setSessionCookies,
} from '../../lib/session';
import { cookies } from 'next/headers';
import { getDictionary, isLocale } from '../../i18n';
import type { AuthUser } from '../../lib/types';

export interface LoginState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const locale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const t = getDictionary(locale);

  const parsed = loginSchema.safeParse({
    identifier: String(formData.get('identifier') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field === 'string' && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors };
  }

  let session: { accessToken: string; refreshToken: string; expiresIn: number; user: AuthUser };
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });

    if (response.status === 401 || response.status === 403) return { error: t.auth.invalid };
    if (!response.ok) return { error: t.common.error };

    session = await response.json();
  } catch {
    return { error: t.common.error };
  }

  await setSessionCookies(session);

  // Foydalanuvchi profilidagi tilni interfeysga qo'llaymiz.
  if (isLocale(session.user.locale)) {
    (await cookies()).set(LOCALE_COOKIE, session.user.locale, {
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  const next = String(formData.get('next') ?? '') || '/';
  redirect(next.startsWith('/') ? next : '/');
}

export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) await apiFetch('/auth/logout', { method: 'POST', body: { refreshToken } });
  } catch (error) {
    // Chiqish har qanday holatda amalga oshadi.
    if (!(error instanceof ApiError)) throw error;
  }
  await clearSessionCookies();
  revalidatePath('/', 'layout');
  redirect('/login');
}
