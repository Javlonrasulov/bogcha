import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-content-secondary ring-line',
  brand: 'bg-brand-soft text-brand-strong ring-brand/20',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/25',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  info: 'bg-info-soft text-info ring-info/20',
  accent: 'bg-brand-soft text-accent ring-accent/20',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/** Vizual status indikatori: 🟢 normal, 🟡 diqqat, 🔴 muammo (TZ §34). */
export function HealthDot({
  level,
  className,
  pulse = false,
}: {
  level: 'GOOD' | 'WARNING' | 'BAD';
  className?: string;
  pulse?: boolean;
}) {
  const color =
    level === 'GOOD' ? 'bg-success' : level === 'WARNING' ? 'bg-warning' : 'bg-danger';
  return (
    <span className={cn('relative inline-flex size-2.5 shrink-0', className)}>
      <span className={cn('size-2.5 rounded-full', color)} />
      {pulse ? (
        <span
          className={cn('absolute inset-0 rounded-full animate-[pulse-ring_2.4s_infinite]', color)}
        />
      ) : null}
    </span>
  );
}
