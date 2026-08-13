import 'server-only';
import { cookies } from 'next/headers';

/**
 * Sessiya httpOnly cookie'larda saqlanadi — tokenlar hech qachon
 * JavaScript uchun ochiq bo'lmaydi (TZ §40).
 */

export const ACCESS_COOKIE = 'bogcha_at';
export const REFRESH_COOKIE = 'bogcha_rt';
export const BRANCH_COOKIE = 'bogcha_branch';
export const THEME_COOKIE = 'bogcha_theme';
export const LOCALE_COOKIE = 'bogcha_locale';

const isProduction = process.env.NODE_ENV === 'production';

const baseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProduction,
  path: '/',
};

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function setSessionCookies(tokens: SessionTokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions,
    maxAge: Math.max(60, tokens.expiresIn),
  });
  store.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, BRANCH_COOKIE]) {
    store.set(name, '', { ...baseOptions, maxAge: 0 });
  }
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}

export async function getActiveBranchId(): Promise<string | null> {
  return (await cookies()).get(BRANCH_COOKIE)?.value ?? null;
}

export async function setActiveBranchId(branchId: string | null): Promise<void> {
  const store = await cookies();
  if (!branchId) {
    store.set(BRANCH_COOKIE, '', { ...baseOptions, maxAge: 0 });
    return;
  }
  store.set(BRANCH_COOKIE, branchId, { ...baseOptions, maxAge: 60 * 60 * 24 * 180 });
}
