'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Phone } from 'lucide-react';
import { useAppData } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import {
  currentPeriod,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
} from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Card, CardHeader } from '../../../components/ui/card';
import { EmptyState, FilterBar, Pagination } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { StatCard } from '../../../components/ui/stat-card';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { FilterSelect } from '../../../components/ui/filters';
import { ExportButton } from '../../../components/ui/export-button';

const PAGE_SIZE = 25;
const OVERDUE_OPTIONS = [7, 15, 30, 60];

export function DebtsView() {
  const t = useT();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const groupId = searchParams.get('groupId') ?? '';
  const minDaysOverdue = searchParams.get('minDaysOverdue') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const childGroupById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const child of data.children) map.set(child.id, child.groupId);
    return map;
  }, [data.children]);

  const filtered = useMemo(() => {
    const minDays = minDaysOverdue ? Number(minDaysOverdue) : 0;
    return data.debts.filter((row) => {
      if (groupId && childGroupById.get(row.childId) !== groupId) return false;
      if (minDays > 0 && row.daysOverdue < minDays) return false;
      return true;
    });
  }, [data.debts, groupId, minDaysOverdue, childGroupById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pageTotal = items.reduce((sum, row) => sum + row.outstanding, 0);
  const oldest = items.reduce((max, row) => Math.max(max, row.daysOverdue), 0);
  const critical = items.filter((row) => row.daysOverdue >= 30).length;
  const summary = data.paymentsSummary;

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [searchParams]);

  return (
    <>
      <PageHeader title={t.debts.title} subtitle={t.debts.subtitle}>
        <FilterBar>
          <FilterSelect
            paramName="groupId"
            placeholder={t.common.allGroups}
            options={data.groups.map((group) => ({ value: group.id, label: group.name }))}
          />
          <FilterSelect
            paramName="minDaysOverdue"
            placeholder={t.payments.overdueCount}
            options={OVERDUE_OPTIONS.map((days) => ({
              value: String(days),
              label: `${days}+ ${t.inventory.days}`,
            }))}
          />
        </FilterBar>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.debts.totalDebt}
          value={formatMoney(summary?.totalDebt ?? pageTotal)}
          hint={t.common.thisMonth}
          icon="debts"
          tone={(summary?.totalDebt ?? pageTotal) > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label={t.debts.debtorCount}
          value={formatNumber(summary?.debtorCount ?? filtered.length)}
          hint={`${formatNumber(critical)} · 30+ ${t.inventory.days}`}
          icon="children"
          tone={critical > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label={t.payments.collectionRate}
          value={formatPercent(summary?.collectionRate ?? 0)}
          hint={formatMoney(summary?.collected ?? 0)}
          icon="payments"
          tone={(summary?.collectionRate ?? 0) >= 85 ? 'success' : 'warning'}
          href="/payments"
        />
        <StatCard
          label={t.debts.oldestDebt}
          value={`${formatNumber(oldest)} ${t.inventory.days}`}
          hint={t.debts.monthsUnpaid}
          icon="alert"
          tone={oldest >= 30 ? 'danger' : oldest > 0 ? 'warning' : 'success'}
        />
      </div>

      <Card>
        <CardHeader
          title={t.debts.debtorList}
          subtitle={`${formatNumber(filtered.length)} ${t.common.rows} · ${formatMoney(pageTotal)}`}
          action={
            <ExportButton
              label={t.common.exportExcel}
              table={{
                filename: `qarzdorlik-${data.period || currentPeriod()}`,
                columns: [
                  t.common.fullName,
                  t.common.group,
                  t.common.branch,
                  t.children.guardian,
                  t.payments.baseAmount,
                  t.payments.paidAmount,
                  t.debts.totalDebt,
                  t.payments.overdueCount,
                ],
                rows: filtered.map((row) => [
                  row.childFullName,
                  row.groupName ?? '',
                  row.branchName,
                  row.guardianPhone ?? '',
                  row.totalDue,
                  row.totalPaid,
                  row.outstanding,
                  row.daysOverdue,
                ]),
              }}
            />
          }
        />
        {items.length === 0 ? (
          <EmptyState
            title={t.debts.noDebts}
            hint={t.dashboard.noAlerts}
            icon={<CheckCircle2 className="size-5" />}
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t.children.title}</Th>
                  <Th>{t.common.group}</Th>
                  <Th>{t.children.guardian}</Th>
                  <Th align="right">{t.payments.baseAmount}</Th>
                  <Th align="right">{t.payments.paidAmount}</Th>
                  <Th align="right">{t.debts.totalDebt}</Th>
                  <Th align="right">{t.payments.overdueCount}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <Tr key={row.childId}>
                    <Td>
                      <Link
                        href={`/children/${row.childId}`}
                        className="font-medium text-content transition-colors hover:text-brand-strong"
                      >
                        {row.childFullName}
                      </Link>
                      <span className="block text-xs text-content-muted">{row.branchName}</span>
                    </Td>
                    <Td className="text-content-secondary">
                      {row.groupName ?? t.children.noGroup}
                    </Td>
                    <Td>
                      {row.guardianPhone ? (
                        <a
                          href={`tel:${row.guardianPhone}`}
                          className="tabular inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2 py-1 text-xs text-content-secondary transition-colors hover:bg-brand-soft hover:text-brand-strong"
                        >
                          <Phone className="size-3" />
                          {row.guardianPhone}
                        </a>
                      ) : (
                        <span className="text-content-muted">—</span>
                      )}
                    </Td>
                    <Td align="right" className="tabular text-content-secondary">
                      {formatMoney(row.totalDue)}
                    </Td>
                    <Td align="right" className="tabular text-content-secondary">
                      {formatMoney(row.totalPaid)}
                    </Td>
                    <Td align="right" className="tabular font-semibold text-danger">
                      {formatMoney(row.outstanding)}
                    </Td>
                    <Td align="right">
                      <Badge
                        tone={
                          row.daysOverdue >= 30
                            ? 'danger'
                            : row.daysOverdue >= 7
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {formatNumber(row.daysOverdue)} {t.inventory.days}
                      </Badge>
                      {row.oldestDueDate ? (
                        <span className="tabular mt-0.5 block text-xs text-content-muted">
                          {formatDate(row.oldestDueDate)}
                        </span>
                      ) : null}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination
              page={safePage}
              totalPages={totalPages}
              total={filtered.length}
              baseQuery={baseQuery}
              labels={t.common}
            />
          </>
        )}
      </Card>
    </>
  );
}
