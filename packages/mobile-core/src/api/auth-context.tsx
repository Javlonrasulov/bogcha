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
import {
  hasAnyPermission,
  type AuthSession,
  type AuthenticatedUser,
  type Permission,
  type Role,
} from '@bogcha/shared';
import { ApiClient, ApiError } from './client';
import { clearTokens, getDeviceId, readTokens, saveTokens } from './session';

interface AuthContextValue {
  api: ApiClient;
  user: AuthenticatedUser | null;
  /** Boshlang'ich sessiya tekshiruvi tugamaguncha `true`. */
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (...permissions: Permission[]) => boolean;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  baseUrl,
  children,
}: {
  baseUrl: string;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const expiredRef = useRef<() => void>(() => undefined);

  const api = useMemo(
    () => new ApiClient({ baseUrl, onSessionExpired: () => expiredRef.current() }),
    [baseUrl],
  );

  useEffect(() => {
    expiredRef.current = () => {
      setUser(null);
    };
  }, []);

  const loadUser = useCallback(async () => {
    const tokens = await readTokens();
    if (!tokens) {
      setUser(null);
      return;
    }
    try {
      setUser(await api.get<AuthenticatedUser>('/auth/me'));
    } catch (error) {
      if (!(error instanceof ApiError && error.isOffline)) {
        await clearTokens();
        setUser(null);
      }
    }
  }, [api]);

  useEffect(() => {
    void loadUser().finally(() => setLoading(false));
  }, [loadUser]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (identifier, password) => {
      try {
        const deviceId = await getDeviceId();
        const session = await api.post<AuthSession>(
          '/auth/login',
          { identifier: identifier.trim(), password, deviceId },
          { anonymous: true },
        );
        await saveTokens(session);
        setUser(session.user);
        return { ok: true };
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : "Kirishda kutilmagan xatolik yuz berdi";
        return { ok: false, error: message };
      }
    },
    [api],
  );

  const signOut = useCallback(async () => {
    const tokens = await readTokens();
    try {
      if (tokens) await api.post('/auth/logout', { refreshToken: tokens.refreshToken });
    } catch {
      // Chiqish serverga yetmasa ham lokal sessiya tozalanadi.
    }
    await clearTokens();
    setUser(null);
  }, [api]);

  const value = useMemo<AuthContextValue>(
    () => ({
      api,
      user,
      loading,
      signIn,
      signOut,
      refreshUser: loadUser,
      can: (...permissions) => hasAnyPermission(user?.permissions ?? [], permissions),
      hasRole: (...roles) => roles.some((role) => user?.roles.includes(role)),
    }),
    [api, user, loading, signIn, signOut, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth faqat AuthProvider ichida ishlaydi');
  return context;
}

/** Faqat API mijozi kerak bo'lganda. */
export function useApi(): ApiClient {
  return useAuth().api;
}
