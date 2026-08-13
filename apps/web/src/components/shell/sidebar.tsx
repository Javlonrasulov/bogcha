'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { NavSection } from '../../lib/nav';
import { useT } from '../../i18n/client';
import { NavIcon } from './icons';

export function Sidebar({
  sections,
  tenantName,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  sections: NavSection[];
  tenantName: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const t = useT();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  // Mobil drawer ochiq bo'lganda fon scrollni bloklash + Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <div
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-40 bg-canvas/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal={mobileOpen || undefined}
        aria-label={t.app.name}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(var(--sidebar-width),100vw)] flex-col border-r border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'lg:translate-x-0 lg:bg-surface/85',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Collapse faqat desktopda — mobilda har doim to'liq menyu.
          collapsed && 'lg:w-[var(--sidebar-width-collapsed)]',
        )}
      >
        <div className="flex h-[var(--topbar-height)] items-center gap-2.5 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" onClick={onCloseMobile}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white shadow-[var(--shadow-glow)]">
              <Sparkles className="size-4" strokeWidth={2.2} />
            </span>
            <span className={cn('min-w-0', collapsed && 'lg:hidden')}>
              <span className="block truncate text-sm font-semibold leading-tight text-content">
                {t.app.name}
              </span>
              <span className="block truncate text-[0.7rem] leading-tight text-content-muted">
                {tenantName}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto grid size-9 place-items-center rounded-lg text-content-muted transition-colors hover:bg-surface-muted hover:text-content lg:hidden"
            aria-label={t.common.close}
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 space-y-5 overflow-y-auto overscroll-contain px-2.5 pb-4">
          {sections.map((section) => (
            <div key={section.key}>
              <div
                className={cn('mx-2 mb-2 h-px bg-line', collapsed ? 'hidden lg:block' : 'hidden')}
              />
              <p
                className={cn(
                  'px-2.5 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-content-muted/80',
                  collapsed && 'lg:hidden',
                )}
              >
                {t.navSections[section.key]}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        title={collapsed ? t.nav[item.key] : undefined}
                        className={cn(
                          'group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm transition-all duration-200 sm:py-2',
                          collapsed && 'lg:justify-center lg:px-0',
                          active
                            ? 'bg-brand-soft font-medium text-brand-strong'
                            : 'text-content-secondary hover:bg-surface-muted hover:text-content',
                        )}
                      >
                        {active ? (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand" />
                        ) : null}
                        <NavIcon
                          name={item.icon}
                          className={cn(
                            'size-[1.15rem] shrink-0 transition-transform duration-200',
                            !active && 'group-hover:scale-110',
                          )}
                        />
                        <span className={cn('truncate', collapsed && 'lg:hidden')}>
                          {t.nav[item.key]}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'hidden w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-content-muted transition-colors hover:bg-surface-muted hover:text-content lg:flex',
              collapsed && 'justify-center px-0',
            )}
            aria-label={t.app.name}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[1.15rem]" />
            ) : (
              <PanelLeftClose className="size-[1.15rem]" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
