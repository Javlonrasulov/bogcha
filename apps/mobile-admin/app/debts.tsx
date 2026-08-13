import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  ListCard,
  ListRow,
  MiniStat,
  Row,
  Screen,
  SkeletonList,
  fullMoney,
  money,
  spacing,
  useI18n,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import type { DebtRow, Paginated } from '@bogcha/shared';
import { Linking, Pressable } from 'react-native';
import { View } from 'react-native';
import { useBranch, withQuery } from '../src/branch-context';

function overdueTone(days: number) {
  if (days >= 30) return 'danger' as const;
  if (days >= 7) return 'warning' as const;
  return 'neutral' as const;
}

/** Qarzdorlik ro'yxati (TZ §18) — eng katta qarzdan boshlab. */
export default function DebtsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { query } = useBranch();

  const list = useResource<Paginated<DebtRow>>(
    withQuery('/debts', query, 'limit=50'),
    `debts.${query || 'all'}`,
  );

  const rows = list.data?.items ?? [];
  const total = rows.reduce((sum, row) => sum + row.outstanding, 0);
  const critical = rows.filter((row) => row.daysOverdue >= 30).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Screen refreshing={list.refreshing} onRefresh={list.refresh}>
        <Row gap={spacing.sm}>
          <MiniStat label={t.finance.totalDebt} value={money(total)} tone="danger" />
          <MiniStat label={t.dashboard.debtors} value={String(list.data?.total ?? 0)} tone="warning" />
          <MiniStat
            label={t.finance.overdue}
            value={String(critical)}
            tone={critical > 0 ? 'danger' : 'success'}
          />
        </Row>

        {list.loading && !list.data ? (
          <SkeletonList rows={10} />
        ) : !list.data ? (
          <ErrorState
            message={list.error ?? t.common.loadFailed}
            onRetry={list.refresh}
            retryLabel={t.common.retry}
          />
        ) : rows.length === 0 ? (
          <EmptyState icon="✅" title={t.children.noDebt} description={t.common.emptyHint} />
        ) : (
          <ListCard>
            {rows.map((row, index) => (
              <ListRow
                key={row.childId}
                title={row.childFullName}
                subtitle={`${row.groupName ?? '—'} · ${row.daysOverdue} ${t.finance.daysOverdue}`}
                meta={fullMoney(row.outstanding)}
                metaTone={overdueTone(row.daysOverdue)}
                leading={<Avatar name={row.childFullName} tone={overdueTone(row.daysOverdue)} />}
                trailing={
                  row.guardianPhone ? (
                    <Pressable
                      onPress={() => void Linking.openURL(`tel:${row.guardianPhone}`)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t.common.phone}
                    >
                      <Ionicons name="call-outline" size={20} color={colors.brand} />
                    </Pressable>
                  ) : (
                    <Badge tone="neutral" label="—" />
                  )
                }
                last={index === rows.length - 1}
              />
            ))}
          </ListCard>
        )}
      </Screen>
    </View>
  );
}
