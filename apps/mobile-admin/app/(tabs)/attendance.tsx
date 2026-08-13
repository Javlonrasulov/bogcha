import {
  AppText,
  BarChart,
  Badge,
  Banner,
  Card,
  Column,
  EmptyState,
  ErrorState,
  ListCard,
  ListRow,
  MiniStat,
  ProgressBar,
  RealtimeEvent,
  RingStat,
  Row,
  Screen,
  SectionHeader,
  SkeletonList,
  percent,
  spacing,
  todayIso,
  useI18n,
  useRealtimeRefresh,
  useResource,
  useTheme,
  type ChartPoint,
} from '@bogcha/mobile-core';
import type {
  AttendanceMissing,
  AttendanceSummary,
  AttendanceTrendPoint,
  GroupListItem,
} from '@bogcha/shared';
import { View } from 'react-native';
import { useBranch, withQuery } from '../../src/branch-context';
import { ScreenHeader } from '../../src/components/screen-header';

export default function AttendanceScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { query, activeBranch } = useBranch();
  const date = todayIso();

  const summary = useResource<AttendanceSummary>(
    withQuery('/attendance/summary', query, `date=${date}`),
    `attendance.summary.${query || 'all'}.${date}`,
  );
  const trend = useResource<AttendanceTrendPoint[]>(
    withQuery('/attendance/trend', query, 'days=14'),
    `attendance.trend.${query || 'all'}`,
  );
  const groups = useResource<GroupListItem[]>(
    withQuery('/groups', query),
    `groups.${query || 'all'}`,
  );
  const missing = useResource<AttendanceMissing>(
    `/attendance/missing?date=${date}`,
    `attendance.missing.${date}`,
  );

  const refresh = () => {
    void summary.refresh();
    void trend.refresh();
    void groups.refresh();
    void missing.refresh();
  };

  // Tarbiyachi davomat belgilaganda admin ekrani darhol yangilanadi.
  useRealtimeRefresh([RealtimeEvent.ATTENDANCE_UPDATED], refresh);

  const series: ChartPoint[] = (trend.data ?? []).map((point) => ({
    label: point.date.slice(8),
    value: point.attendanceRate,
  }));

  const data = summary.data;
  const groupList = groups.data ?? [];
  const pendingGroups = missing.data?.groups ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScreenHeader
        title={t.attendance.title}
        subtitle={activeBranch?.name ?? t.common.allBranches}
      />

      <Screen refreshing={summary.refreshing} onRefresh={refresh}>
        {summary.loading && !data ? (
          <SkeletonList rows={6} />
        ) : !data ? (
          <ErrorState
            message={summary.error ?? t.common.loadFailed}
            onRetry={summary.refresh}
            retryLabel={t.common.retry}
          />
        ) : (
          <>
            <Card>
              <Row gap={spacing.lg} align="center">
                <RingStat percent={data.attendanceRate} label={t.attendance.rate} size={92} />
                <Column gap={spacing.sm} style={{ flex: 1 }}>
                  <Row gap={spacing.sm}>
                    <MiniStat
                      label={t.attendance.present}
                      value={String(data.present)}
                      tone="success"
                    />
                    <MiniStat
                      label={t.attendance.absent}
                      value={String(data.absent)}
                      tone="danger"
                    />
                  </Row>
                  <Row gap={spacing.sm}>
                    <MiniStat label={t.attendance.expected} value={String(data.expected)} />
                    <MiniStat label={t.common.total} value={String(data.total)} tone="brand" />
                  </Row>
                </Column>
              </Row>
            </Card>

            <Row gap={spacing.sm} wrap>
              <MiniStat
                label={t.attendance.statuses.ABSENT_EXCUSED}
                value={String(data.excused)}
                tone="warning"
              />
              <MiniStat
                label={t.attendance.statuses.ABSENT_UNEXCUSED}
                value={String(data.unexcused)}
                tone="danger"
              />
              <MiniStat
                label={t.attendance.statuses.SICK}
                value={String(data.sick)}
                tone="info"
              />
              <MiniStat
                label={t.attendance.statuses.ON_VACATION}
                value={String(data.onVacation)}
                tone="accent"
              />
            </Row>

            {pendingGroups.length > 0 ? (
              <Banner
                tone="warning"
                icon="⏳"
                title={`${pendingGroups.length} ${t.attendance.notSubmitted.toLowerCase()}`}
                description={pendingGroups.map((group) => group.name).join(', ')}
              />
            ) : null}

            {series.length > 0 ? (
              <>
                <SectionHeader title={t.attendance.weeklyTrend} />
                <Card>
                  <BarChart data={series} tone="brand" formatValue={percent} />
                </Card>
              </>
            ) : null}

            <SectionHeader title={t.common.group} subtitle={`${groupList.length}`} />
            {groupList.length === 0 ? (
              <EmptyState icon="🏫" title={t.common.empty} description={t.common.emptyHint} />
            ) : (
              <ListCard>
                {groupList.map((group, index) => (
                  <ListRow
                    key={group.id}
                    title={group.name}
                    subtitle={`${group.branchName} · ${group.childrenCount}/${group.capacity}`}
                    meta={percent(group.attendanceRate30d)}
                    metaTone={
                      group.attendanceRate30d >= 90
                        ? 'success'
                        : group.attendanceRate30d >= 75
                          ? 'warning'
                          : 'danger'
                    }
                    last={index === groupList.length - 1}
                  />
                ))}
              </ListCard>
            )}

            <Card>
              <Column gap={spacing.sm}>
                <Row justify="space-between">
                  <AppText variant="caption" tone="muted">
                    {t.attendance.present} / {t.attendance.expected}
                  </AppText>
                  <Badge
                    tone={data.attendanceRate >= 90 ? 'success' : 'warning'}
                    label={percent(data.attendanceRate)}
                  />
                </Row>
                <ProgressBar
                  value={data.attendanceRate}
                  tone={data.attendanceRate >= 90 ? 'success' : 'warning'}
                />
              </Column>
            </Card>
          </>
        )}
      </Screen>
    </View>
  );
}
