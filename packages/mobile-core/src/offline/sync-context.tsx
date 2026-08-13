import * as Network from 'expo-network';
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
import { AppState } from 'react-native';
import { useApi } from '../api/auth-context';
import { getDeviceId } from '../api/session';
import {
  buildIdempotencyKey,
  enqueue,
  flushQueue,
  queueSize,
  type QueuedRequest,
} from './queue';

type SyncState = 'idle' | 'syncing' | 'error';

interface SyncContextValue {
  online: boolean;
  pending: number;
  state: SyncState;
  lastSyncedAt: Date | null;
  lastError: string | null;
  /** Offline bo'lsa navbatga qo'yadi, online bo'lsa darhol yuboradi. */
  submit: (params: {
    key: string;
    path: string;
    body: unknown;
    method?: 'POST' | 'PATCH';
  }) => Promise<{ queued: boolean; error?: string }>;
  sync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

/** Tarmoq holatini kuzatadi va ulanish qaytganda navbatni yuboradi (TZ §41). */
export function SyncProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [state, setState] = useState<SyncState>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncing = useRef(false);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    setState('syncing');

    try {
      const result = await flushQueue(api);
      setPending(result.pending);
      if (result.sent > 0) setLastSyncedAt(new Date());
      if (result.failed > 0) {
        setState('error');
        setLastError(`${result.failed} ta yozuv yuborilmadi`);
      } else {
        setState('idle');
        setLastError(null);
      }
    } catch (error) {
      setState('error');
      setLastError(error instanceof Error ? error.message : 'Sinxronizatsiya xatosi');
    } finally {
      syncing.current = false;
    }
  }, [api]);

  useEffect(() => {
    void queueSize().then(setPending);

    const subscription = Network.addNetworkStateListener((status) => {
      const reachable = Boolean(status.isInternetReachable ?? status.isConnected);
      setOnline(reachable);
      if (reachable) void sync();
    });

    // Ilova fonga chiqib qaytganda ham urinamiz — listener o'tkazib yuborishi mumkin.
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void sync();
    });

    void Network.getNetworkStateAsync().then((status) => {
      setOnline(Boolean(status.isInternetReachable ?? status.isConnected));
    });

    return () => {
      subscription.remove();
      appState.remove();
    };
  }, [sync]);

  const submit = useCallback<SyncContextValue['submit']>(
    async ({ key, path, body, method = 'POST' }) => {
      const deviceId = await getDeviceId();
      const item: Omit<QueuedRequest, 'attempts' | 'lastError'> = {
        key,
        path,
        method,
        body,
        idempotencyKey: buildIdempotencyKey(deviceId, key),
        clientRecordedAt: new Date().toISOString(),
      };

      if (!online) {
        const queue = await enqueue(item);
        setPending(queue.length);
        return { queued: true };
      }

      try {
        await api.request(path, {
          method,
          body: {
            ...(body as Record<string, unknown>),
            idempotencyKey: item.idempotencyKey,
            clientRecordedAt: item.clientRecordedAt,
          },
        });
        setLastSyncedAt(new Date());
        return { queued: false };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Saqlanmadi';
        const offlineError =
          typeof error === 'object' && error !== null && 'isOffline' in error
            ? Boolean((error as { isOffline: boolean }).isOffline)
            : false;

        // Faqat tarmoq xatosi navbatga tushadi; validatsiya xatosi darhol ko'rsatiladi.
        if (!offlineError) return { queued: false, error: message };

        const queue = await enqueue(item);
        setPending(queue.length);
        setOnline(false);
        return { queued: true };
      }
    },
    [api, online],
  );

  const value = useMemo<SyncContextValue>(
    () => ({ online, pending, state, lastSyncedAt, lastError, submit, sync }),
    [online, pending, state, lastSyncedAt, lastError, submit, sync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync faqat SyncProvider ichida ishlaydi');
  return context;
}
