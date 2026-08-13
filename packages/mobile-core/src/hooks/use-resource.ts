import { useCallback, useEffect, useState } from 'react';
import { useApi } from '../api/auth-context';
import { ApiError } from '../api/client';
import { readCache, writeCache } from '../offline/cache';

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  /** Pull-to-refresh indikatori uchun (birinchi yuklashdan farqli). */
  refreshing: boolean;
  error: string | null;
  /** Ma'lumot keshdan olingan — internet yo'q. */
  stale: boolean;
  staleAt: Date | null;
  refresh: () => Promise<void>;
}

/**
 * API'dan ma'lumot oladi va keshlaydi. Internet yo'q bo'lsa keshdagi
 * oxirgi holatni ko'rsatadi va `stale` bayrog'ini yoqadi (TZ §41).
 *
 * @param path so'rov yo'li; `null` bo'lsa so'rov yuborilmaydi
 * @param cacheKey kesh kaliti; berilmasa `path` ishlatiladi
 */
export function useResource<T>(path: string | null, cacheKey?: string): Resource<T> {
  const api = useApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [staleAt, setStaleAt] = useState<Date | null>(null);

  const key = cacheKey ?? path ?? '';

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (!path) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      try {
        const result = await api.get<T>(path);
        setData(result);
        setStale(false);
        setStaleAt(null);
        setError(null);
        await writeCache(key, result);
      } catch (caught) {
        const apiError = caught instanceof ApiError ? caught : null;
        const cached = await readCache<T>(key);

        if (cached && apiError?.isOffline) {
          setData(cached.data);
          setStale(true);
          setStaleAt(cached.savedAt);
          setError(null);
        } else {
          setError(apiError?.message ?? 'Ma\'lumotni yuklab bo\'lmadi');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [api, path, key],
  );

  useEffect(() => {
    setLoading(true);
    void load(false);
  }, [load]);

  return {
    data,
    loading,
    refreshing,
    error,
    stale,
    staleAt,
    refresh: () => load(true),
  };
}
