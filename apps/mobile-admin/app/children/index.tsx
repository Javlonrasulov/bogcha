import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Badge,
  CHILD_STATUS_TONE,
  EmptyState,
  ErrorState,
  Field,
  ListCard,
  ListRow,
  MiniStat,
  Row,
  Screen,
  SkeletonList,
  fullMoney,
  spacing,
  useI18n,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import { ChildStatus, type ChildListItem, type Paginated } from '@bogcha/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useBranch, withQuery } from '../../src/branch-context';

export default function ChildrenListScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { query } = useBranch();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const children = useResource<Paginated<ChildListItem>>(
    withQuery('/children', query, 'limit=100'),
    `children.${query || 'all'}`,
  );

  const rows = useMemo(() => {
    const items = children.data?.items ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((child) => child.fullName.toLowerCase().includes(needle));
  }, [children.data, search]);

  const debtors = rows.filter((child) => child.outstandingDebt > 0).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Screen refreshing={children.refreshing} onRefresh={children.refresh}>
        <Field
          value={search}
          onChangeText={setSearch}
          placeholder={t.common.search}
          autoCorrect={false}
          trailing={<Ionicons name="search" size={18} color={colors.contentMuted} />}
        />

        <Row gap={spacing.sm}>
          <MiniStat
            label={t.common.total}
            value={String(children.data?.total ?? 0)}
            tone="brand"
          />
          <MiniStat
            label={t.dashboard.debtors}
            value={String(debtors)}
            tone={debtors > 0 ? 'warning' : 'success'}
          />
        </Row>

        {children.loading && !children.data ? (
          <SkeletonList rows={10} />
        ) : !children.data ? (
          <ErrorState
            message={children.error ?? t.common.loadFailed}
            onRetry={children.refresh}
            retryLabel={t.common.retry}
          />
        ) : rows.length === 0 ? (
          <EmptyState icon="🧒" title={t.common.empty} description={t.common.emptyHint} />
        ) : (
          <ListCard>
            {rows.map((child, index) => (
              <ListRow
                key={child.id}
                title={child.fullName}
                subtitle={`${child.group?.name ?? '—'} · ${child.age} ${t.children.age}`}
                meta={
                  child.outstandingDebt > 0
                    ? fullMoney(child.outstandingDebt)
                    : t.children.noDebt
                }
                metaTone={child.outstandingDebt > 0 ? 'danger' : 'success'}
                leading={<Avatar name={child.fullName} tone={CHILD_STATUS_TONE[child.status]} />}
                trailing={
                  child.status === ChildStatus.ACTIVE ? null : (
                    <Badge
                      tone={CHILD_STATUS_TONE[child.status]}
                      label={t.children.statuses[child.status]}
                    />
                  )
                }
                onPress={() => router.push(`/children/${child.id}`)}
                last={index === rows.length - 1}
              />
            ))}
          </ListCard>
        )}
      </Screen>
    </View>
  );
}
