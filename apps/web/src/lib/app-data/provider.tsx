'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { currentPeriod } from '../utils';
import { emptyBootstrap, type BootstrapPayload, type BootstrapStatus } from './types';
import { Skeleton } from '../../components/ui/skeleton';
import { useT } from '../../i18n/client';

interface AppDataValue {
  status: BootstrapStatus;
  data: BootstrapPayload;
  error: string | null;
  refreshing: boolean;
  refresh: (opts?: { period?: string }) => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

async function loadBootstrap(period: string): Promise<BootstrapPayload> {
  const response = await fetch(`/api/bootstrap?period=${encodeURIComponent(period)}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Bootstrap ${response.status}`);
  }
  return (await response.json()) as BootstrapPayload;
}

export function AppDataProvider({
  children,
  initialBranchId = null,
}: {
  children: ReactNode;
  initialBranchId?: string | null;
}) {
  const t = useT();
  const [status, setStatus] = useState<BootstrapStatus>('loading');
  const [data, setData] = useState<BootstrapPayload>(() =>
    emptyBootstrap(currentPeriod(), initialBranchId),
  );
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const periodRef = useRef(currentPeriod());
  const loadedOnce = useRef(false);

  const refresh = useCallback(async (opts?: { period?: string }) => {
    const period = opts?.period ?? periodRef.current;
    periodRef.current = period;
    setRefreshing(true);
    setError(null);
    try {
      const payload = await loadBootstrap(period);
      setData(payload);
      setStatus('ready');
      loadedOnce.current = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : t.common.error;
      setError(message);
      if (!loadedOnce.current) setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, [t.common.error]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      try {
        const payload = await loadBootstrap(periodRef.current);
        if (cancelled) return;
        setData(payload);
        setStatus('ready');
        loadedOnce.current = true;
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t.common.error);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t.common.error]);

  const value = useMemo<AppDataValue>(
    () => ({ status, data, error, refreshing, refresh }),
    [status, data, error, refreshing, refresh],
  );

  // Provider har doim mount bo'ladi — loading/error da children o'chirilsa
  // shell hooklari qayta hisoblanib "Rendered more hooks..." xatosi chiqishi mumkin.
  let body: ReactNode = children;
  if (status === 'loading' && !loadedOnce.current) {
    body = <BootstrapSplash />;
  } else if (status === 'error' && !loadedOnce.current) {
    body = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-content-secondary">{error ?? t.common.error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-medium text-brand-contrast"
        >
          {t.common.retry}
        </button>
      </div>
    );
  }

  return <AppDataContext.Provider value={value}>{body}</AppDataContext.Provider>;
}

function BootstrapSplash() {
  const t = useT();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
      <p className="text-sm text-content-muted">{t.common.loading}</p>
    </div>
  );
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error('useAppData AppDataProvider ichida ishlatilishi kerak');
  }
  return ctx;
}

/** Forma/sahifalar provider tashqarisida bo'lsa ham ishlashi uchun. */
export function useAppDataOptional(): AppDataValue | null {
  return useContext(AppDataContext);
}
