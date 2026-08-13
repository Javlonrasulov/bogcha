'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { isLocale } from '../../i18n';
import { LOCALE_COOKIE, setActiveBranchId, THEME_COOKIE } from '../../lib/session';

export type ThemePreference = 'light' | 'dark' | 'system';

const YEAR = 60 * 60 * 24 * 365;

export async function setThemeAction(theme: ThemePreference): Promise<void> {
  (await cookies()).set(THEME_COOKIE, theme, { sameSite: 'lax', path: '/', maxAge: YEAR });
  revalidatePath('/', 'layout');
}

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { sameSite: 'lax', path: '/', maxAge: YEAR });
  revalidatePath('/', 'layout');
}

export async function setBranchAction(branchId: string): Promise<void> {
  await setActiveBranchId(branchId === 'all' ? null : branchId);
  revalidatePath('/', 'layout');
}
