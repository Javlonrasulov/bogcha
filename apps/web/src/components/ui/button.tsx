import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-[var(--shadow-glow)] hover:brightness-[1.06] active:brightness-95',
  secondary:
    'bg-surface text-content ring-1 ring-inset ring-line-strong/70 hover:bg-surface-muted hover:ring-line-strong',
  soft: 'bg-brand-soft text-brand-strong hover:bg-brand-soft/70',
  ghost: 'text-content-secondary hover:bg-surface-muted hover:text-content',
  danger: 'bg-danger text-white hover:brightness-110',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-xs',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-5 text-[0.95rem]',
  icon: 'size-10 justify-center',
};

export function buttonClass(
  variant: ButtonVariant = 'secondary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex select-none items-center justify-center rounded-xl font-medium transition-all duration-200',
    'disabled:pointer-events-none disabled:opacity-55',
    VARIANT[variant],
    SIZE[size],
    className,
  );
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  className,
  children,
  prefetch,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
