import {
  Card,
  Column,
  EmptyState,
  ErrorState,
  ListCard,
  ListRow,
  MiniStat,
  ProgressBar,
  RealtimeEvent,
  Row,
  Screen,
  SectionHeader,
  SkeletonList,
  StatGrid,
  StatCard,
  fullMoney,
  money,
  monthIso,
  percent,
  shortDate,
  spacing,
  useI18n,
  useRealtimeRefresh,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import type { Paginated, Payment, PaymentsSummary } from '@bogcha/shared';
import { View } from 'react-native';
import { useBranch, withQuery } from '../src/branch-context';

/** To'lovlar (TZ §18): oylik yig'ilish holati va oxirgi tushumlar. */
export default function PaymentsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { query } = useBranch();
  const period = monthIso();

  const summary = useResource<PaymentsSummary>(
    withQuery('/payments/summary', query, `period=${period}`),
    `payments.summary.${period}.${query || 'all'}`,
  );
  const list = useResource<Paginated<Payment>>(
    withQuery('/payments', query, 'limit=30'),
    `payments.list.${query || 'all'}`,
  );

  const rows = list.data?.items ?? [];
  const refreshing = summary.refreshing || list.refreshing;
  const refresh = () => {
    void summary.refresh();
    void list.refresh();
  };

  useRealtimeRefresh([RealtimeEvent.PAYMENT_CREATED], refresh);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Screen refreshing={refreshing} onRefresh={refresh}>
        {summary.loading && !summary.data ? (
          <SkeletonList rows={4} />
        ) : summary.data ? (
          <>
            <StatGrid>
              <StatCard
                label={t.finance.expected}
                value={money(summary.data.expected)}
                tone="brand"
                icon="🧾"
              />
              <StatCard
                label={t.finance.collected}
                value={money(summary.data.collected)}
                tone="success"
                icon="✅"
              />
              <StatCard
                label={t.finance.outstanding}
                value={money(summary.data.outstanding)}
                tone={summary.data.outstanding > 0 ? 'warning' : 'success'}
                icon="⏳"
              />
              <StatCard
                label={t.finance.collectionRate}
                value={percent(summary.data.collectionRate)}
                tone={summary.data.collectionRate >= 90 ? 'success' : 'warning'}
                icon="📈"
              />
            </StatGrid>

            <Card>
              <Column gap={spacing.md}>
                <ProgressBar
                  value={summary.data.collectionRate}
                  tone={summary.data.collectionRate >= 90 ? 'success' : 'warning'}
                  label={`${t.finance.collectionRate} · ${period}`}
                />
                <Row gap={spacing.sm}>
                  <MiniStat
                    label={t.dashboard.debtors}
                    value={String(summary.data.debtorCount)}
                    tone={summary.data.debtorCount > 0 ? 'warning' : 'success'}
                  />
                  <MiniStat
                    label={t.finance.overdue}
                    value={String(summary.data.overdueInvoiceCount)}
                    tone={summary.data.overdueInvoiceCount > 0 ? 'danger' : 'success'}
                  />
                  <MiniStat
                    label={t.finance.totalDebt}
                    value={money(summary.data.totalDebt)}
                    tone={summary.data.totalDebt > 0 ? 'danger' : 'success'}
                  />
                </Row>
              </Column>
            </Card>
          </>
        ) : null}

        <SectionHeader title={t.finance.payments} />
        {list.loading && !list.data ? (
          <SkeletonList rows={8} />
        ) : !list.data ? (
          <ErrorState
            message={list.error ?? t.common.loadFailed}
            onRetry={list.refresh}
            retryLabel={t.common.retry}
          />
        ) : rows.length === 0 ? (
          <EmptyState icon="💳" title={t.common.empty} description={t.common.emptyHint} />
        ) : (
          <ListCard>
            {rows.map((payment, index) => (
              <ListRow
                key={payment.id}
                title={payment.childFullName}
                subtitle={`${shortDate(payment.date)} · ${payment.child.group?.name ?? '—'}`}
                meta={fullMoney(payment.amount)}
                metaTone="success"
                last={index === rows.length - 1}
              />
            ))}
          </ListCard>
        )}
      </Screen>
    </View>
  );
}
