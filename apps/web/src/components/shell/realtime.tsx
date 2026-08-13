'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type RealtimeEventName =
  | 'attendance:updated'
  | 'dashboard:updated'
  | 'stock:updated'
  | 'expense:created'
  | 'payment:created'
  | 'nutrition:closed'
  | 'notification:created';

type Listener = (payload: unknown) => void;

interface RealtimeValue {
  connected: boolean;
  subscribe: (event: RealtimeEventName, listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeValue | null>(null);

/**
 * Bitta SSE ulanishi butun ilova uchun. Server tomonida Socket.IO'ga
 * ulanadi, shuning uchun brauzerga token uzatilmaydi (TZ §42).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const listeners = useRef(new Map<RealtimeEventName, Set<Listener>>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource('/api/realtime');

    const handlers: Array<[string, EventListener]> = [];
    const register = (event: RealtimeEventName) => {
      const handler = ((message: MessageEvent<string>) => {
        let payload: unknown = null;
        try {
          payload = JSON.parse(message.data);
        } catch {
          payload = null;
        }
        for (const listener of listeners.current.get(event) ?? []) listener(payload);
      }) as EventListener;
      source.addEventListener(event, handler);
      handlers.push([event, handler]);
    };

    const events: RealtimeEventName[] = [
      'attendance:updated',
      'dashboard:updated',
      'stock:updated',
      'expense:created',
      'payment:created',
      'nutrition:closed',
      'notification:created',
    ];
    for (const event of events) register(event);

    const onReady = (() => setConnected(true)) as EventListener;
    source.addEventListener('ready', onReady);
    source.onerror = () => setConnected(false);

    return () => {
      for (const [event, handler] of handlers) source.removeEventListener(event, handler);
      source.removeEventListener('ready', onReady);
      source.close();
    };
  }, []);

  const value = useMemo<RealtimeValue>(
    () => ({
      connected,
      subscribe: (event, listener) => {
        const set = listeners.current.get(event) ?? new Set<Listener>();
        set.add(listener);
        listeners.current.set(event, set);
        return () => set.delete(listener);
      },
    }),
    [connected],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeValue {
  return (
    useContext(RealtimeContext) ?? {
      connected: false,
      subscribe: () => () => undefined,
    }
  );
}

/** Berilgan hodisalarda server komponentlarini qayta yuklaydi (debounce). */
export function useRealtimeRefresh(events: RealtimeEventName[], delay = 2500): void {
  const router = useRouter();
  const { subscribe } = useRealtime();
  // Effekt massiv identiteti o'zgarishidan qayta ishga tushmasligi uchun.
  const key = events.join(',');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), delay);
    };
    const unsubscribes = key
      .split(',')
      .filter(Boolean)
      .map((event) => subscribe(event as RealtimeEventName, refresh));
    return () => {
      if (timer) clearTimeout(timer);
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
  }, [key, delay, router, subscribe]);
}

/** Sahifaga qo'yiladi: tanlangan hodisalarda ma'lumot avtomatik yangilanadi. */
export function LiveRefresh({ events }: { events: RealtimeEventName[] }) {
  useRealtimeRefresh(events);
  return null;
}
