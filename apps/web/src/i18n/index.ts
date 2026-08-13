import { Locale, SUPPORTED_LOCALES } from '@bogcha/shared';
import { uzLatn, type Dictionary } from './dictionaries/uz-latn';
import { uzCyrl } from './dictionaries/uz-cyrl';
import { ru } from './dictionaries/ru';

export type { Dictionary };

export const DEFAULT_LOCALE: Locale = Locale.UZ_LATN;

const DICTIONARIES: Record<string, Dictionary> = {
  [Locale.UZ_LATN]: uzLatn,
  [Locale.UZ_CYRL]: uzCyrl,
  [Locale.RU]: ru,
};

export const LOCALE_OPTIONS = SUPPORTED_LOCALES.map((locale) => ({
  value: locale,
  label: DICTIONARIES[locale]?.meta.label ?? locale,
  shortLabel: DICTIONARIES[locale]?.meta.shortLabel ?? locale.toUpperCase(),
}));

export function isLocale(value: string | undefined | null): value is Locale {
  return Boolean(value) && SUPPORTED_LOCALES.includes(value as Locale);
}

export function getDictionary(locale: string | undefined | null): Dictionary {
  return DICTIONARIES[isLocale(locale) ? locale : DEFAULT_LOCALE] ?? uzLatn;
}

/** Sana/son formatlash uchun Intl locale kodi. */
export function intlLocale(locale: string | undefined | null): string {
  if (locale === Locale.RU) return 'ru-RU';
  return 'uz-UZ';
}
