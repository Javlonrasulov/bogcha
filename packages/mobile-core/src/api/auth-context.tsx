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
import { createDemoUser } from './demo-data';
import {
  clearDemoProfile,
  clearTokens,
  getDeviceId,
  readDemoProfile,
  readTokens,
  saveDemoProfile,
  saveTokens,
  type DemoProfile,
} from './session';

interface AuthContextValue {
  api: ApiClient;
  user: AuthenticatedUser | null;
  /** Demo rejim — backend ulanishi shart emas. */
  isDemo: boolean;
  /** Boshlang'ich sessiya tekshiruvi tugamaguncha `true`. */
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signInDemo: () => Promise<{ ok: true }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (...permissions: Permission[]) => boolean;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  baseUrl,
  demoProfile = 'admin',
  children,
}: {
  baseUrl: string;
  /** Ilova turi: admin yoki tarbiyachi demo foydalanuvchisi. */
  demoProfile?: DemoProfile;
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const expiredRef = useRef<() => void>(() => undefined);

  const api = useMemo(
    () => new ApiClient({ baseUrl, onSessionExpired: () => expiredRef.current() }),
    [baseUrl],
  );

  useEffect(() => {
    expiredRef.current = () => {
      setUser(null);
      setIsDemo(false);
    };
  }, []);

  const loadUser = useCallback(async () => {
    const activeDemo = await readDemoProfile();
    if (activeDemo) {
      setUser(createDemoUser(activeDemo));
      setIsDemo(true);
      return;
    }

    setIsDemo(false);
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
        // Eski demo sessiya real API ni yopib qo'ymasligi uchun avval tozalanadi.
        await clearDemoProfile();
        setIsDemo(false);

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

  const signInDemo = useCallback(async (): Promise<{ ok: true }> => {
    await saveDemoProfile(demoProfile);
    setUser(createDemoUser(demoProfile));
    setIsDemo(true);
    return { ok: true };
  }, [demoProfile]);

  const signOut = useCallback(async () => {
    if (!isDemo) {
      const tokens = await readTokens();
      try {
        if (tokens) await api.post('/auth/logout', { refreshToken: tokens.refreshToken });
      } catch {
        // Chiqish serverga yetmasa ham lokal sessiya tozalanadi.
      }
    }
    await clearTokens();
    setUser(null);
    setIsDemo(false);
  }, [api, isDemo]);

  const value = useMemo<AuthContextValue>(
    () => ({
      api,
      user,
      isDemo,
      loading,
      signIn,
      signInDemo,
      signOut,
      refreshUser: loadUser,
      can: (...permissions) => hasAnyPermission(user?.permissions ?? [], permissions),
      hasRole: (...roles) => roles.some((role) => user?.roles.includes(role)),
    }),
    [api, user, isDemo, loading, signIn, signInDemo, signOut, loadUser],
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
