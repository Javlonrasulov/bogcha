import AsyncStorage from '@react-native-async-storage/async-storage';
import { Locale } from '@bogcha/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getDictionary, intlLocale, type Dictionary } from './dictionary';

const STORAGE_KEY = 'bogcha.locale';

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  /** `Intl` uchun locale kodi — sana va son formatlashda ishlatiladi. */
  intl: string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === Locale.UZ_LATN || value === Locale.UZ_CYRL || value === Locale.RU;
}

/** Ko'p tillilik (TZ §37). Tanlov qurilmada saqlanadi. */
export function I18nProvider({
  children,
  initialLocale = Locale.UZ_LATN,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (isLocale(stored)) setLocaleState(stored);
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: getDictionary(locale), intl: intlLocale(locale), setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n faqat I18nProvider ichida ishlaydi');
  return context;
}

export function useT(): Dictionary {
  return useI18n().t;
}
