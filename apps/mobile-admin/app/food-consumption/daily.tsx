import {
  AppText,
  Card,
  Column,
  EmptyState,
  ErrorState,
  Row,
  Screen,
  SkeletonList,
  spacing,
  useAuth,
  useI18n,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import { Permission, type FoodConsumptionReport } from '@bogcha/shared';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useBranch, withQuery } from '../../src/branch-context';
import {
  FOOD_UNIT_LABELS,
  formatDateNumeric,
  formatNumber,
  formatQuantity,
  resolveFoodRange,
  type RangePreset,
} from '../../src/food-consumption';
import { FoodRangePicker } from '../../src/food-range-picker';

function asPreset(value: string | string[] | undefined): RangePreset {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === 'today' ||
    raw === 'yesterday' ||
    raw === '7' ||
    raw === '10' ||
    raw === '30' ||
    raw === 'custom'
  ) {
    return raw;
  }
  return '7';
}

function asParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function FoodConsumptionDailyScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { can } = useAuth();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ range?: string; from?: string; to?: string }>();
  const { scopedBranchId, scopedQuery } = useBranch();

  const [preset, setPreset] = useState<RangePreset>(() => asPreset(params.range));
  const [customFrom, setCustomFrom] = useState<string | null>(() => asParam(params.from));
  const [customTo, setCustomTo] = useState<string | null>(() => asParam(params.to));

  const { from, to } = resolveFoodRange(preset, customFrom, customTo);
  const canView = can(Permission.PRODUCT_VIEW, Permission.RECIPE_VIEW, Permission.STOCK_VIEW);

  const rangeLabels = useMemo(
    () => ({
      today: t.foodConsumption.rangeToday,
      yesterday: t.foodConsumption.rangeYesterday,
      range7: t.foodConsumption.range7,
      range10: t.foodConsumption.range10,
      custom: t.foodConsumption.rangeCustom,
      pickDay: t.foodConsumption.calendarPickDay,
      pickEnd: t.foodConsumption.calendarPickEnd,
      apply: t.foodConsumption.calendarApplyDay,
    }),
    [t],
  );

  function onSelectPreset(next: RangePreset) {
    setPreset(next);
    if (next !== 'custom') {
      setCustomFrom(null);
      setCustomTo(null);
    }
  }

  function onSelectRange(nextFrom: string, nextTo: string) {
    setPreset('custom');
    setCustomFrom(nextFrom);
    setCustomTo(nextTo);
  }

  useLayoutEffect(() => {
    navigation.setOptions({ headerRight: undefined });
  }, [navigation]);

  const reportPath =
    canView && scopedBranchId
      ? withQuery('/food-consumption/report', scopedQuery, `from=${from}`, `to=${to}`)
      : null;

  const report = useResource<FoodConsumptionReport>(
    reportPath,
    `food-consumption.daily.${scopedBranchId ?? 'none'}.${from}.${to}`,
  );

  if (!canView) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <Screen>
          <EmptyState
            ionIcon="lock-closed-outline"
            iconColor="#6B7280"
            title={t.common.empty}
            description={t.auth.wrongRole}
          />
        </Screen>
      </View>
    );
  }

  if (!scopedBranchId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <Screen>
          <EmptyState
            ionIcon="business-outline"
            iconColor="#3B82F6"
            title={t.foodConsumption.selectBranch}
          />
        </Screen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Screen refreshing={report.refreshing} onRefresh={report.refresh}>
        <FoodRangePicker
          preset={preset}
          from={from}
          to={to}
          labels={rangeLabels}
          onSelectPreset={onSelectPreset}
          onSelectRange={onSelectRange}
        />

        {report.loading && !report.data ? (
          <SkeletonList rows={8} />
        ) : !report.data ? (
          <ErrorState
            message={report.error ?? t.common.loadFailed}
            onRetry={report.refresh}
            retryLabel={t.common.retry}
          />
        ) : (report.data.products?.length ?? 0) === 0 ? (
          <EmptyState
            ionIcon="restaurant-outline"
            iconColor="#FF6B35"
            title={t.foodConsumption.noNorms}
            description={t.foodConsumption.noNormsHint}
          />
        ) : (
          <Card padded={false}>
            <Column gap={spacing.sm} style={{ padding: spacing.lg }}>
              <AppText variant="heading">
                {formatDateNumeric(from)} — {formatDateNumeric(to)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {t.foodConsumption.dailyHint}
              </AppText>
            </Column>

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: 120 + report.data.products.length * 110, paddingBottom: spacing.md }}>
                {/* Header */}
                <Row
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: colors.line,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  <View style={{ width: 100 }}>
                    <AppText variant="caption" weight="700" tone="muted">
                      {t.foodConsumption.date}
                    </AppText>
                  </View>
                  <View style={{ width: 90, alignItems: 'flex-end' }}>
                    <AppText variant="caption" weight="700" tone="muted">
                      {t.foodConsumption.presentChildren}
                    </AppText>
                  </View>
                  {report.data.products.map((product) => (
                    <View key={product.productId} style={{ width: 110, alignItems: 'flex-end' }}>
                      <AppText variant="caption" weight="700" numberOfLines={1}>
                        {product.productName}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {FOOD_UNIT_LABELS[product.unit] ?? product.unit}
                      </AppText>
                    </View>
                  ))}
                </Row>

                {report.data.days.map((day) => (
                  <Row
                    key={day.date}
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    }}
                  >
                    <View style={{ width: 100 }}>
                      <AppText variant="caption" weight="600">
                        {formatDateNumeric(day.date)}
                      </AppText>
                    </View>
                    <View style={{ width: 90, alignItems: 'flex-end' }}>
                      <AppText variant="caption">{formatNumber(day.presentCount)}</AppText>
                    </View>
                    {day.products.map((cell) => (
                      <View
                        key={`${day.date}-${cell.productId}`}
                        style={{ width: 110, alignItems: 'flex-end' }}
                      >
                        <AppText variant="caption">
                          {formatQuantity(cell.plannedQuantity, cell.unit)}
                        </AppText>
                      </View>
                    ))}
                  </Row>
                ))}

                {/* Totals */}
                <Row
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    backgroundColor: colors.surfaceMuted,
                  }}
                >
                  <View style={{ width: 100 }}>
                    <AppText variant="caption" weight="700">
                      {t.foodConsumption.total}
                    </AppText>
                  </View>
                  <View style={{ width: 90, alignItems: 'flex-end' }}>
                    <AppText variant="caption" weight="700">
                      {formatNumber(report.data.totals.presentCount)}
                    </AppText>
                  </View>
                  {report.data.products.map((product) => (
                    <View
                      key={`total-${product.productId}`}
                      style={{ width: 110, alignItems: 'flex-end' }}
                    >
                      <AppText variant="caption" weight="700">
                        {formatQuantity(
                          report.data!.totals.plannedByProduct[product.productId] ?? 0,
                          product.unit,
                        )}
                      </AppText>
                    </View>
                  ))}
                </Row>
              </View>
            </ScrollView>
          </Card>
        )}
      </Screen>
    </View>
  );
}
