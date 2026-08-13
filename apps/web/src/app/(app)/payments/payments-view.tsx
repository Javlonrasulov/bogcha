'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Wallet } from 'lucide-react';
import { ChildStatus, Permission } from '@bogcha/shared';
import { useAppData, useViewer } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import {
  currentPeriod,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPeriod,
} from '../../../lib/utils';
import { Card, CardHeader } from '../../../components/ui/card';
import { EmptyState, FilterBar, Pagination, Progress } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { StatCard } from '../../../components/ui/stat-card';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { FilterSelect, MonthField, SearchField } from '../../../components/ui/filters';
import { ExportButton } from '../../../components/ui/export-button';
import { PaymentForm } from './payment-form';

const PAGE_SIZE = 25;

export function PaymentsView() {
  const t = useT();
  const viewer = useViewer();
  const { data, refresh } = useAppData();
  const searchParams = useSearchParams();

  const period = searchParams.get('period') ?? currentPeriod();
  const groupId = searchParams.get('groupId') ?? '';
  const method = searchParams.get('method') ?? '';
  const search = (searchParams.get('search') ?? '').trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const canManage = viewer.can(Permission.PAYMENT_MANAGE);

  useEffect(() => {
    if (period === data.period) return;
    void refresh({ period });
  }, [period, data.period, refresh]);

  const filtered = useMemo(() => {
    if (period !== data.period) return [];
    return data.payments.filter((payment) => {
      if (groupId && payment.child.group?.id !== groupId) return false;
      if (method && payment.method !== method) return false;
      if (search && !payment.childFullName.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [data.payments, data.period, period, groupId, method, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const summary = period === data.period ? data.paymentsSummary : null;

  const paymentOptions = useMemo(
    () =>
      data.children
        .filter((child) => child.status === ChildStatus.ACTIVE)
        .map((child) => ({
          id: child.id,
          fullName: child.fullName,
          groupName: child.group?.name ?? null,
          debt: child.outstandingDebt,
          monthlyFee: child.netMonthlyFee,
        })),
    [data.children],
  );

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [searchParams]);

  return (
    <>
      <PageHeader
        title={t.payments.title}
        subtitle={t.payments.subtitle}
        actions={
          canManage ? (
            <PaymentForm label={t.payments.addPayment} options={paymentOptions} />
          ) : null
        }
      >
        <FilterBar>
          <MonthField defaultValue={period} />
          <SearchField placeholder={t.children.searchPlaceholder} />
          <FilterSelect
            paramName="groupId"
            placeholder={t.common.allGroups}
            options={data.groups.map((group) => ({ value: group.id, label: group.name }))}
          />
          <FilterSelect
            paramName="method"
            placeholder={t.finance.paymentMethod}
            options={Object.entries(t.finance.methods).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </FilterBar>
      </PageHeader>

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t.payments.expected}
              value={formatMoney(summary.expected)}
              hint={`${formatNumber(summary.invoiceCount)} ${t.payments.invoices.toLowerCase()}`}
              icon="payments"
            />
            <StatCard
              label={t.payments.collected}
              value={formatMoney(summary.collected)}
              hint={`${t.payments.collectionRate}: ${formatPercent(summary.collectionRate)}`}
              icon="wallet"
              tone="success"
            />
            <StatCard
              label={t.payments.outstanding}
              value={formatMoney(summary.outstanding)}
              hint={`${formatNumber(summary.debtorCount)} ${t.debts.debtorCount.toLowerCase()}`}
              icon="debts"
              tone={summary.outstanding > 0 ? 'danger' : 'success'}
              href="/debts"
            />
            <StatCard
              label={t.payments.overdueCount}
              value={formatNumber(summary.overdueInvoiceCount)}
              hint={formatMoney(summary.totalDebt)}
              icon="alert"
              tone={summary.overdueInvoiceCount > 0 ? 'warning' : 'success'}
              href="/debts"
            />
          </div>

          <Card>
            <CardHeader
              title={t.payments.collectionRate}
              subtitle={`${formatPeriod(summary.period)} · ${formatMoney(
                summary.collected,
              )} / ${formatMoney(summary.expected)}`}
              action={
                <span className="tabular text-lg font-semibold text-brand-strong">
                  {formatPercent(summary.collectionRate)}
                </span>
              }
            />
            <div className="px-5 pb-5">
              <Progress
                value={summary.collectionRate}
                tone={summary.collectionRate >= 85 ? 'success' : 'warning'}
              />
            </div>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader
          title={t.payments.title}
          subtitle={`${formatNumber(filtered.length)} ${t.common.rows} · ${formatPeriod(period)}`}
          action={
            <ExportButton
              label={t.common.exportExcel}
              table={{
                filename: `tolovlar-${period}`,
                columns: [
                  t.common.date,
                  t.children.title,
                  t.common.group,
                  t.common.amount,
                  t.finance.paymentMethod,
                  t.payments.receiptNumber,
                ],
                rows: filtered.map((payment) => [
                  payment.date,
                  payment.childFullName,
                  payment.child.group?.name ?? '',
                  payment.amount,
                  t.finance.methods[payment.method],
                  payment.receiptNumber,
                ]),
              }}
            />
          }
        />
        {items.length === 0 ? (
          <EmptyState
            title={t.common.empty}
            hint={t.common.emptyHint}
            icon={<Wallet className="size-5" />}
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t.common.date}</Th>
                  <Th>{t.children.title}</Th>
                  <Th>{t.common.group}</Th>
                  <Th>{t.payments.receiptNumber}</Th>
                  <Th>{t.finance.paymentMethod}</Th>
                  <Th align="right">{t.common.amount}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((payment) => (
                  <Tr key={payment.id}>
                    <Td className="tabular whitespace-nowrap text-content-secondary">
                      {formatDate(payment.date)}
                    </Td>
                    <Td>
                      <Link
                        href={`/children/${payment.childId}`}
                        className="font-medium text-content transition-colors hover:text-brand-strong"
                      >
                        {payment.childFullName}
                      </Link>
                      <span className="block text-xs text-content-muted">
                        {payment.branch.name}
                      </span>
                    </Td>
                    <Td className="text-content-secondary">
                      {payment.child.group?.name ?? t.children.noGroup}
                    </Td>
                    <Td className="tabular text-xs text-content-muted">
                      {payment.receiptNumber}
                    </Td>
                    <Td className="text-xs text-content-muted">
                      {t.finance.methods[payment.method]}
                    </Td>
                    <Td align="right" className="tabular font-medium text-success">
                      {formatMoney(payment.amount)}
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
