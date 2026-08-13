'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { BellOff } from 'lucide-react';
import { useAppData } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { cn, formatDateTime, formatNumber } from '../../../lib/utils';
import { SEVERITY_TONE } from '../../../lib/tones';
import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { EmptyState, FilterBar, MiniStat, Pagination } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { FilterSelect, ToggleFilter } from '../../../components/ui/filters';
import { MarkAllRead, MarkOneRead } from './notification-actions';

const PAGE_SIZE = 30;

const SEVERITY_BAR = {
  INFO: 'bg-info',
  WARNING: 'bg-warning',
  CRITICAL: 'bg-danger',
} as const;

export function NotificationsView() {
  const t = useT();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const severity = searchParams.get('severity') ?? '';
  const kind = searchParams.get('kind') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const filtered = useMemo(() => {
    return data.notifications.items.filter((item) => {
      if (unreadOnly && item.readAt) return false;
      if (severity && item.severity !== severity) return false;
      if (kind && item.kind !== kind) return false;
      return true;
    });
  }, [data.notifications.items, unreadOnly, severity, kind]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const critical = data.notifications.items.filter((item) => item.severity === 'CRITICAL').length;
  const warning = data.notifications.items.filter((item) => item.severity === 'WARNING').length;

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [searchParams]);

  return (
    <>
      <PageHeader
        title={t.notifications.title}
        subtitle={t.notifications.subtitle}
        actions={<MarkAllRead disabled={data.notifications.unreadCount === 0} />}
      >
        <FilterBar>
          <FilterSelect
            paramName="severity"
            placeholder={t.common.all}
            options={Object.entries(t.notifications.severities).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <FilterSelect
            paramName="kind"
            placeholder={t.common.all}
            options={Object.entries(t.notifications.kinds).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <ToggleFilter paramName="unreadOnly" label={t.notifications.unread} />
        </FilterBar>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat
          label={t.notifications.unread}
          value={formatNumber(data.notifications.unreadCount)}
          tone={data.notifications.unreadCount > 0 ? 'brand' : 'neutral'}
        />
        <MiniStat
          label={t.notifications.severities.CRITICAL}
          value={formatNumber(critical)}
          tone={critical > 0 ? 'danger' : 'neutral'}
        />
        <MiniStat
          label={t.notifications.severities.WARNING}
          value={formatNumber(warning)}
          tone={warning > 0 ? 'warning' : 'neutral'}
        />
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState
            title={t.notifications.empty}
            hint={t.common.emptyHint}
            icon={<BellOff className="size-5" />}
          />
        ) : (
          <ul className="divide-y divide-line/70">
            {items.map((item) => {
              const target = notificationHref(item.entityType, item.entityId);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3.5 transition-colors sm:px-5',
                    item.readAt ? 'hover:bg-surface-muted/60' : 'bg-brand-soft/25',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1 h-9 w-1 shrink-0 rounded-full',
                      SEVERITY_BAR[item.severity],
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-content">{item.title}</p>
                      <Badge tone={SEVERITY_TONE[item.severity]}>
                        {t.notifications.kinds[item.kind]}
                      </Badge>
                      {!item.readAt ? (
                        <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-content-secondary">{item.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-content-muted">
                      <span className="tabular">{formatDateTime(item.createdAt)}</span>
                      {item.metric
                        ? Object.entries(item.metric).map(([key, value]) => (
                            <span key={key} className="tabular">
                              {key}: {formatNumber(value, 1)}
                            </span>
                          ))
                        : null}
                      {target ? (
                        <Link
                          href={target}
                          className="font-medium text-brand-strong hover:underline"
                        >
                          {t.common.details}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {!item.readAt ? <MarkOneRead id={item.id} /> : null}
                </li>
              );
            })}
          </ul>
        )}
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          baseQuery={baseQuery}
          labels={{
            showing: t.common.showing,
            rows: t.common.rows,
            page: t.common.page,
            of: t.common.of,
          }}
        />
      </Card>
    </>
  );
}

/** Bildirishnomadan tegishli modulga o'tish. */
function notificationHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityType) return null;
  switch (entityType) {
    case 'Product':
    case 'StockItem':
      return '/inventory?lowStockOnly=true';
    case 'PurchaseOrder':
      return '/inventory';
    case 'Invoice':
    case 'Child':
      return entityId ? `/children/${entityId}` : '/debts';
    case 'Expense':
      return '/expenses';
    case 'NutritionDay':
      return '/recipes';
    case 'Staff':
      return '/notifications';
    case 'Budget':
      return '/expenses';
    default:
      return null;
  }
}
