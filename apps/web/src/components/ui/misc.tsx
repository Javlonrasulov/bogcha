import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, formatNumber, initials, colorIndex } from '../../lib/utils';

/** Bandlik/bajarilish darajasi uchun chiziq. */
export function Progress({
  value,
  tone = 'brand',
  className,
  size = 'md',
}: {
  value: number;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
  size?: 'sm' | 'md';
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const bar =
    tone === 'success'
      ? 'bg-success'
      : tone === 'warning'
        ? 'bg-warning'
        : tone === 'danger'
          ? 'bg-danger'
          : tone === 'info'
            ? 'bg-info'
            : 'bg-gradient-brand';
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-content-muted/15',
        size === 'sm' ? 'h-1.5' : 'h-2',
        className,
      )}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-700 ease-out', bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function MiniStat({
  label,
  value,
  hint,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'brand' | 'info';
  className?: string;
}) {
  const color =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : tone === 'danger'
          ? 'text-danger'
          : tone === 'brand'
            ? 'text-brand-strong'
            : tone === 'info'
              ? 'text-info'
              : 'text-content';
  return (
    <div className={cn('surface-card px-4 py-3', className)}>
      <p className="truncate text-[0.7rem] uppercase tracking-wide text-content-muted">{label}</p>
      <p className={cn('tabular mt-1 text-lg font-semibold', color)}>{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs text-content-muted">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
  className,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex items-baseline gap-2">
        <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.1em] text-content-muted">
          {title}
        </h2>
        {hint ? <span className="text-xs text-content-muted/80">{hint}</span> : null}
      </div>
      {action}
    </div>
  );
}

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('flex w-full flex-wrap items-center gap-2 [&>*]:max-w-full', className)}>{children}</div>;
}

/** Ko'rinishlar orasida almashish (URL orqali, JS'siz ishlaydi). */
export function Segmented({
  items,
  className,
}: {
  items: Array<{ href: string; label: string; active: boolean; count?: number }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center gap-1 rounded-xl bg-surface-muted p-1 ring-1 ring-inset ring-line sm:inline-flex sm:w-auto sm:flex-nowrap',
        className,
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          scroll={false}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            item.active
              ? 'bg-surface text-content shadow-xs'
              : 'text-content-muted hover:text-content',
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className="tabular text-[0.65rem] text-content-muted">{item.count}</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
  action,
  className,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="grid size-12 place-items-center rounded-2xl bg-surface-muted text-content-muted ring-1 ring-inset ring-line">
          {icon}
        </span>
      ) : null}
      <div>
        <p className="text-sm font-medium text-content">{title}</p>
        {hint ? <p className="mt-1 text-xs text-content-muted">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

const AVATAR_TONES = [
  'bg-brand-soft text-brand-strong',
  'bg-info-soft text-info',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning',
  'bg-danger-soft text-danger',
  'bg-brand-soft text-accent',
];

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dimension =
    size === 'xs'
      ? 'size-7 text-[0.65rem]'
      : size === 'sm'
        ? 'size-8 text-xs'
        : size === 'lg'
          ? 'size-14 text-lg'
          : 'size-10 text-sm';
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold ring-1 ring-inset ring-line/60',
        AVATAR_TONES[colorIndex(name, AVATAR_TONES.length)],
        dimension,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />;
}

/** Jadval ostidagi sahifalash — URL orqali, JS talab qilmaydi. */
export function Pagination({
  page,
  totalPages,
  total,
  baseQuery,
  labels,
}: {
  page: number;
  totalPages: number;
  total: number;
  /** Sahifadan boshqa filtrlar (page'siz), masalan `?search=ali&`. */
  baseQuery: string;
  labels: { showing: string; rows: string; page: string; of: string };
}) {
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between px-3 py-3 text-xs text-content-muted sm:px-5">
        <span className="tabular">
          {labels.showing}: {formatNumber(total)} {labels.rows}
        </span>
      </div>
    );
  }

  const href = (target: number) =>
    `${baseQuery}${baseQuery.includes('?') ? '&' : '?'}page=${target}`;
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => windowStart + index);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-5">
      <span className="tabular text-xs text-content-muted">
        {labels.showing}: {formatNumber(total)} {labels.rows}
      </span>
      <nav className="flex items-center gap-1">
        <PageLink href={href(Math.max(1, page - 1))} disabled={page <= 1}>
          ←
        </PageLink>
        {pages.map((item) => (
          <PageLink key={item} href={href(item)} active={item === page}>
            {item}
          </PageLink>
        ))}
        <PageLink href={href(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
          →
        </PageLink>
      </nav>
    </div>
  );
}

function PageLink({
  href,
  children,
  active = false,
  disabled = false,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    'tabular grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-medium transition-colors',
    active
      ? 'bg-gradient-brand text-white'
      : 'text-content-secondary hover:bg-surface-muted hover:text-content',
    disabled && 'pointer-events-none opacity-40',
  );
  if (disabled) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={className} scroll={false}>
      {children}
    </Link>
  );
}
