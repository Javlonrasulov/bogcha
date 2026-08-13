import {
  AppText,
  Badge,
  Card,
  Column,
  EmptyState,
  ErrorState,
  Field,
  ListCard,
  ListRow,
  MiniStat,
  ProgressBar,
  RealtimeEvent,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  SkeletonList,
  money,
  quantity,
  shortDate,
  spacing,
  useI18n,
  useRealtimeRefresh,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import {
  StockMovementType,
  type Paginated,
  type StockMovement,
  type StockOverview,
} from '@bogcha/shared';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useBranch, withQuery } from '../../src/branch-context';
import { ScreenHeader } from '../../src/components/screen-header';

type Tab = 'stock' | 'movements';

export default function InventoryScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { query, activeBranch } = useBranch();
  const [tab, setTab] = useState<Tab>('stock');
  const [search, setSearch] = useState('');

  const stock = useResource<StockOverview>(
    withQuery('/stock', query),
    `stock.${query || 'all'}`,
  );
  const movements = useResource<Paginated<StockMovement>>(
    tab === 'movements' ? withQuery('/stock/movements', query, 'limit=25') : null,
    `stock.movements.${query || 'all'}`,
  );

  const rows = useMemo(() => {
    const items = Array.isArray(stock.data?.items) ? stock.data.items : [];
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => (item.productName ?? '').toLowerCase().includes(needle));
  }, [stock.data, search]);

  const refresh = () => {
    void stock.refresh();
    if (tab === 'movements') void movements.refresh();
  };

  useRealtimeRefresh([RealtimeEvent.STOCK_UPDATED], refresh);

  const tabs = [
    { value: 'stock' as Tab, label: t.inventory.quantity },
    { value: 'movements' as Tab, label: t.inventory.movements },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScreenHeader
        title={t.inventory.title}
        subtitle={activeBranch?.name ?? t.common.allBranches}
      />

      <Screen refreshing={stock.refreshing} onRefresh={refresh}>
        <Segmented options={tabs} value={tab} onChange={setTab} />

        {stock.loading && !stock.data ? (
          <SkeletonList rows={6} />
        ) : !stock.data ? (
          <ErrorState
            message={stock.error ?? t.common.loadFailed}
            onRetry={stock.refresh}
            retryLabel={t.common.retry}
          />
        ) : (
          <>
            <Row gap={spacing.sm}>
              <MiniStat
                label={t.inventory.totalValue}
                value={money(stock.data.totalValue)}
                tone="brand"
              />
              <MiniStat
                label={t.inventory.lowStock}
                value={String(stock.data.lowStockCount)}
                tone={stock.data.lowStockCount > 0 ? 'danger' : 'success'}
              />
            </Row>

            {tab === 'stock' ? (
              <>
                <Field
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t.common.search}
                  autoCorrect={false}
                />
                {rows.length === 0 ? (
                  <EmptyState icon="📦" title={t.common.empty} description={t.common.emptyHint} />
                ) : (
                  <ListCard>
                    {rows.map((item, index) => (
                      <ListRow
                        key={item.productId}
                        title={item.productName}
                        subtitle={`${item.categoryName} · ${t.inventory.minQuantity}: ${quantity(
                          item.minQuantity,
                          item.unit.toLowerCase(),
                        )}`}
                        meta={quantity(item.quantity, item.unit.toLowerCase())}
                        metaTone={item.isLow ? 'danger' : 'success'}
                        trailing={
                          item.isLow ? <Badge tone="danger" label={t.inventory.lowStock} /> : null
                        }
                        last={index === rows.length - 1}
                      />
                    ))}
                  </ListCard>
                )}
              </>
            ) : null}

            {tab === 'movements' ? (
              movements.loading && !movements.data ? (
                <SkeletonList rows={8} />
              ) : (movements.data?.items?.length ?? 0) === 0 ? (
                <EmptyState icon="🔄" title={t.common.empty} description={t.common.emptyHint} />
              ) : (
                <ListCard>
                  {(movements.data?.items ?? []).map((item, index) => (
                    <ListRow
                      key={item.id}
                      title={item.product?.name ?? '—'}
                      subtitle={`${shortDate(item.date)} · ${item.source}`}
                      meta={`${item.type === StockMovementType.OUT ? '−' : '+'}${quantity(
                        item.quantity,
                        item.product?.unit?.toLowerCase?.() ?? '',
                      )}`}
                      metaTone={item.type === StockMovementType.OUT ? 'danger' : 'success'}
                      last={index === (movements.data?.items?.length ?? 0) - 1}
                    />
                  ))}
                </ListCard>
              )
            ) : null}

            {tab === 'stock' && stock.data.lowStockCount > 0 ? (
              <>
                <SectionHeader title={t.inventory.lowStock} />
                <Card>
                  <Column gap={spacing.md}>
                    {rows
                      .filter((item) => item.isLow)
                      .slice(0, 6)
                      .map((item) => (
                        <Column key={item.productId} gap={spacing.xs}>
                          <Row justify="space-between">
                            <AppText variant="caption" tone="muted">
                              {item.productName}
                            </AppText>
                            <AppText variant="caption" tone="danger" weight="600">
                              {item.daysRemaining} {t.inventory.daysRemaining}
                            </AppText>
                          </Row>
                          <ProgressBar
                            value={
                              item.minQuantity > 0
                                ? Math.min(100, (item.quantity / item.minQuantity) * 100)
                                : 0
                            }
                            tone="danger"
                            height={6}
                          />
                        </Column>
                      ))}
                  </Column>
                </Card>
              </>
            ) : null}
          </>
        )}
      </Screen>
    </View>
  );
}
