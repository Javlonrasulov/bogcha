'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Locale } from '@bogcha/shared';
import type { Dictionary } from './index';

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n faqat I18nProvider ichida ishlatiladi');
  return value;
}

export function useT(): Dictionary {
  return useI18n().t;
}
