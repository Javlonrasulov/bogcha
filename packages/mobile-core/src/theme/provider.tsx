import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  createElevation,
  darkPalette,
  lightPalette,
  type Elevation,
  type Palette,
} from './tokens';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'bogcha.theme';

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: Palette;
  elevation: Elevation;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Dark/Light tema (TZ §36). Tanlov qurilmada saqlanadi. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setModeState(stored);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
    const colors = scheme === 'dark' ? darkPalette : lightPalette;
    return {
      mode,
      scheme,
      colors,
      elevation: createElevation(colors, scheme),
      setMode,
    };
  }, [mode, system, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme faqat ThemeProvider ichida ishlaydi');
  return context;
}

/** Faqat ranglar kerak bo'lganda qisqa yo'l. */
export function useColors(): Palette {
  return useTheme().colors;
}
