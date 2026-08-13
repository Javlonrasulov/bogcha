'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { Permission } from '@bogcha/shared';
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
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { EmptyState, FilterBar, Pagination, Progress } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { StatCard } from '../../../components/ui/stat-card';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { FilterSelect, MonthField } from '../../../components/ui/filters';
import { CategoryDonut } from '../../../components/charts/charts';
import { TransactionForm } from '../../../components/forms/transaction-form';

const PAGE_SIZE = 25;

export function ExpensesView() {
  const t = useT();
  const viewer = useViewer();
  const { data, refresh } = useAppData();
  const searchParams = useSearchParams();

  const period = searchParams.get('period') ?? currentPeriod();
  const categoryId = searchParams.get('categoryId') ?? '';
  const branchId = searchParams.get('branchId') ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  useEffect(() => {
    if (period === data.period) return;
    void refresh({ period });
  }, [period, data.period, refresh]);

  const branches = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of data.groups) map.set(group.branchId, group.branchName);
    for (const child of data.children) map.set(child.branch.id, child.branch.name);
    for (const expense of data.expenses) map.set(expense.branch.id, expense.branch.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [data.groups, data.children, data.expenses]);

  const filtered = useMemo(() => {
    if (period !== data.period) return [];
    return data.expenses.filter((expense) => {
      if (categoryId && expense.categoryId !== categoryId) return false;
      if (branchId && expense.branchId !== branchId) return false;
      return true;
    });
  }, [data.expenses, data.period, period, categoryId, branchId]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const summary = period === data.period ? data.financeSummary : null;

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [searchParams]);

  return (
    <>
      <PageHeader
        title={t.finance.expenses}
        subtitle={t.finance.expensesSubtitle}
        actions={
          viewer.can(Permission.EXPENSE_MANAGE) ? (
            <TransactionForm
              kind="EXPENSE"
              branches={branches}
              categories={data.expenseCategories.map((category) => ({
                id: category.id,
                name: category.name,
              }))}
              defaultBranchId={viewer.branchId}
              label={t.finance.addExpense}
            />
          ) : null
        }
      >
        <FilterBar>
          <MonthField defaultValue={period} />
          <FilterSelect
            paramName="categoryId"
            placeholder={t.common.category}
            options={data.expenseCategories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />
          {branches.length > 1 ? (
            <FilterSelect
              paramName="branchId"
              placeholder={t.common.allBranches}
              options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
            />
          ) : null}
        </FilterBar>
      </PageHeader>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t.finance.expense}
            value={formatMoney(summary.expense)}
            hint={formatPeriod(summary.period)}
            icon="expenses"
            tone="danger"
            delta={summary.expenseGrowth}
            invertDelta
          />
          <StatCard
            label={t.finance.revenue}
            value={formatMoney(summary.revenue)}
            hint={formatPeriod(summary.period)}
            icon="incomes"
            tone="success"
            delta={summary.revenueGrowth}
          />
          <StatCard
            label={t.finance.netProfit}
            value={formatMoney(summary.netProfit)}
            hint={`${t.finance.margin}: ${formatPercent(summary.profitMargin)}`}
            icon="trendingUp"
            tone={summary.netProfit >= 0 ? 'brand' : 'danger'}
            delta={summary.profitGrowth}
          />
          <StatCard
            label={t.finance.overBudget}
            value={formatNumber(0)}
            hint={t.common.none}
            icon="alert"
            tone="success"
          />
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader title={t.finance.byCategory} subtitle={formatPeriod(period)} />
          <CardBody className="pb-3">
            {summary && summary.expenseByCategory.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_1.1fr] sm:items-center">
                <CategoryDonut
                  data={summary.expenseByCategory.map((row) => ({
                    name: row.categoryName,
                    value: row.amount,
                  }))}
                  height={200}
                />
                <ul className="space-y-1.5">
                  {summary.expenseByCategory.slice(0, 7).map((row) => (
                    <li key={row.categoryId} className="text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-content-secondary">
                          {row.categoryName}
                        </span>
                        <span className="tabular shrink-0 font-medium text-content">
                          {formatMoney(row.amount)}
                        </span>
                      </div>
                      <Progress value={row.share} size="sm" className="mt-1" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState title={t.common.empty} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t.dashboard.planVsFact} subtitle={t.finance.budget} />
          <EmptyState title={t.common.empty} hint={t.finance.budget} />
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t.finance.expenses}
          subtitle={`${formatNumber(filtered.length)} ${t.common.rows} · ${formatPeriod(period)}`}
        />
        {items.length === 0 ? (
          <EmptyState
            title={t.common.empty}
            hint={t.common.emptyHint}
            icon={<Receipt className="size-5" />}
          />
        ) : (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t.common.date}</Th>
                  <Th>{t.common.category}</Th>
                  <Th>{t.common.description}</Th>
                  <Th>{t.finance.paymentMethod}</Th>
                  <Th>{t.common.branch}</Th>
                  <Th align="right">{t.common.amount}</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((expense) => (
                  <Tr key={expense.id}>
                    <Td className="tabular whitespace-nowrap text-content-secondary">
                      {formatDate(expense.date)}
                    </Td>
                    <Td>
                      <span className="font-medium text-content">{expense.category.name}</span>
                      <span className="block text-xs text-content-muted">
                        {t.finance.expenseKinds[expense.category.kind]}
                      </span>
                    </Td>
                    <Td className="max-w-[18rem]">
                      <span className="block truncate">{expense.description ?? '—'}</span>
                      {expense.isAutoGenerated ? (
                        <Badge tone="info">{t.finance.autoGenerated}</Badge>
                      ) : null}
                    </Td>
                    <Td className="text-xs text-content-muted">
                      {t.finance.methods[expense.paymentMethod]}
                    </Td>
                    <Td className="text-xs text-content-muted">{expense.branch.name}</Td>
                    <Td align="right" className="tabular font-medium text-content">
                      {formatMoney(expense.amount)}
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
