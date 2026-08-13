import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Oxirgi muvaffaqiyatli javoblarni qurilmada saqlaydi. Internet yo'q bo'lganda
 * ekranlar bo'sh qolmasligi uchun ishlatiladi (TZ §41).
 */

const PREFIX = 'bogcha.cache:';

interface CacheEntry<T> {
  data: T;
  savedAt: string;
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, savedAt: new Date().toISOString() };
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
}

export async function readCache<T>(key: string): Promise<{ data: T; savedAt: Date } | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    return { data: entry.data, savedAt: new Date(entry.savedAt) };
  } catch {
    await AsyncStorage.removeItem(PREFIX + key);
    return null;
  }
}

export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((key) => key.startsWith(PREFIX));
  if (ours.length > 0) await AsyncStorage.multiRemove(ours);
}
