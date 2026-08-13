'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { NavSection } from '../../lib/nav';
import { cn } from '../../lib/utils';
import { useT } from '../../i18n/client';
import { RealtimeProvider, useRealtime } from './realtime';
import { Sidebar } from './sidebar';

const COLLAPSED_KEY = 'bogcha:sidebar-collapsed';

export function AppShell({
  sections,
  tenantName,
  topbar,
  children,
}: {
  sections: NavSection[];
  tenantName: string;
  topbar: ReactNode;
  children: ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === '1');
  }, []);

  // Sahifa o'zgarganda mobil menyu yopiladi.
  useEffect(() => setMobileOpen(false), [pathname]);

  const toggleCollapse = () =>
    setCollapsed((previous) => {
      const next = !previous;
      window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      return next;
    });

  return (
    <RealtimeProvider>
      <div className="min-h-dvh">
        <Sidebar
          sections={sections}
          tenantName={tenantName}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            'flex min-h-dvh flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
            collapsed ? 'lg:pl-[var(--sidebar-width-collapsed)]' : 'lg:pl-[var(--sidebar-width)]',
          )}
        >
          <header className="print-hidden sticky top-0 z-30 flex min-h-[var(--topbar-height)] items-center gap-1.5 border-b border-line bg-canvas/80 px-2.5 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:gap-3 sm:px-5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-content-secondary ring-1 ring-inset ring-line transition-colors hover:bg-surface-muted hover:text-content lg:hidden"
              aria-label={t.common.open}
              aria-expanded={mobileOpen}
            >
              <Menu className="size-4" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">{topbar}</div>
          </header>

          <main className="flex-1 px-3 pb-[max(4rem,env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pb-10 sm:pt-5 lg:px-7">
            <div className="mx-auto w-full max-w-[112rem] space-y-4 sm:space-y-5">{children}</div>
          </main>

          <ConnectionHint />
        </div>
      </div>
    </RealtimeProvider>
  );
}

/** Real-time ulanish uzilganda ko'rinadigan nozik indikator. */
function ConnectionHint() {
  const t = useT();
  const { connected } = useRealtime();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (connected) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 6000);
    return () => clearTimeout(timer);
  }, [connected]);

  if (!visible) return null;

  return (
    <div className="print-hidden pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 -translate-x-1/2 px-3">
      <span className="glass tabular flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-content-secondary shadow-lifted">
        <span className="size-1.5 rounded-full bg-warning" />
        {t.common.loading}
      </span>
    </div>
  );
}
