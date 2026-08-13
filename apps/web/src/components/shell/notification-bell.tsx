'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useT } from '../../i18n/client';
import { cn, formatTime } from '../../lib/utils';
import { Dropdown, DropdownLabel } from '../ui/dropdown';
import { useRealtime } from './realtime';
import type { AppNotification } from '../../lib/types';

const SEVERITY_TONE = {
  INFO: 'bg-info',
  WARNING: 'bg-warning',
  CRITICAL: 'bg-danger',
} as const;

export function NotificationBell({
  initialUnread,
  initialItems,
}: {
  initialUnread: number;
  initialItems: AppNotification[];
}) {
  const t = useT();
  const { subscribe } = useRealtime();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setUnread(initialUnread);
    setItems(initialItems);
  }, [initialUnread, initialItems]);

  // Real-time bildirishnoma — sahifani yangilamasdan hisoblagich o'sadi.
  useEffect(
    () =>
      subscribe('notification:created', (payload) => {
        setUnread((value) => value + 1);
        const notification = payload as AppNotification | null;
        if (notification?.id) {
          setItems((current) => [notification, ...current].slice(0, 8));
        }
      }),
    [subscribe],
  );

  return (
    <Dropdown
      panelClassName="w-[min(20rem,calc(100vw-1.5rem))]"
      trigger={({ open }) => (
        <span
          className={cn(
            'relative grid size-9 place-items-center rounded-xl bg-surface text-content-secondary ring-1 ring-inset ring-line transition-colors hover:bg-surface-muted hover:text-content',
            open && 'bg-surface-muted text-content',
          )}
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span className="tabular absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[0.6rem] font-semibold text-white ring-2 ring-surface">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </span>
      )}
    >
      {({ close }) => (
        <>
          <DropdownLabel>
            {t.notifications.title}
            {unread > 0 ? ` · ${unread} ${t.notifications.unread.toLowerCase()}` : ''}
          </DropdownLabel>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-sm text-content-muted">
                {t.notifications.empty}
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex gap-2.5 border-b border-line/60 px-3.5 py-2.5 last:border-0',
                    !item.readAt && 'bg-brand-soft/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-1.5 shrink-0 rounded-full',
                      SEVERITY_TONE[item.severity],
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">{item.title}</p>
                    <p className="line-clamp-2 text-xs text-content-secondary">{item.message}</p>
                    <p className="tabular mt-0.5 text-[0.65rem] text-content-muted">
                      {formatTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={close}
            className="block border-t border-line/70 px-3.5 py-2.5 text-center text-xs font-medium text-brand-strong transition-colors hover:bg-brand-soft/50"
          >
            {t.common.seeAll}
          </Link>
        </>
      )}
    </Dropdown>
  );
}
