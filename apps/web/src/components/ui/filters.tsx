'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

/** Filtrlar URL'da saqlanadi — sahifa ulashish va orqaga qaytish ishlaydi. */
function useParamUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    // Filtr o'zgarsa sahifalash boshidan boshlanadi.
    if (!('page' in changes)) params.delete('page');
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  return { update, pending, searchParams };
}

export const inputClass =
  'h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-content shadow-xs outline-none transition-colors placeholder:text-content-muted focus:border-brand/60 focus:ring-2 focus:ring-brand/15';

export function SearchField({
  placeholder,
  paramName = 'search',
  className,
}: {
  placeholder: string;
  paramName?: string;
  className?: string;
}) {
  const { update, pending, searchParams } = useParamUpdater();
  const initial = searchParams.get(paramName) ?? '';
  const [value, setValue] = useState(initial);

  useEffect(() => setValue(initial), [initial]);

  useEffect(() => {
    if (value === initial) return;
    const timer = setTimeout(() => update({ [paramName]: value || null }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('relative min-w-0 flex-1 sm:max-w-xs', className)}>
      <Search
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted',
          pending && 'animate-pulse text-brand',
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className={cn(inputClass, 'pl-9 pr-9')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
          aria-label="Tozalash"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function FilterSelect({
  paramName,
  options,
  placeholder,
  className,
  value: controlled,
}: {
  paramName: string;
  options: SelectOption[];
  placeholder: string;
  className?: string;
  value?: string;
}) {
  const { update, searchParams } = useParamUpdater();
  const value = controlled ?? searchParams.get(paramName) ?? '';

  return (
    <select
      value={value}
      onChange={(event) => update({ [paramName]: event.target.value || null })}
      className={cn(inputClass, 'w-full min-w-0 cursor-pointer pr-8 sm:w-auto sm:min-w-[9rem]', className)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function DateField({
  paramName = 'date',
  className,
  defaultValue,
  max,
}: {
  paramName?: string;
  className?: string;
  defaultValue?: string;
  max?: string;
}) {
  const { update, searchParams } = useParamUpdater();
  const value = searchParams.get(paramName) ?? defaultValue ?? '';

  return (
    <input
      type="date"
      value={value}
      max={max}
      onChange={(event) => update({ [paramName]: event.target.value || null })}
      className={cn(inputClass, 'w-full cursor-pointer sm:w-auto', className)}
    />
  );
}

export function MonthField({
  paramName = 'period',
  className,
  defaultValue,
}: {
  paramName?: string;
  className?: string;
  defaultValue?: string;
}) {
  const { update, searchParams } = useParamUpdater();
  const value = searchParams.get(paramName) ?? defaultValue ?? '';

  return (
    <input
      type="month"
      value={value}
      onChange={(event) => update({ [paramName]: event.target.value || null })}
      className={cn(inputClass, 'w-full cursor-pointer sm:w-auto', className)}
    />
  );
}

export function ToggleFilter({
  paramName,
  label,
  className,
}: {
  paramName: string;
  label: string;
  className?: string;
}) {
  const { update, searchParams } = useParamUpdater();
  const active = searchParams.get(paramName) === 'true';

  return (
    <button
      type="button"
      onClick={() => update({ [paramName]: active ? null : 'true' })}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-all',
        active
          ? 'bg-warning-soft text-warning ring-1 ring-inset ring-warning/30'
          : 'bg-surface text-content-secondary ring-1 ring-inset ring-line hover:bg-surface-muted',
        className,
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full transition-colors',
          active ? 'bg-warning' : 'bg-content-muted/40',
        )}
      />
      {label}
    </button>
  );
}