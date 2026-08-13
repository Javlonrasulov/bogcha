'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Package, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function ProductPicker({
  products,
  value,
  onChange,
  placeholder,
  units,
  label,
}: {
  products: Array<{ id: string; name: string; unit: string }>;
  value: string;
  onChange: (productId: string) => void;
  placeholder: string;
  units: Record<string, string>;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = products.find((product) => product.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => {
      const unit = units[product.unit] ?? product.unit;
      return `${product.name} ${unit}`.toLowerCase().includes(q);
    });
  }, [products, query, units]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 40);
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm shadow-xs transition-colors',
          'hover:bg-surface-muted',
          open && 'border-brand/60 ring-2 ring-brand/15',
          selected ? 'text-content' : 'text-content-muted',
        )}
      >
        <Package className="size-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate text-left">
          {selected
            ? `${selected.name} (${units[selected.unit] ?? selected.unit})`
            : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-content-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-lifted">
          <div className="border-b border-line/70 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-content-muted" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-xl border border-line bg-canvas pl-8 pr-3 text-sm text-content outline-none placeholder:text-content-muted focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
              />
            </div>
          </div>
          <div className="max-h-[min(50vh,18rem)] overflow-y-auto overscroll-contain py-1">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-sm text-content-muted">{placeholder}</p>
            ) : (
              filtered.map((product) => {
                const active = product.id === value;
                const unitLabel = units[product.unit] ?? product.unit;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onChange(product.id);
                      setQuery('');
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors',
                      active
                        ? 'bg-brand-soft font-medium text-brand-strong'
                        : 'text-content-secondary hover:bg-surface-muted hover:text-content',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-content">
                      {product.name}
                    </span>
                    <span className="tabular text-xs text-content-muted">{unitLabel}</span>
                    {active ? <Check className="size-4 shrink-0 text-brand" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
