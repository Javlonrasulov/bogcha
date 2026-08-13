'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Baby,
  Banknote,
  Boxes,
  CalendarCheck,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { HealthLevel, Permission } from '@bogcha/shared';
import { useAppData, useViewer } from '../../lib/app-data';
import { useT } from '../../i18n/client';
import {
  currentPeriod,
  formatCompactMoney,
  formatDate,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatPeriod,
} from '../../lib/utils';
import { Card, CardBody, CardHeader } from '../../components/ui/card';
import { Badge, HealthDot } from '../../components/ui/badge';
import { ButtonLink } from '../../components/ui/button';
import { EmptyState, Progress, SectionTitle } from '../../components/ui/misc';
import { StatCard } from '../../components/ui/stat-card';
import { AttendanceTrendChart, CashflowChart, CategoryDonut } from '../../components/charts/charts';

export function DashboardView() {
  const t = useT();
  const viewer = useViewer();
  const { data, refresh } = useAppData();
  const searchParams = useSearchParams();
  const period = searchParams.get('period') ?? currentPeriod();

  useEffect(() => {
    if (period === data.period) return;
    void refresh({ period });
  }, [period, data.period, refresh]);

  const overview = data.dashboard.overview;
  const charts = data.dashboard.charts;
  const finance = viewer.can(Permission.EXPENSE_VIEW) ? data.financeSummary : null;
  const missing = viewer.can(Permission.ATTENDANCE_MANAGE)
    ? data.attendanceMissing
    : { date: '', groups: [] as typeof data.attendanceMissing.groups };
  const notifications = data.notifications;

  if (!overview) {
    return (
      <Card>
        <EmptyState
          title={t.common.error}
          hint={t.common.retry}
          icon={<AlertTriangle className="size-5" />}
        />
      </Card>
    );
  }

  const { today, finance: money, inventory, health } = overview;
  const alerts = notifications.items.filter(
    (item) => item.severity !== 'INFO' && !item.readAt,
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-content sm:text-2xl">
            {t.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-content-secondary">
            {formatDate(overview.date)} · {formatPeriod(overview.period)}
          </p>
        </div>
        <div className="print-hidden flex flex-wrap items-center gap-2">
          {viewer.can(Permission.ATTENDANCE_MARK) ? (
            <ButtonLink href="/attendance" variant="secondary" size="sm">
              <CalendarCheck className="size-4" />
              {t.dashboard.markAttendance}
            </ButtonLink>
          ) : null}
          {viewer.can(Permission.PAYMENT_MANAGE) ? (
            <ButtonLink href="/payments" variant="primary" size="sm">
              <Wallet className="size-4" />
              {t.dashboard.addPayment}
            </ButtonLink>
          ) : null}
        </div>
      </header>

      {/* ── BUGUN: eng muhim ko'rsatkichlar birinchi ekranda (TZ §46) ── */}
      <section className="space-y-3">
        <SectionTitle title={t.dashboard.todayStatus} hint={formatDate(overview.date)} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label={t.dashboard.present}
            value={
              <>
                {formatNumber(today.present)}
                <span className="text-base font-normal text-content-muted">
                  {' / '}
                  {formatNumber(today.expected)}
                </span>
              </>
            }
            hint={`${t.dashboard.attendanceRate}: ${formatPercent(today.attendanceRate)}`}
            icon={<Baby className="size-4.5" />}
            tone="brand"
            health={health.attendance}
            href="/attendance"
            footer={<Progress value={today.attendanceRate} tone="brand" size="sm" />}
          />
          <StatCard
            label={t.dashboard.todayIncome}
            value={formatCompactMoney(today.income)}
            hint={`${t.dashboard.collected}: ${formatPercent(money.collectionRate)}`}
            icon={<Banknote className="size-4.5" />}
            tone="success"
            href="/payments"
          />
          <StatCard
            label={t.dashboard.todayExpense}
            value={formatCompactMoney(today.expense)}
            icon={<Receipt className="size-4.5" />}
            tone="danger"
            href="/expenses"
          />
          <StatCard
            label={t.dashboard.todayProfit}
            value={formatCompactMoney(today.profit)}
            icon={<TrendingUp className="size-4.5" />}
            tone={today.profit >= 0 ? 'success' : 'danger'}
            health={today.profit >= 0 ? HealthLevel.GOOD : HealthLevel.BAD}
          />
          <StatCard
            label={t.dashboard.stockValue}
            value={formatCompactMoney(inventory.totalValue)}
            hint={`${t.dashboard.lowStock}: ${formatNumber(inventory.lowStockCount)}`}
            icon={<Boxes className="size-4.5" />}
            tone={inventory.lowStockCount > 0 ? 'warning' : 'info'}
            href="/inventory"
          />
          <StatCard
            label={t.dashboard.debt}
            value={formatCompactMoney(money.outstandingDebt)}
            hint={`${formatNumber(money.debtorCount)} ${t.debts.debtorCount.toLowerCase()}`}
            icon={<Wallet className="size-4.5" />}
            tone="warning"
            health={health.debt}
            href="/debts"
          />
        </div>
      </section>

      {/* ── Ogohlantirishlar va davomat kiritilmagan guruhlar ── */}
      {alerts.length > 0 || missing.groups.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {alerts.length > 0 ? (
            <Card>
              <CardHeader
                title={t.dashboard.alerts}
                subtitle={`${alerts.length} ${t.notifications.unread.toLowerCase()}`}
                action={
                  <Link
                    href="/notifications"
                    className="text-xs font-medium text-brand-strong hover:underline"
                  >
                    {t.common.seeAll}
                  </Link>
                }
              />
              <ul className="divide-y divide-line/60">
                {alerts.slice(0, 4).map((alert) => (
                  <li key={alert.id} className="flex items-start gap-3 px-5 py-3">
                    <HealthDot
                      level={alert.severity === 'CRITICAL' ? 'BAD' : 'WARNING'}
                      className="mt-1.5"
                      pulse={alert.severity === 'CRITICAL'}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{alert.title}</p>
                      <p className="line-clamp-2 text-xs text-content-secondary">{alert.message}</p>
                    </div>
                    <Badge
                      tone={alert.severity === 'CRITICAL' ? 'danger' : 'warning'}
                      className="ml-auto shrink-0"
                    >
                      {t.notifications.kinds[alert.kind]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {missing.groups.length > 0 ? (
            <Card>
              <CardHeader
                title={t.attendance.missingGroups}
                subtitle={formatDate(missing.date)}
                action={
                  <Link
                    href="/attendance"
                    className="text-xs font-medium text-brand-strong hover:underline"
                  >
                    {t.dashboard.markAttendance}
                  </Link>
                }
              />
              <ul className="divide-y divide-line/60">
                {missing.groups.slice(0, 5).map((group) => (
                  <li
                    key={group.id}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-content">{group.name}</span>
                      <span className="block truncate text-xs text-content-muted">
                        {group.teachers.length > 0
                          ? group.teachers.join(', ')
                          : t.groups.noTeacher}
                      </span>
                    </span>
                    <Badge tone="warning">
                      {formatNumber(group.childrenCount)} {t.groups.childrenCount.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* ── Moliya ── */}
      {viewer.can(Permission.EXPENSE_VIEW, Permission.INCOME_VIEW) ? (
        <section className="space-y-3">
          <SectionTitle title={t.dashboard.finance} hint={formatPeriod(overview.period)} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label={t.dashboard.monthRevenue}
              value={formatCompactMoney(money.revenue)}
              delta={money.revenueGrowth}
              icon={<Banknote className="size-4.5" />}
              tone="success"
            />
            <StatCard
              label={t.dashboard.monthExpense}
              value={formatCompactMoney(money.expense)}
              delta={money.expenseGrowth}
              invertDelta
              icon={<Receipt className="size-4.5" />}
              tone="danger"
            />
            <StatCard
              label={t.dashboard.netProfit}
              value={formatCompactMoney(money.netProfit)}
              hint={`${t.dashboard.profitMargin}: ${formatPercent(money.profitMargin)}`}
              icon={<TrendingUp className="size-4.5" />}
              tone={money.netProfit >= 0 ? 'success' : 'danger'}
              health={health.profitMargin}
            />
            <StatCard
              label={t.dashboard.expectedPayments}
              value={formatCompactMoney(money.expectedPayments)}
              hint={`${t.dashboard.collected}: ${formatCompactMoney(money.collectedPayments)}`}
              icon={<Wallet className="size-4.5" />}
              tone="info"
              health={health.collection}
              href="/payments"
              footer={<Progress value={money.collectionRate} tone="info" size="sm" />}
            />
          </div>
        </section>
      ) : null}

      {/* ── Grafiklar ── */}
      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={t.dashboard.attendanceChart}
            subtitle={`30 ${t.inventory.days} · ${t.dashboard.attendanceRate}`}
          />
          <CardBody className="pb-3 pl-1 pr-3">
            {charts.attendance.length > 0 ? (
              <AttendanceTrendChart
                data={charts.attendance}
                labels={{ present: t.dashboard.present, rate: t.dashboard.attendanceRate }}
              />
            ) : (
              <EmptyState title={t.common.empty} />
            )}
          </CardBody>
        </Card>

        {viewer.can(Permission.EXPENSE_VIEW) ? (
          <Card>
            <CardHeader title={t.dashboard.cashflowChart} subtitle={`30 ${t.inventory.days}`} />
            <CardBody className="pb-3 pl-1 pr-3">
              {charts.cashflow.length > 0 ? (
                <CashflowChart
                  data={charts.cashflow}
                  labels={{
                    income: t.dashboard.revenue,
                    expense: t.dashboard.expense,
                    profit: t.dashboard.profit,
                  }}
                />
              ) : (
                <EmptyState title={t.common.empty} />
              )}
            </CardBody>
          </Card>
        ) : null}

        {finance && finance.expenseByCategory.length > 0 ? (
          <Card>
            <CardHeader
              title={t.dashboard.expenseStructure}
              subtitle={formatPeriod(finance.period)}
            />
            <CardBody className="grid gap-4 sm:grid-cols-[1fr_1.1fr] sm:items-center">
              <CategoryDonut
                data={finance.expenseByCategory.slice(0, 6).map((row) => ({
                  name: row.categoryName,
                  value: row.amount,
                }))}
                centerLabel={t.dashboard.monthExpense}
                centerValue={formatCompactMoney(finance.expense)}
              />
              <ul className="space-y-2">
                {finance.expenseByCategory.slice(0, 6).map((row, index) => (
                  <li key={row.categoryId} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: `hsl(var(--chart-${(index % 6) + 1}))` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-content-secondary">
                      {row.categoryName}
                    </span>
                    <span className="tabular shrink-0 font-medium text-content">
                      {formatCompactMoney(row.amount)}
                    </span>
                    <span className="tabular w-11 shrink-0 text-right text-xs text-content-muted">
                      {formatPercent(row.share, 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>

      {/* ── Ombor ── */}
      <Card>
        <CardHeader
          title={t.dashboard.lowStock}
          subtitle={`${t.dashboard.todayConsumption}: ${formatCompactMoney(inventory.todayConsumption)}`}
          action={
            <Link
              href="/inventory?lowOnly=true"
              className="text-xs font-medium text-brand-strong hover:underline"
            >
              {t.common.seeAll}
            </Link>
          }
        />
        {inventory.lowStockItems.length === 0 ? (
          <EmptyState
            title={t.dashboard.noAlerts}
            icon={<Boxes className="size-5" />}
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-line/60">
            {inventory.lowStockItems.map((item) => (
              <li
                key={item.productName}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <HealthDot level={item.quantity <= 0 ? 'BAD' : 'WARNING'} />
                  <span className="truncate text-sm text-content">{item.productName}</span>
                </span>
                <span className="tabular shrink-0 text-sm">
                  <span className="font-medium text-warning">
                    {formatQuantity(item.quantity)}
                  </span>
                  <span className="text-content-muted">
                    {' / '}
                    {formatQuantity(item.minQuantity)} {t.products.units[item.unit]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
