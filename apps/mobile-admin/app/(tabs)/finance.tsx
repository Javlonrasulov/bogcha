import {
  AppText,
  Button,
  Card,
  Column,
  EmptyState,
  ErrorState,
  KeyValue,
  ListCard,
  ListRow,
  MiniStat,
  PlanFactBar,
  ProgressBar,
  RealtimeEvent,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  SkeletonList,
  StatCard,
  StatGrid,
  money,
  percent,
  shortDate,
  spacing,
  useI18n,
  useRealtimeRefresh,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import type {
  Expense,
  FinanceSummary,
  Income,
  Paginated,
  PaymentsSummary,
  PlanVsFact,
} from '@bogcha/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useBranch, withQuery } from '../../src/branch-context';
import { ScreenHeader } from '../../src/components/screen-header';

type Tab = 'summary' | 'expenses' | 'incomes';

export default function FinanceScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { query, activeBranch } = useBranch();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('summary');

  const summary = useResource<FinanceSummary>(
    withQuery('/finance/summary', query),
    `finance.summary.${query || 'all'}`,
  );
  const planFact = useResource<PlanVsFact>(
    withQuery('/finance/plan-vs-fact', query),
    `finance.planfact.${query || 'all'}`,
  );
  const payments = useResource<PaymentsSummary>(
    withQuery('/payments/summary', query),
    `payments.summary.${query || 'all'}`,
  );
  const expenses = useResource<Paginated<Expense>>(
    tab === 'expenses' ? withQuery('/expenses', query, 'limit=20') : null,
    `expenses.${query || 'all'}`,
  );
  const incomes = useResource<Paginated<Income>>(
    tab === 'incomes' ? withQuery('/incomes', query, 'limit=20') : null,
    `incomes.${query || 'all'}`,
  );

  const refresh = () => {
    void summary.refresh();
    void planFact.refresh();
    void payments.refresh();
    if (tab === 'expenses') void expenses.refresh();
    if (tab === 'incomes') void incomes.refresh();
  };

  useRealtimeRefresh([RealtimeEvent.PAYMENT_CREATED, RealtimeEvent.EXPENSE_CREATED], refresh);

  const tabs = [
    { value: 'summary' as Tab, label: t.finance.title },
    { value: 'expenses' as Tab, label: t.finance.expenses },
    { value: 'incomes' as Tab, label: t.finance.incomes },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScreenHeader
        title={t.finance.title}
        subtitle={activeBranch?.name ?? t.common.allBranches}
      />

      <Screen refreshing={summary.refreshing} onRefresh={refresh}>
        <Segmented options={tabs} value={tab} onChange={setTab} />

        {tab === 'summary' ? (
          summary.loading && !summary.data ? (
            <SkeletonList rows={5} />
          ) : !summary.data ? (
            <ErrorState
              message={summary.error ?? t.common.loadFailed}
              onRetry={summary.refresh}
              retryLabel={t.common.retry}
            />
          ) : (
            <>
              <StatGrid>
                <StatCard
                  label={t.finance.incomes}
                  value={money(summary.data.revenue)}
                  trend={{ value: summary.data.revenueGrowth }}
                  tone="success"
                  icon="💰"
                />
                <StatCard
                  label={t.finance.expenses}
                  value={money(summary.data.expense)}
                  trend={{ value: summary.data.expenseGrowth }}
                  tone="warning"
                  icon="💸"
                />
              </StatGrid>
              <StatCard
                label={t.dashboard.netProfit}
                value={money(summary.data.netProfit)}
                hint={`${t.dashboard.margin}: ${percent(summary.data.profitMargin)}`}
                trend={{ value: summary.data.profitGrowth }}
                tone={summary.data.netProfit >= 0 ? 'success' : 'danger'}
                icon="📈"
              />

              {payments.data ? (
                <>
                  <SectionHeader title={t.finance.payments} />
                  <Card>
                    <Column gap={spacing.md}>
                      <PlanFactBar
                        label={t.finance.collected}
                        plan={payments.data.expected}
                        fact={payments.data.collected}
                        formatValue={money}
                        invertTone
                      />
                      <ProgressBar
                        value={payments.data.collectionRate}
                        tone={payments.data.collectionRate >= 90 ? 'success' : 'warning'}
                      />
                      <Row gap={spacing.sm}>
                        <MiniStat
                          label={t.finance.outstanding}
                          value={money(payments.data.outstanding)}
                          tone="danger"
                        />
                        <MiniStat
                          label={t.dashboard.debtors}
                          value={String(payments.data.debtorCount)}
                          tone="warning"
                        />
                      </Row>
                      <Row gap={spacing.sm}>
                        <View style={{ flex: 1 }}>
                          <Button
                            label={t.finance.payments}
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onPress={() => router.push('/payments')}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label={t.finance.debts}
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onPress={() => router.push('/debts')}
                          />
                        </View>
                      </Row>
                    </Column>
                  </Card>
                </>
              ) : null}

              {planFact.data?.hasBudget ? (
                <>
                  <SectionHeader title={t.finance.expected} subtitle={planFact.data.period} />
                  <Card>
                    <Column gap={spacing.md}>
                      <PlanFactBar
                        label={planFact.data.revenue.label}
                        plan={planFact.data.revenue.plan}
                        fact={planFact.data.revenue.fact}
                        formatValue={money}
                        invertTone
                      />
                      {planFact.data.expenseLines.slice(0, 6).map((line) => (
                        <PlanFactBar
                          key={line.label}
                          label={line.label}
                          plan={line.plan}
                          fact={line.fact}
                          formatValue={money}
                        />
                      ))}
                    </Column>
                  </Card>
                </>
              ) : null}

              <SectionHeader title={t.finance.category} />
              <Card>
                <Column gap={spacing.sm}>
                  {summary.data.expenseByCategory.slice(0, 8).map((row) => (
                    <Column key={row.categoryId} gap={spacing.xs}>
                      <KeyValue label={row.categoryName} value={money(row.amount)} />
                      <ProgressBar value={row.share} tone="warning" height={6} />
                    </Column>
                  ))}
                </Column>
              </Card>
            </>
          )
        ) : null}

        {tab === 'expenses' ? (
          expenses.loading && !expenses.data ? (
            <SkeletonList rows={8} />
          ) : (expenses.data?.items.length ?? 0) === 0 ? (
            <EmptyState icon="💸" title={t.common.empty} description={t.common.emptyHint} />
          ) : (
            <ListCard>
              {(expenses.data?.items ?? []).map((item, index) => (
                <ListRow
                  key={item.id}
                  title={item.category.name}
                  subtitle={`${shortDate(item.date)} · ${item.branch.name}`}
                  meta={money(item.amount)}
                  metaTone="danger"
                  last={index === (expenses.data?.items.length ?? 0) - 1}
                />
              ))}
            </ListCard>
          )
        ) : null}

        {tab === 'incomes' ? (
          incomes.loading && !incomes.data ? (
            <SkeletonList rows={8} />
          ) : (incomes.data?.items.length ?? 0) === 0 ? (
            <EmptyState icon="💰" title={t.common.empty} description={t.common.emptyHint} />
          ) : (
            <ListCard>
              {(incomes.data?.items ?? []).map((item, index) => (
                <ListRow
                  key={item.id}
                  title={item.category.name}
                  subtitle={`${shortDate(item.date)} · ${item.branch.name}`}
                  meta={money(item.amount)}
                  metaTone="success"
                  last={index === (incomes.data?.items.length ?? 0) - 1}
                />
              ))}
            </ListCard>
          )
        ) : null}

        {summary.stale ? (
          <AppText variant="caption" tone="muted" align="center">
            {t.sync.staleData}
          </AppText>
        ) : null}
      </Screen>
    </View>
  );
}
