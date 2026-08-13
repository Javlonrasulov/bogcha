import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../api/auth-context';
import { readTokens } from '../api/session';

export const RealtimeEvent = {
  ATTENDANCE_UPDATED: 'attendance:updated',
  DASHBOARD_UPDATED: 'dashboard:updated',
  STOCK_UPDATED: 'stock:updated',
  EXPENSE_CREATED: 'expense:created',
  PAYMENT_CREATED: 'payment:created',
  NUTRITION_CLOSED: 'nutrition:closed',
  NOTIFICATION_CREATED: 'notification:created',
} as const;

export type RealtimeEvent = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

const ALL_EVENTS = Object.values(RealtimeEvent);

type Listener = (payload: unknown) => void;

interface RealtimeContextValue {
  connected: boolean;
  /** Hodisaga obuna bo'ladi va tozalash funksiyasini qaytaradi. */
  subscribe: (events: readonly RealtimeEvent[], listener: Listener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/**
 * Socket.IO manzili API manzilidan olinadi: `/realtime` namespace HTTP
 * serverning ildizida turadi, `/api/v1` prefiksi unga tegishli emas.
 */
function resolveSocketUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    return `${url.protocol}//${url.host}/realtime`;
  } catch {
    return `${apiBaseUrl.replace(/\/api\/v\d+\/?$/, '')}/realtime`;
  }
}

/**
 * Jonli yangilanishlar (TZ §42). Ulanish faqat foydalanuvchi kirgan va ilova
 * ekranda turgan paytda ochiq bo'ladi — fonda soket uziladi, aks holda
 * qurilma batareyasi va mobil trafik behuda sarflanadi.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { api, user, isDemo } = useAuth();
  const [connected, setConnected] = useState(false);
  const [active, setActive] = useState(() => AppState.currentState !== 'background');

  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef(new Map<RealtimeEvent, Set<Listener>>());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!user || !active || isDemo) return;

    let socket: Socket | null = null;
    let cancelled = false;

    void (async () => {
      const tokens = await readTokens();
      if (!tokens || cancelled) return;

      socket = io(resolveSocketUrl(api.baseUrl), {
        auth: { token: tokens.accessToken },
        transports: ['websocket'],
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 10_000,
      });

      socketRef.current = socket;
      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      for (const event of ALL_EVENTS) {
        socket.on(event, (payload: unknown) => {
          for (const listener of listenersRef.current.get(event) ?? []) listener(payload);
        });
      }
    })();

    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [api, user, active, isDemo]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connected,
      subscribe: (events, listener) => {
        for (const event of events) {
          const set = listenersRef.current.get(event) ?? new Set<Listener>();
          set.add(listener);
          listenersRef.current.set(event, set);
        }

        return () => {
          for (const event of events) listenersRef.current.get(event)?.delete(listener);
        };
      },
    }),
    [connected],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime faqat RealtimeProvider ichida ishlaydi');
  return context;
}

/**
 * Berilgan hodisalar kelganda `handler` chaqiriladi. Odatda bu `resource.refresh`
 * bo'ladi — server hodisasi ekranni qayta yuklaydi.
 */
export function useRealtimeRefresh(
  events: readonly RealtimeEvent[],
  handler: () => void | Promise<void>,
): void {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Hodisalar ro'yxati har renderda yangi massiv bo'lishi mumkin, shuning uchun
  // obuna faqat tarkib o'zgarganda qayta o'rnatiladi.
  const key = events.join('|');

  useEffect(() => {
    if (!key) return;
    return subscribe(key.split('|') as RealtimeEvent[], () => void handlerRef.current());
  }, [subscribe, key]);
}
