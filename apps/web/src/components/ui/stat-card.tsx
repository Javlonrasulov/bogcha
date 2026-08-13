import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn, formatPercent } from '../../lib/utils';
import { HealthDot, type Tone } from './badge';
import { StatIcon, type StatIconName } from './stat-icon';

const ACCENT: Record<Tone, string> = {
  neutral: 'from-content-muted/25 to-transparent text-content-secondary',
  brand: 'from-brand/25 to-transparent text-brand',
  success: 'from-success/25 to-transparent text-success',
  warning: 'from-warning/30 to-transparent text-warning',
  danger: 'from-danger/25 to-transparent text-danger',
  info: 'from-info/25 to-transparent text-info',
  accent: 'from-accent/25 to-transparent text-accent',
};

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Ikona nomi (`"children"`) yoki tayyor element. */
  icon?: StatIconName | ReactNode;
  tone?: Tone;
  /** Foizli o'sish; ijobiy — yashil, salbiy — qizil. */
  delta?: number | null;
  /** Salbiy o'sish yaxshi bo'lgan ko'rsatkichlar uchun (xarajat kabi). */
  invertDelta?: boolean;
  health?: 'GOOD' | 'WARNING' | 'BAD';
  href?: string;
  className?: string;
  footer?: ReactNode;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  delta,
  invertDelta = false,
  health,
  href,
  className,
  footer,
}: StatCardProps) {
  const body = (
    <>
      {/* Nozik gradient nur — kartani "tirik" ko'rsatadi. */}
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-gradient-to-br opacity-70 blur-2xl',
          ACCENT[tone],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {health ? <HealthDot level={health} /> : null}
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-content-muted sm:text-xs">
              {label}
            </p>
          </div>
          <p className="tabular mt-1.5 text-xl font-semibold leading-tight text-content sm:mt-2 sm:text-[1.7rem]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 line-clamp-2 text-[11px] text-content-muted sm:text-xs">{hint}</p>
          ) : null}
        </div>
        {icon ? (
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted ring-1 ring-inset ring-line',
              ACCENT[tone].split(' ').at(-1),
            )}
          >
            {typeof icon === 'string' ? (
              <StatIcon name={icon as StatIconName} className="size-4.5" />
            ) : (
              icon
            )}
          </span>
        ) : null}
      </div>
      {delta !== undefined && delta !== null ? (
        <Delta value={delta} invert={invertDelta} />
      ) : null}
      {footer ? <div className="relative mt-3">{footer}</div> : null}
    </>
  );

  const shell = cn(
    'surface-card relative block overflow-hidden p-3.5 transition-all duration-300 sm:p-5',
    href ? 'hover:-translate-y-0.5 hover:shadow-lifted' : 'hover:shadow-lifted',
    className,
  );

  return href ? (
    <Link href={href} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}

function Delta({ value, invert }: { value: number; invert: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  return (
    <p
      className={cn(
        'tabular relative mt-3 inline-flex items-center gap-1 text-xs font-medium',
        neutral ? 'text-content-muted' : positive ? 'text-success' : 'text-danger',
      )}
    >
      <span aria-hidden>{neutral ? '→' : value > 0 ? '↑' : '↓'}</span>
      {formatPercent(Math.abs(value))}
    </p>
  );
}
