import type { ReactNode } from 'react';
import { AuthProvider } from './api/auth-context';
import { I18nProvider } from './i18n/provider';
import { SyncProvider } from './offline/sync-context';
import { RealtimeProvider } from './realtime/realtime-context';
import { FontGate } from './theme/font-gate';
import { ThemeProvider } from './theme/provider';
import { ToastProvider } from './ui/toast';

/**
 * Ikkala mobil ilova uchun bir xil provider ketma-ketligi.
 * `SyncProvider` va `RealtimeProvider` API mijoziga tayangani uchun
 * `AuthProvider` ichida bo'lishi shart.
 */
export function AppProviders({
  baseUrl,
  demoProfile = 'admin',
  children,
}: {
  baseUrl: string;
  demoProfile?: 'admin' | 'teacher';
  children: ReactNode;
}) {
  return (
    <FontGate>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider baseUrl={baseUrl} demoProfile={demoProfile}>
            <SyncProvider>
              <RealtimeProvider>
                <ToastProvider>{children}</ToastProvider>
              </RealtimeProvider>
            </SyncProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </FontGate>
  );
}
