import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('animate-[rise_0.45s_both]', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">{title}</h1>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-xs text-content-secondary sm:text-sm">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="print-hidden flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {actions}
          </div>
        ) : null}
      </div>
      {children ? <div className="print-hidden mt-4">{children}</div> : null}
    </header>
  );
}
