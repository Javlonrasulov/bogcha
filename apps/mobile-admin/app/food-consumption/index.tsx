import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Button,
  Card,
  Column,
  EmptyState,
  ErrorState,
  Field,
  ListCard,
  ListRow,
  Row,
  Screen,
  SkeletonList,
  StatCard,
  showToast,
  spacing,
  useApi,
  useAuth,
  useI18n,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import {
  Permission,
  Unit,
  type FoodConsumptionReport,
  type Paginated,
  type Product,
  type Unit as UnitType,
} from '@bogcha/shared';
import { useNavigation, useRouter } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBranch, withQuery } from '../../src/branch-context';
import {
  FOOD_UNIT_LABELS,
  formatCompoundNorm,
  formatDateNumeric,
  formatNumber,
  formatQuantity,
  normInputMode,
  parseOptionalNumber,
  resolveFoodRange,
  type RangePreset,
} from '../../src/food-consumption';
import { FoodRangePicker } from '../../src/food-range-picker';

export default function FoodConsumptionScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { can } = useAuth();
  const api = useApi();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { scopedBranchId, scopedQuery } = useBranch();

  const [preset, setPreset] = useState<RangePreset>('7');
  const [customFrom, setCustomFrom] = useState<string | null>(null);
  const [customTo, setCustomTo] = useState<string | null>(null);
  const [normsOpen, setNormsOpen] = useState(false);
  const [normModalOpen, setNormModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [normForm, setNormForm] = useState({
    productId: '',
    major: '',
    minor: '',
    note: '',
  });

  const { from, to } = resolveFoodRange(preset, customFrom, customTo);

  const canView = can(Permission.PRODUCT_VIEW, Permission.RECIPE_VIEW, Permission.STOCK_VIEW);
  // Web bilan bir xil: har qanday manage ruxsati yetarli.
  const canManage =
    can(Permission.PRODUCT_MANAGE) ||
    can(Permission.RECIPE_MANAGE) ||
    can(Permission.STOCK_MANAGE);

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
    navigation.setOptions({
      headerRight: canManage
        ? () => (
            <Pressable
              onPress={() => setNormModalOpen(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t.foodConsumption.addNorm}
              style={{
                marginRight: 4,
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: colors.brand,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, canManage, colors.brand, t.foodConsumption.addNorm]);

  const reportPath =
    canView && scopedBranchId
      ? withQuery('/food-consumption/report', scopedQuery, `from=${from}`, `to=${to}`)
      : null;

  const report = useResource<FoodConsumptionReport>(
    reportPath,
    `food-consumption.${scopedBranchId ?? 'none'}.${from}.${to}`,
  );

  const productsRes = useResource<Paginated<Product>>(
    (normModalOpen || canManage) && scopedBranchId
      ? withQuery('/products', scopedQuery, 'limit=200&isActive=true')
      : null,
    `products.norm-picker.${scopedBranchId ?? 'none'}`,
  );

  const allProducts = useMemo(() => {
    const items = (productsRes.data?.items ?? []).filter((p) => p.isActive !== false);
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'uz'));
  }, [productsRes.data]);

  const products = useMemo(() => {
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return allProducts;
    return allProducts.filter((p) => {
      const unit = FOOD_UNIT_LABELS[p.unit] ?? p.unit;
      return `${p.name} ${unit}`.toLowerCase().includes(needle);
    });
  }, [allProducts, productSearch]);

  const selectedProduct = allProducts.find((item) => item.id === normForm.productId);
  const inputMode = normInputMode(selectedProduct?.unit);

  const presentTotal = report.data?.totals.presentCount ?? 0;
  const productCount = report.data?.products.length ?? 0;
  const spendDays = report.data?.days.filter((day) => day.presentCount > 0).length ?? 0;

  function closeNormModal() {
    setNormModalOpen(false);
    setProductPickerOpen(false);
    setProductSearch('');
    setNormForm({ productId: '', major: '', minor: '', note: '' });
  }

  async function saveNorm() {
    if (!scopedBranchId || !normForm.productId || !selectedProduct) return;

    const major = parseOptionalNumber(normForm.major);
    const minor = parseOptionalNumber(normForm.minor);
    if (Number.isNaN(major) || Number.isNaN(minor)) {
      showToast(t.foodConsumption.invalidNorm, 'error');
      return;
    }

    const productUnit = selectedProduct.unit as UnitType;
    let quantityPerChild = 0;
    let unit: UnitType = productUnit;

    if (inputMode === 'weight') {
      const totalKg = major + minor / 1000;
      if (!(totalKg > 0)) {
        showToast(t.foodConsumption.invalidNorm, 'error');
        return;
      }
      if (productUnit === Unit.GRAM) {
        quantityPerChild = totalKg * 1000;
        unit = Unit.GRAM;
      } else {
        quantityPerChild = totalKg;
        unit = Unit.KG;
      }
    } else if (inputMode === 'volume') {
      const totalLitr = major + minor / 1000;
      if (!(totalLitr > 0)) {
        showToast(t.foodConsumption.invalidNorm, 'error');
        return;
      }
      if (productUnit === Unit.MILLILITER) {
        quantityPerChild = totalLitr * 1000;
        unit = Unit.MILLILITER;
      } else {
        quantityPerChild = totalLitr;
        unit = Unit.LITER;
      }
    } else {
      if (!(major > 0)) {
        showToast(t.foodConsumption.invalidNorm, 'error');
        return;
      }
      quantityPerChild = major;
      unit = productUnit;
    }

    setSaving(true);
    try {
      await api.post('/food-consumption/norms', {
        branchId: scopedBranchId,
        productId: normForm.productId,
        quantityPerChild,
        unit,
        effectiveFrom: from,
        note: normForm.note.trim() || undefined,
      });
      showToast(t.foodConsumption.normAdded, 'success');
      closeNormModal();
      await report.refresh();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t.common.error, 'error');
    } finally {
      setSaving(false);
    }
  }

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

        <Row gap={spacing.sm}>
          {canManage ? (
            <Button
              label={t.foodConsumption.addNorm}
              size="sm"
              icon={<Ionicons name="add" size={16} color="#fff" />}
              onPress={() => setNormModalOpen(true)}
              style={{ flex: 1 }}
              fullWidth
            />
          ) : null}
          <Button
            label={t.foodConsumption.dailyTable}
            size="sm"
            variant="secondary"
            icon={<Ionicons name="calendar-outline" size={16} color={colors.content} />}
            onPress={() =>
              router.push({
                pathname: '/food-consumption/daily',
                params: {
                  range: preset,
                  from: preset === 'custom' ? from : undefined,
                  to: preset === 'custom' ? to : undefined,
                },
              })
            }
            style={{ flex: 1 }}
            fullWidth
          />
        </Row>

        {report.loading && !report.data ? (
          <SkeletonList rows={6} />
        ) : !report.data ? (
          <ErrorState
            message={report.error ?? t.common.loadFailed}
            onRetry={report.refresh}
            retryLabel={t.common.retry}
          />
        ) : (
          <>
            <Column gap={spacing.md}>
              <Row gap={spacing.md} align="stretch">
                <StatCard
                  label={t.foodConsumption.kpiPresent}
                  value={formatNumber(presentTotal)}
                  hint={`${formatDateNumeric(from)} — ${formatDateNumeric(to)}`}
                  tone="brand"
                  ionIcon="people-outline"
                  iconColor="#3B82F6"
                  compact
                  style={{ flex: 1, minWidth: 0 }}
                />
                <StatCard
                  label={t.foodConsumption.kpiNormProducts}
                  value={formatNumber(productCount)}
                  hint={t.foodConsumption.kpiNormProductsHint}
                  tone="info"
                  ionIcon="restaurant-outline"
                  iconColor="#FF6B35"
                  compact
                  style={{ flex: 1, minWidth: 0 }}
                />
              </Row>
              <Row gap={spacing.md} align="stretch">
                <StatCard
                  label={t.foodConsumption.kpiCalculated}
                  value={formatNumber(spendDays)}
                  hint={t.foodConsumption.kpiCalculatedHint}
                  tone="accent"
                  ionIcon="cube-outline"
                  iconColor="#E6963C"
                  compact
                  style={{ flex: 1, minWidth: 0 }}
                />
                <StatCard
                  label={t.foodConsumption.kpiExpected}
                  value={formatNumber(productCount)}
                  hint={t.foodConsumption.kpiExpectedHint}
                  tone="success"
                  ionIcon="scale-outline"
                  iconColor="#00C853"
                  compact
                  style={{ flex: 1, minWidth: 0 }}
                />
              </Row>
            </Column>

            <Column gap={spacing.sm}>
              <AppText variant="heading">{t.foodConsumption.forecastTitle}</AppText>
              <AppText variant="caption" tone="muted">
                {t.foodConsumption.forecastHint}
              </AppText>

              {(report.data.stock?.length ?? 0) === 0 ? (
                <EmptyState
                  ionIcon="cube-outline"
                  iconColor="#E6963C"
                  title={t.foodConsumption.noNorms}
                  description={t.foodConsumption.noNormsHint}
                  action={
                    canManage ? (
                      <Button
                        label={t.foodConsumption.addNorm}
                        size="sm"
                        icon={<Ionicons name="add" size={16} color="#fff" />}
                        onPress={() => setNormModalOpen(true)}
                      />
                    ) : undefined
                  }
                />
              ) : (
                <Column gap={spacing.sm}>
                  {report.data.stock.map((row) => {
                    const product = report.data?.products.find(
                      (item) => item.productId === row.productId,
                    );
                    const normQty = product?.quantityPerChild ?? 0;
                    return (
                      <Card key={row.productId}>
                        <Column gap={spacing.sm}>
                          <AppText variant="heading" numberOfLines={1}>
                            {row.productName}
                          </AppText>
                          <Row gap={spacing.md} wrap>
                            <Metric
                              label={`${t.foodConsumption.opening}\n${formatDateNumeric(from)}`}
                              value={formatQuantity(row.openingQuantity, row.unit)}
                            />
                            <Metric
                              label={t.foodConsumption.inbound}
                              value={formatQuantity(row.inboundQuantity, row.unit)}
                            />
                            <Metric
                              label={t.foodConsumption.presentChildren}
                              value={formatNumber(presentTotal)}
                            />
                            <Metric
                              label={t.foodConsumption.perChild}
                              value={formatCompoundNorm(normQty, product?.normUnit ?? row.unit)}
                            />
                            <Metric
                              label={t.foodConsumption.calculatedSpend}
                              value={formatQuantity(row.normConsumption, row.unit)}
                            />
                            <Metric
                              label={`${t.foodConsumption.expected}\n${formatDateNumeric(to)}`}
                              value={formatQuantity(row.expectedByNorm, row.unit)}
                              emphasize
                            />
                          </Row>
                        </Column>
                      </Card>
                    );
                  })}
                </Column>
              )}
            </Column>

            <Pressable onPress={() => setNormsOpen((open) => !open)}>
              <Row justify="space-between" align="center">
                <Column gap={spacing.xs} style={{ flex: 1 }}>
                  <Row gap={spacing.sm} align="center">
                    <AppText variant="heading">{t.foodConsumption.normsTitle}</AppText>
                    <AppText variant="caption" tone="muted">
                      {report.data.norms.length}
                    </AppText>
                  </Row>
                  <AppText variant="caption" tone="muted">
                    {t.foodConsumption.normsListHint}
                  </AppText>
                </Column>
                <Ionicons
                  name={normsOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.contentMuted}
                />
              </Row>
            </Pressable>

            {normsOpen ? (
              (report.data.norms?.length ?? 0) === 0 ? (
                <EmptyState
                  ionIcon="scale-outline"
                  iconColor="#00C853"
                  title={t.foodConsumption.noNorms}
                  description={t.foodConsumption.noNormsHint}
                  action={
                    canManage ? (
                      <Button
                        label={t.foodConsumption.addNorm}
                        size="sm"
                        icon={<Ionicons name="add" size={16} color="#fff" />}
                        onPress={() => setNormModalOpen(true)}
                      />
                    ) : undefined
                  }
                />
              ) : (
                <ListCard>
                  {report.data.norms.map((norm, index) => (
                    <ListRow
                      key={norm.id}
                      title={norm.productName}
                      subtitle={`${t.foodConsumption.effectiveFrom}: ${formatDateNumeric(norm.effectiveFrom)}`}
                      meta={formatCompoundNorm(norm.quantityPerChild, norm.unit)}
                      last={index === report.data!.norms.length - 1}
                    />
                  ))}
                </ListCard>
              )
            ) : null}
          </>
        )}
      </Screen>

      <Modal visible={normModalOpen} animationType="slide" transparent onRequestClose={closeNormModal}>
        <Pressable
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
          onPress={closeNormModal}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              maxHeight: '92%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingTop: spacing.lg,
              paddingHorizontal: spacing.lg,
              paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
              gap: spacing.md,
              borderWidth: 1,
              borderColor: colors.line,
            }}
          >
            <Row justify="space-between" align="flex-start">
              <Column gap={spacing.xs} style={{ flex: 1, paddingRight: spacing.sm }}>
                <AppText variant="heading">{t.foodConsumption.addNorm}</AppText>
                <AppText variant="caption" tone="muted">
                  {t.foodConsumption.normsHint}
                </AppText>
              </Column>
              <Pressable
                onPress={closeNormModal}
                hitSlop={12}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={colors.contentMuted} />
              </Pressable>
            </Row>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}
            >
              <Column gap={spacing.xs}>
                <AppText variant="caption" tone="muted">
                  {t.common.product}
                </AppText>
                <Pressable onPress={() => setProductPickerOpen((open) => !open)}>
                  <View
                    style={{
                      minHeight: 44,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: productPickerOpen ? colors.brand : colors.line,
                      backgroundColor: colors.surface,
                      paddingHorizontal: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <Ionicons name="cube-outline" size={18} color={colors.brand} />
                    <AppText
                      variant="body"
                      weight={selectedProduct ? '600' : '400'}
                      tone={selectedProduct ? 'default' : 'muted'}
                      style={{ flex: 1 }}
                      numberOfLines={1}
                    >
                      {selectedProduct
                        ? `${selectedProduct.name} (${FOOD_UNIT_LABELS[selectedProduct.unit] ?? selectedProduct.unit})`
                        : t.foodConsumption.pickProduct}
                    </AppText>
                    <Ionicons
                      name={productPickerOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.contentMuted}
                    />
                  </View>
                </Pressable>
              </Column>

              {productPickerOpen ? (
                <Column gap={spacing.sm}>
                  <Field
                    value={productSearch}
                    onChangeText={setProductSearch}
                    placeholder={t.foodConsumption.pickProduct}
                    autoCorrect={false}
                  />
                  <ListCard>
                    {productsRes.loading && products.length === 0 ? (
                      <ListRow title={t.common.loading} last />
                    ) : products.length === 0 ? (
                      <ListRow title={t.common.empty} last />
                    ) : (
                      products.map((item, index) => (
                        <ListRow
                          key={item.id}
                          title={item.name}
                          subtitle={item.category?.name}
                          meta={FOOD_UNIT_LABELS[item.unit] ?? item.unit}
                          onPress={() => {
                            setNormForm((prev) => ({
                              ...prev,
                              productId: item.id,
                              major: '',
                              minor: '',
                            }));
                            setProductPickerOpen(false);
                            setProductSearch('');
                          }}
                          last={index === products.length - 1}
                        />
                      ))
                    )}
                  </ListCard>
                </Column>
              ) : null}

              {inputMode === 'weight' ? (
                <Row gap={spacing.sm}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t.foodConsumption.perChildKg}
                      value={normForm.major}
                      onChangeText={(major) => setNormForm((prev) => ({ ...prev, major }))}
                      keyboardType="number-pad"
                      placeholder="1"
                      editable={Boolean(selectedProduct)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t.foodConsumption.perChildGram}
                      value={normForm.minor}
                      onChangeText={(minor) => setNormForm((prev) => ({ ...prev, minor }))}
                      keyboardType="number-pad"
                      placeholder="350"
                      editable={Boolean(selectedProduct)}
                    />
                  </View>
                </Row>
              ) : null}

              {inputMode === 'volume' ? (
                <Row gap={spacing.sm}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t.foodConsumption.perChildLiter}
                      value={normForm.major}
                      onChangeText={(major) => setNormForm((prev) => ({ ...prev, major }))}
                      keyboardType="number-pad"
                      placeholder="1"
                      editable={Boolean(selectedProduct)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={t.foodConsumption.perChildMl}
                      value={normForm.minor}
                      onChangeText={(minor) => setNormForm((prev) => ({ ...prev, minor }))}
                      keyboardType="number-pad"
                      placeholder="300"
                      editable={Boolean(selectedProduct)}
                    />
                  </View>
                </Row>
              ) : null}

              {inputMode === 'single' ? (
                <Field
                  label={
                    selectedProduct
                      ? `${t.foodConsumption.perChild} (${FOOD_UNIT_LABELS[selectedProduct.unit] ?? selectedProduct.unit})`
                      : t.foodConsumption.perChild
                  }
                  value={normForm.major}
                  onChangeText={(major) => setNormForm((prev) => ({ ...prev, major }))}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  editable={Boolean(selectedProduct)}
                />
              ) : null}

              <Row gap={spacing.sm} justify="flex-end" style={{ paddingTop: spacing.sm }}>
                <Button
                  label={t.common.cancel}
                  variant="ghost"
                  size="md"
                  onPress={closeNormModal}
                />
                <Button
                  label={t.foodConsumption.addNorm}
                  size="md"
                  loading={saving}
                  disabled={
                    !normForm.productId ||
                    saving ||
                    (!normForm.major.trim() && !normForm.minor.trim())
                  }
                  onPress={() => void saveNorm()}
                />
              </Row>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Metric({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <Column gap={2} style={{ width: '46%', minWidth: 120 }}>
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {label}
      </AppText>
      <AppText
        variant="caption"
        weight="700"
        tone={emphasize ? 'brand' : 'default'}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </Column>
  );
}
