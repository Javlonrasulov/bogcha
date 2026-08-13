import {

  AppText,

  Banner,

  BarChart,

  Card,

  ChartModeToggle,

  Column,

  ErrorState,

  HeroBanner,

  KeyValue,

  MonthFinanceCard,

  QuickActions,

  RealtimeEvent,

  Screen,

  SectionHeader,

  SkeletonList,

  StatCard,

  StatGrid,

  WaveChart,

  money,

  percent,

  showToast,

  spacing,

  useAuth,

  useI18n,

  useRealtimeRefresh,

  useResource,

  useTheme,

  type ChartMode,

  type ChartPoint,

  type QuickActionItem,

  type ToastKind,

} from '@bogcha/mobile-core';

import {

  HealthLevel,

  NotificationSeverity,

  Permission,

  type DashboardCharts,

  type DashboardOverview,

  type NotificationList,

} from '@bogcha/shared';

import { useRouter, type Href } from 'expo-router';

import { useEffect, useMemo, useRef, useState } from 'react';

import { View } from 'react-native';

import { useBranch, withQuery } from '../../src/branch-context';

import { ScreenHeader } from '../../src/components/screen-header';



const HEALTH_TONE = {

  [HealthLevel.GOOD]: 'success',

  [HealthLevel.WARNING]: 'warning',

  [HealthLevel.BAD]: 'danger',

} as const;



function toastKindFor(severity: NotificationSeverity): ToastKind {

  if (severity === NotificationSeverity.INFO) return 'info';

  if (severity === NotificationSeverity.WARNING) return 'info';

  return 'error';

}



/**

 * Admin dashboard — web admin bilan bir xil bloklar.

 * Tez amallar: Lider Manager uslubidagi gorizontal scroll.

 */

export default function DashboardScreen() {

  const { t } = useI18n();

  const { colors } = useTheme();

  const { user, can } = useAuth();

  const { query, activeBranch } = useBranch();

  const router = useRouter();

  const toastedIds = useRef(new Set<string>());

  const [attendanceMode, setAttendanceMode] = useState<ChartMode>('wave');

  const [profitMode, setProfitMode] = useState<ChartMode>('wave');



  const overview = useResource<DashboardOverview>(

    withQuery('/dashboard/overview', query),

    `dashboard.overview.${query || 'all'}`,

  );

  const charts = useResource<DashboardCharts>(

    withQuery('/dashboard/charts', query, 'days=14'),

    `dashboard.charts.${query || 'all'}`,

  );

  const notifications = useResource<NotificationList>(

    '/notifications?limit=5&unreadOnly=true',

    'notifications.unread',

  );



  const refresh = () => {

    void overview.refresh();

    void charts.refresh();

    void notifications.refresh();

  };



  useRealtimeRefresh(

    [

      RealtimeEvent.DASHBOARD_UPDATED,

      RealtimeEvent.ATTENDANCE_UPDATED,

      RealtimeEvent.PAYMENT_CREATED,

      RealtimeEvent.EXPENSE_CREATED,

      RealtimeEvent.NOTIFICATION_CREATED,

    ],

    refresh,

  );



  useEffect(() => {

    const items = (notifications.data?.items ?? []).slice(0, 3);

    for (const item of items) {

      if (toastedIds.current.has(item.id)) continue;

      toastedIds.current.add(item.id);

      showToast(item.title, toastKindFor(item.severity));

    }

  }, [notifications.data?.items]);



  const quickActions = useMemo(() => {

    const go = (href: Href) => () => router.push(href);

    const all: Array<QuickActionItem & { permissions: Permission[] }> = [

      {

        key: 'attendance',

        label: t.attendance.title,

        icon: 'checkmark-done-outline',

        color: '#6C5CE7',

        onPress: go('/attendance'),

        permissions: [Permission.ATTENDANCE_VIEW],

      },

      {

        key: 'finance',

        label: t.finance.title,

        icon: 'cash-outline',

        color: '#00C853',

        onPress: go('/finance'),

        permissions: [Permission.INCOME_VIEW, Permission.EXPENSE_VIEW, Permission.PAYMENT_VIEW],

      },

      {

        key: 'inventory',

        label: t.inventory.title,

        icon: 'cube-outline',

        color: '#E6963C',

        onPress: go('/inventory'),

        permissions: [Permission.STOCK_VIEW, Permission.PRODUCT_VIEW],

      },

      {

        key: 'food',

        label: t.foodConsumption.title,

        icon: 'restaurant-outline',

        color: '#FF6B35',

        onPress: go('/food-consumption'),

        permissions: [

          Permission.PRODUCT_VIEW,

          Permission.RECIPE_VIEW,

          Permission.STOCK_VIEW,

        ],

      },

      {

        key: 'children',

        label: t.children.title,

        icon: 'people-outline',

        color: '#3B82F6',

        onPress: go('/children'),

        permissions: [Permission.CHILD_VIEW],

      },

      {

        key: 'payments',

        label: t.finance.payments,

        icon: 'card-outline',

        color: '#10B981',

        onPress: go('/payments'),

        permissions: [Permission.PAYMENT_VIEW],

      },

      {

        key: 'debts',

        label: t.finance.debts,

        icon: 'alert-circle-outline',

        color: '#F44336',

        onPress: go('/debts'),

        permissions: [Permission.DEBT_VIEW],

      },

      {

        key: 'notifications',

        label: t.notifications.title,

        icon: 'notifications-outline',

        color: '#7C4DFF',

        onPress: go('/notifications'),

        permissions: [Permission.NOTIFICATION_VIEW],

      },

      {

        key: 'settings',

        label: t.settings.title,

        icon: 'settings-outline',

        color: '#6B7280',

        onPress: go('/settings'),

        permissions: [],

      },

    ];



    return all

      .filter((item) => item.permissions.length === 0 || item.permissions.some((p) => can(p)))

      .map(({ permissions: _p, ...action }) => action);

  }, [can, router, t]);



  const data = overview.data;

  const attendanceSeries: ChartPoint[] = (charts.data?.attendance ?? []).map((point) => ({

    label: point.date.slice(8),

    value: point.rate,

  }));

  const cashflowSeries: ChartPoint[] = (charts.data?.cashflow ?? []).map((point) => ({

    label: point.date.slice(8),

    value: point.profit,

  }));



  return (

    <View style={{ flex: 1, backgroundColor: colors.canvas }}>

      <ScreenHeader

        title={t.dashboard.title}

        subtitle={activeBranch?.name ?? t.common.allBranches}

        unreadCount={notifications.data?.unreadCount ?? 0}

      />



      <Screen refreshing={overview.refreshing} onRefresh={refresh}>

        {overview.loading && !data ? (

          <SkeletonList rows={6} />

        ) : !data ? (

          <ErrorState

            message={overview.error ?? t.common.loadFailed}

            onRetry={overview.refresh}

            retryLabel={t.common.retry}

          />

        ) : (

          <>

            {overview.stale ? (

              <Banner tone="neutral" icon="📴" title={t.sync.staleData} />

            ) : null}



            <HeroBanner

              eyebrow={user?.fullName ? `${t.auth.welcome}` : t.dashboard.title}

              title={t.attendance.rate}

              value={percent(data.today.attendanceRate)}

              hint={`${t.attendance.present}: ${data.today.present}/${data.today.expected} · ${t.dashboard.revenue}: ${money(data.today.income)}`}

            />



            <QuickActions title={t.dashboard.quickActions} actions={quickActions} />



            <SectionHeader title={t.dashboard.todayTitle} />

            <StatGrid>

              <StatCard

                label={t.attendance.present}

                value={`${data.today.present}/${data.today.expected}`}

                hint={percent(data.today.attendanceRate)}

                tone={HEALTH_TONE[data.health.attendance]}

                icon="👶"

              />

              <StatCard

                label={t.dashboard.revenue}

                value={money(data.today.income)}

                hint={`${t.finance.collected}: ${percent(data.finance.collectionRate)}`}

                tone="success"

                icon="💰"

              />

            </StatGrid>

            <StatGrid>

              <StatCard

                label={t.dashboard.expense}

                value={money(data.today.expense)}

                tone="warning"

                icon="💸"

              />

              <StatCard

                label={t.dashboard.profit}

                value={money(data.today.profit)}

                tone={data.today.profit >= 0 ? 'success' : 'danger'}

                icon="📈"

              />

            </StatGrid>

            <StatGrid>

              <StatCard

                label={t.inventory.totalValue}

                value={money(data.inventory.totalValue)}

                hint={

                  data.inventory.lowStockCount > 0

                    ? `${t.inventory.lowStock}: ${data.inventory.lowStockCount}`

                    : undefined

                }

                tone={data.inventory.lowStockCount > 0 ? 'warning' : 'info'}

                icon="📦"

              />

              <StatCard

                label={t.finance.debts}

                value={money(data.finance.outstandingDebt)}

                hint={`${data.finance.debtorCount}`}

                tone={HEALTH_TONE[data.health.debt]}

                icon="⚠️"

              />

            </StatGrid>



            <SectionHeader title={t.dashboard.monthTitle} subtitle={data.period} />

            <MonthFinanceCard

              revenueLabel={t.dashboard.revenue}

              revenue={money(data.finance.revenue)}

              expenseLabel={t.dashboard.expense}

              expense={money(data.finance.expense)}

              profitLabel={t.dashboard.netProfit}

              profit={money(data.finance.netProfit)}

              profitPositive={data.finance.netProfit >= 0}

              marginLabel={t.dashboard.margin}

              marginPercent={data.finance.profitMargin}

              marginTone={HEALTH_TONE[data.health.profitMargin]}

              collectionLabel={t.dashboard.collectionRate}

              collectionRate={data.finance.collectionRate}

              collectionTone={HEALTH_TONE[data.health.collection]}

              collectedLabel={t.finance.collected}

              collectedText={`${money(data.finance.collectedPayments)} / ${money(data.finance.expectedPayments)}`}

              debtLabel={t.finance.debts}

              debt={money(data.finance.outstandingDebt)}

            />



            {attendanceSeries.length > 0 ? (

              <>

                <SectionHeader

                  title={t.attendance.weeklyTrend}

                  action={

                    <ChartModeToggle

                      value={attendanceMode}

                      onChange={setAttendanceMode}

                      waveLabel={t.dashboard.chartWave}

                      barsLabel={t.dashboard.chartBars}

                    />

                  }

                />

                <Card>

                  {attendanceMode === 'wave' ? (

                    <WaveChart data={attendanceSeries} tone="brand" formatValue={percent} />

                  ) : (

                    <BarChart data={attendanceSeries} tone="brand" formatValue={percent} />

                  )}

                </Card>

              </>

            ) : null}



            {cashflowSeries.length > 0 ? (

              <>

                <SectionHeader

                  title={t.dashboard.profit}

                  action={

                    <ChartModeToggle

                      value={profitMode}

                      onChange={setProfitMode}

                      waveLabel={t.dashboard.chartWave}

                      barsLabel={t.dashboard.chartBars}

                    />

                  }

                />

                <Card>

                  {profitMode === 'wave' ? (

                    <WaveChart data={cashflowSeries} tone="success" formatValue={money} />

                  ) : (

                    <BarChart data={cashflowSeries} tone="success" formatValue={money} />

                  )}

                </Card>

              </>

            ) : null}



            <SectionHeader

              title={t.inventory.lowStock}

              subtitle={

                data.inventory.lowStockCount > 0

                  ? `${data.inventory.lowStockCount}`

                  : undefined

              }

            />

            <Card>

              {data.inventory.lowStockItems.length === 0 ? (

                <AppText variant="body" tone="muted">

                  {t.common.empty}

                </AppText>

              ) : (

                <Column gap={spacing.sm}>

                  {data.inventory.lowStockItems.slice(0, 5).map((item) => (

                    <KeyValue

                      key={item.productName}

                      label={item.productName}

                      value={`${item.quantity} / ${item.minQuantity} ${item.unit.toLowerCase()}`}

                      tone="danger"

                    />

                  ))}

                </Column>

              )}

            </Card>

          </>

        )}

      </Screen>

    </View>

  );

}


