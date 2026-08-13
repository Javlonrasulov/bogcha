import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function Card({
  className,
  children,
  as: Tag = 'section',
}: {
  className?: string;
  children: ReactNode;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag
      className={cn(
        'surface-card relative overflow-hidden transition-shadow duration-300 hover:shadow-lifted',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-line px-3.5 py-3.5 sm:px-5 sm:py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-[0.95rem] font-semibold text-content">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-content-muted sm:text-xs">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('p-3.5 sm:p-5', className)}>{children}</div>;
}
