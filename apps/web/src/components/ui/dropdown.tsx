'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Yengil dropdown: modal ochmaydi, 1 click bilan yopiladi (TZ §34 —
 * ortiqcha modal va popup ishlatmaslik).
 */
export function Dropdown({
  trigger,
  children,
  align = 'end',
  className,
  panelClassName,
}: {
  trigger: (props: { open: boolean }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: 'start' | 'end';
  className?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={container} className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="block w-full text-left">
        {trigger({ open })}
      </button>
      {open ? (
        <div
          className={cn(
            'glass absolute top-[calc(100%+0.5rem)] z-[90] max-w-[calc(100vw-1.5rem)] min-w-56 animate-[scale-in_0.18s_both] overflow-hidden rounded-2xl shadow-lifted',
            align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            panelClassName,
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({
  onClick,
  children,
  active = false,
  tone = 'default',
}: {
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors',
        tone === 'danger'
          ? 'text-danger hover:bg-danger-soft'
          : active
            ? 'bg-brand-soft font-medium text-brand-strong'
            : 'text-content-secondary hover:bg-surface-muted hover:text-content',
      )}
    >
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="border-b border-line/70 px-3.5 py-2 text-[0.65rem] font-semibold uppercase tracking-wide text-content-muted">
      {children}
    </p>
  );
}
