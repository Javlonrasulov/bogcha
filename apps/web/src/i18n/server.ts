import 'server-only';
import { cookies } from 'next/headers';
import { Locale } from '@bogcha/shared';
import { LOCALE_COOKIE } from '../lib/session';
import { DEFAULT_LOCALE, getDictionary, isLocale, type Dictionary } from './index';

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Server komponentlari uchun lug'at. */
export async function getT(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}
