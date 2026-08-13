'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Baby, Boxes, Search, Truck, Users, X } from 'lucide-react';
import { useT } from '../../i18n/client';
import { cn } from '../../lib/utils';
import type { GlobalSearchResult } from '../../lib/types';

const EMPTY: GlobalSearchResult = {
  children: [],
  products: [],
  suppliers: [],
  groups: [],
};

/** Global qidiruv (TZ §44): bola, mahsulot, supplier, guruh. */
export function GlobalSearch() {
  const t = useT();
  const [term, setTerm] = useState('');
  const [result, setResult] = useState<GlobalSearchResult>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResult(EMPTY);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term.trim())}`, {
          signal: controller.signal,
        });
        setResult(response.ok ? await response.json() : EMPTY);
      } catch {
        // Bekor qilingan so'rov — e'tiborsiz qoldiriladi.
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const groups = [
    {
      icon: Baby,
      label: t.nav.children,
      items: result.children.map((child) => ({
        id: child.id,
        href: `/children/${child.id}`,
        title: `${child.lastName} ${child.firstName}`,
        hint: child.group?.name ?? t.children.noGroup,
      })),
    },
    {
      icon: Users,
      label: t.nav.groups,
      items: result.groups.map((group) => ({
        id: group.id,
        href: `/groups?search=${encodeURIComponent(group.name)}`,
        title: group.name,
        hint: group.branch.name,
      })),
    },
    {
      icon: Boxes,
      label: t.nav.inventory,
      items: result.products.map((product) => ({
        id: product.id,
        href: `/inventory?search=${encodeURIComponent(product.name)}`,
        title: product.name,
        hint: t.products.units[product.unit],
      })),
    },
    {
      icon: Truck,
      label: t.nav.suppliers,
      items: result.suppliers.map((supplier) => ({
        id: supplier.id,
        href: `/suppliers?search=${encodeURIComponent(supplier.name)}`,
        title: supplier.name,
        hint: supplier.phone ?? '',
      })),
    },
  ].filter((group) => group.items.length > 0);

  const showPanel = open && term.trim().length >= 2;

  return (
    <div ref={container} className="relative min-w-0 flex-1 lg:max-w-md">
      <Search
        className={cn(
          'pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-content-muted sm:left-3',
          loading && 'animate-pulse text-brand',
        )}
      />
      <input
        ref={input}
        type="search"
        value={term}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        placeholder={t.common.search}
        className="h-9 w-full rounded-xl border border-line bg-surface-muted/60 pl-8 pr-8 text-sm text-content outline-none transition-all placeholder:text-content-muted focus:border-brand/50 focus:bg-surface focus:ring-2 focus:ring-brand/15 sm:pl-9 sm:pr-16 sm:placeholder:content-['']"
        aria-label={t.common.searchPlaceholder}
      />
      {term ? (
        <button
          type="button"
          onClick={() => setTerm('')}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-content-muted hover:bg-surface-muted hover:text-content"
          aria-label={t.common.reset}
        >
          <X className="size-3.5" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md bg-surface px-1.5 py-0.5 text-[0.65rem] font-medium text-content-muted ring-1 ring-inset ring-line sm:block">
          Ctrl K
        </kbd>
      )}

      {showPanel ? (
        <div className="glass absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,24rem)] animate-[scale-in_0.18s_both] overflow-y-auto overscroll-contain rounded-2xl shadow-lifted max-sm:fixed max-sm:inset-x-3 max-sm:top-[calc(var(--topbar-height)+env(safe-area-inset-top)+0.35rem)]">
          {groups.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-content-muted">
              {loading ? t.common.loading : t.common.empty}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <p className="flex items-center gap-2 border-b border-line/60 bg-surface-muted/40 px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-content-muted">
                  <group.icon className="size-3.5" />
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setOpen(false);
                      setTerm('');
                    }}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-brand-soft/60"
                  >
                    <span className="truncate font-medium text-content">{item.title}</span>
                    <span className="max-w-[40%] shrink-0 truncate text-xs text-content-muted">
                      {item.hint}
                    </span>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
