import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Tokenlar qurilmaning himoyalangan xotirasida saqlanadi (TZ §40).
 * Web (Expo Web) da `SecureStore` mavjud emas — u yerda AsyncStorage'ga tushadi.
 */

const ACCESS_KEY = 'bogcha.accessToken';
const REFRESH_KEY = 'bogcha.refreshToken';
const DEVICE_KEY = 'bogcha.deviceId';
const DEMO_PROFILE_KEY = 'bogcha.demoProfile';

export type DemoProfile = 'admin' | 'teacher';

const canUseSecureStore = Platform.OS !== 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (canUseSecureStore) return SecureStore.setItemAsync(key, value);
  return AsyncStorage.setItem(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (canUseSecureStore) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
}

async function removeItem(key: string): Promise<void> {
  if (canUseSecureStore) return SecureStore.deleteItemAsync(key);
  return AsyncStorage.removeItem(key);
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export async function saveTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    setItem(ACCESS_KEY, tokens.accessToken),
    setItem(REFRESH_KEY, tokens.refreshToken),
  ]);
}

export async function readTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(ACCESS_KEY),
    getItem(REFRESH_KEY),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    removeItem(ACCESS_KEY),
    removeItem(REFRESH_KEY),
    AsyncStorage.removeItem(DEMO_PROFILE_KEY),
  ]);
}

export async function saveDemoProfile(profile: DemoProfile): Promise<void> {
  await AsyncStorage.setItem(DEMO_PROFILE_KEY, profile);
  await saveTokens({ accessToken: `demo-${profile}`, refreshToken: `demo-${profile}-refresh` });
}

export async function readDemoProfile(): Promise<DemoProfile | null> {
  const value = await AsyncStorage.getItem(DEMO_PROFILE_KEY);
  if (value === 'admin' || value === 'teacher') return value;
  return null;
}

/** Haqiqiy login oldidan demo kalitini olib tashlash. */
export async function clearDemoProfile(): Promise<void> {
  await AsyncStorage.removeItem(DEMO_PROFILE_KEY);
}

/** Qurilma identifikatori — sessiyalarni ajratish va offline navbat kalitlari uchun. */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_KEY, generated);
  return generated;
}
