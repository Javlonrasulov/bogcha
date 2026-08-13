import { Ionicons } from '@expo/vector-icons';
import {
  ATTENDANCE_STATUS_META,
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  Column,
  ErrorState,
  HeroBanner,
  MiniStat,
  percent,
  RingStat,
  Row,
  Screen,
  SkeletonList,
  clockTime,
  radius,
  shortDate,
  spacing,
  toneColors,
  todayIso,
  useI18n,
  useResource,
  useSync,
  useTheme,
} from '@bogcha/mobile-core';
import {
  AttendanceStatus,
  type AttendanceBoard,
  type MyGroup,
} from '@bogcha/shared';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SyncBar } from '../../src/components/sync-bar';
import { StatusSheet, type StatusSheetTarget } from '../../src/components/status-sheet';
import { useAttendanceDraft, type DraftMap } from '../../src/hooks/use-attendance-draft';

export default function AttendanceScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { submit, online } = useSync();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const date = todayIso();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [sheetTarget, setSheetTarget] = useState<StatusSheetTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const groups = useResource<MyGroup[]>('/groups/my', 'groups.my');
  const board = useResource<AttendanceBoard>(
    groupId ? `/attendance/board?groupId=${groupId}&date=${date}` : null,
    groupId ? `board.${groupId}.${date}` : undefined,
  );
  const draft = useAttendanceDraft(groupId, date);

  // Birinchi guruh avtomatik tanlanadi — ko'p tarbiyachi bitta guruh yuritadi.
  useEffect(() => {
    if (!groupId && groups.data?.length) setGroupId(groups.data[0]!.id);
  }, [groups.data, groupId]);

  /** Serverdagi holat qoralama bilan birlashtiriladi: qoralama ustunroq. */
  const merged = useMemo(() => {
    const children = board.data?.children ?? [];
    return children.map((child) => {
      const local = draft.entries[child.id];
      const serverEntry = child.status
        ? {
            status: child.status,
            arrivedAt: child.arrivedAt ? clockTime(child.arrivedAt) : undefined,
            leftAt: child.leftAt ? clockTime(child.leftAt) : undefined,
            note: child.note ?? undefined,
          }
        : undefined;
      return { child, entry: local ?? serverEntry, isLocal: Boolean(local) };
    });
  }, [board.data, draft.entries]);

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    for (const row of merged) {
      if (!row.entry) unmarked += 1;
      else if (row.entry.status === AttendanceStatus.PRESENT) present += 1;
      else absent += 1;
    }
    const expected = merged.length - absentOnVacation(merged);
    return {
      present,
      absent,
      unmarked,
      total: merged.length,
      rate: expected > 0 ? (present / expected) * 100 : 0,
    };
  }, [merged]);

  const tapToggle = useCallback(
    (childId: string, current: AttendanceStatus | undefined) => {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      const next =
        current === AttendanceStatus.PRESENT
          ? AttendanceStatus.ABSENT_UNEXCUSED
          : AttendanceStatus.PRESENT;
      draft.set(childId, { status: next });
    },
    [draft],
  );

  const markAllPresent = useCallback(() => {
    const entries: DraftMap = {};
    for (const row of merged) {
      if (!row.entry) entries[row.child.id] = { status: AttendanceStatus.PRESENT };
    }
    if (Object.keys(entries).length === 0) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    draft.setMany(entries);
  }, [merged, draft]);

  const send = useCallback(async () => {
    if (!groupId || saving) return;
    const entries = merged
      .filter((row) => row.entry)
      .map((row) => ({
        childId: row.child.id,
        status: row.entry!.status,
        ...(row.entry!.arrivedAt ? { arrivedAt: row.entry!.arrivedAt } : {}),
        ...(row.entry!.leftAt ? { leftAt: row.entry!.leftAt } : {}),
        ...(row.entry!.note ? { note: row.entry!.note } : {}),
      }));

    if (entries.length === 0) return;

    setSaving(true);
    const result = await submit({
      key: `attendance:${groupId}:${date}`,
      path: '/attendance',
      body: { groupId, date, entries },
    });
    setSaving(false);

    if (result.error) {
      Alert.alert(t.common.error, result.error);
      return;
    }

    await draft.clear();
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (result.queued) {
      Alert.alert(t.sync.savedOffline, t.sync.queuedHint);
    } else {
      await board.refresh();
    }
  }, [groupId, saving, merged, submit, date, draft, board, t]);

  if (groups.loading && !groups.data) {
    return (
      <Screen scroll={false} style={{ paddingTop: insets.top + spacing.lg }}>
        <SkeletonList rows={6} />
      </Screen>
    );
  }

  if (groups.error && !groups.data) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.lg }}>
        <ErrorState message={groups.error} onRetry={groups.refresh} retryLabel={t.common.retry} />
      </Screen>
    );
  }

  const myGroups = groups.data ?? [];
  const activeGroup = myGroups.find((group) => group.id === groupId) ?? null;
  const submitted = board.data?.isSubmitted ?? false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <View
        style={{
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.line,
          gap: spacing.md,
        }}
      >
        <Row justify="space-between" align="flex-start">
          <Column gap={2}>
            <AppText variant="title">{t.attendance.title}</AppText>
            <AppText variant="caption" tone="muted">
              {t.common.today}, {shortDate(date)}
            </AppText>
          </Column>
          <Column gap={spacing.xs} style={{ alignItems: 'flex-end' }}>
            <Badge
              tone={submitted ? 'success' : 'warning'}
              dot
              label={submitted ? t.attendance.submitted : t.attendance.notSubmitted}
            />
            {board.stale ? <Badge tone="neutral" label={t.sync.staleData} /> : null}
          </Column>
        </Row>

        {myGroups.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row gap={spacing.sm}>
              {myGroups.map((group) => {
                const active = group.id === groupId;
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => setGroupId(group.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: radius.pill,
                      backgroundColor: active ? colors.brand : colors.surfaceMuted,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: active ? colors.brand : colors.line,
                    }}
                  >
                    <AppText
                      variant="caption"
                      weight="600"
                      style={{ color: active ? colors.brandContrast : colors.contentSecondary }}
                    >
                      {group.name} · {group._count.children}
                    </AppText>
                  </Pressable>
                );
              })}
            </Row>
          </ScrollView>
        ) : activeGroup ? (
          <AppText variant="label" tone="secondary">
            {activeGroup.name} · {activeGroup.branch.name}
          </AppText>
        ) : null}

        <SyncBar />
      </View>

      <Screen refreshing={board.refreshing} onRefresh={board.refresh}>
        {board.loading && !board.data ? (
          <SkeletonList rows={6} />
        ) : board.error && !board.data ? (
          <ErrorState message={board.error} onRetry={board.refresh} retryLabel={t.common.retry} />
        ) : (
          <>
            <HeroBanner
              eyebrow={activeGroup?.name ?? t.attendance.title}
              title={t.attendance.rate}
              value={percent(counts.rate)}
              hint={`${t.attendance.present} ${counts.present} · ${t.attendance.absent} ${counts.absent} · ${t.attendance.unmarked} ${counts.unmarked}`}
            />

            <Card>
              <Row gap={spacing.lg}>
                <RingStat percent={counts.rate} label={t.attendance.rate} size={92} />
                <Column gap={spacing.sm} style={{ flex: 1 }}>
                  <Row gap={spacing.sm}>
                    <MiniStat
                      label={t.attendance.present}
                      value={String(counts.present)}
                      tone="success"
                    />
                    <MiniStat
                      label={t.attendance.absent}
                      value={String(counts.absent)}
                      tone="danger"
                    />
                  </Row>
                  <Row gap={spacing.sm}>
                    <MiniStat label={t.common.total} value={String(counts.total)} />
                    <MiniStat
                      label={t.attendance.unmarked}
                      value={String(counts.unmarked)}
                      tone={counts.unmarked > 0 ? 'warning' : 'neutral'}
                    />
                  </Row>
                </Column>
              </Row>
            </Card>

            {counts.unmarked > 0 ? (
              <Button
                label={t.attendance.markAll}
                variant="secondary"
                onPress={markAllPresent}
                fullWidth
                icon={<Ionicons name="checkmark-done" size={18} color={colors.content} />}
              />
            ) : null}

            <Card padded={false}>
              {merged.map((row, index) => {
                const meta = row.entry ? ATTENDANCE_STATUS_META[row.entry.status] : null;
                const accent = meta ? toneColors(colors, meta.tone) : null;
                const isPresent = row.entry?.status === AttendanceStatus.PRESENT;

                return (
                  <View
                    key={row.child.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderBottomWidth: index === merged.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderBottomColor: colors.line,
                    }}
                  >
                    <Pressable
                      onPress={() => router.push(`/child/${row.child.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={row.child.fullName}
                    >
                      <Avatar
                        name={row.child.fullName}
                        size={42}
                        tone={meta?.tone ?? 'neutral'}
                      />
                    </Pressable>

                    <Pressable
                      style={{ flex: 1, gap: 2 }}
                      onPress={() => tapToggle(row.child.id, row.entry?.status)}
                      onLongPress={() =>
                        setSheetTarget({
                          childId: row.child.id,
                          fullName: row.child.fullName,
                          entry: row.entry,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={row.child.fullName}
                    >
                      <AppText variant="label" weight="600" numberOfLines={1}>
                        {row.child.fullName}
                      </AppText>
                      <Row gap={spacing.xs}>
                        <AppText
                          variant="caption"
                          tone={row.entry ? 'secondary' : 'muted'}
                          numberOfLines={1}
                        >
                          {row.entry
                            ? t.attendance.statuses[row.entry.status]
                            : t.attendance.unmarked}
                        </AppText>
                        {isPresent && row.entry?.arrivedAt ? (
                          <AppText variant="caption" tone="muted">
                            · {row.entry.arrivedAt}
                          </AppText>
                        ) : null}
                        {row.isLocal ? (
                          <Ionicons
                            name="ellipse"
                            size={6}
                            color={colors.warning}
                            style={{ alignSelf: 'center' }}
                          />
                        ) : null}
                      </Row>
                    </Pressable>

                    <Row gap={spacing.xs}>
                      <Pressable
                        onPress={() => tapToggle(row.child.id, row.entry?.status)}
                        accessibilityRole="button"
                        accessibilityLabel={t.attendance.present}
                        hitSlop={6}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: radius.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isPresent
                            ? toneColors(colors, 'success').bg
                            : colors.surfaceMuted,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: isPresent
                            ? toneColors(colors, 'success').fg
                            : colors.line,
                        }}
                      >
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={
                            isPresent ? toneColors(colors, 'success').fg : colors.contentMuted
                          }
                        />
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          setSheetTarget({
                            childId: row.child.id,
                            fullName: row.child.fullName,
                            entry: row.entry,
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={t.common.more}
                        hitSlop={6}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: radius.md,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor:
                            meta && !isPresent ? accent!.bg : colors.surfaceMuted,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: meta && !isPresent ? accent!.fg : colors.line,
                        }}
                      >
                        <Ionicons
                          name={meta && !isPresent ? meta.icon : 'ellipsis-horizontal'}
                          size={18}
                          color={
                            meta && !isPresent ? accent!.fg : colors.contentMuted
                          }
                        />
                      </Pressable>
                    </Row>
                  </View>
                );
              })}
            </Card>

            <AppText variant="caption" tone="muted" align="center">
              {t.attendance.unmarkedHint}
            </AppText>
          </>
        )}
      </Screen>

      {merged.length > 0 ? (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: insets.bottom + spacing.sm + 70,
            backgroundColor: colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.line,
          }}
        >
          <Button
            label={
              draft.dirty || !submitted
                ? submitted
                  ? t.attendance.resubmit
                  : t.attendance.submit
                : t.attendance.submitted
            }
            onPress={send}
            loading={saving}
            disabled={counts.total === 0 || (!draft.dirty && submitted)}
            size="lg"
            fullWidth
            icon={
              <Ionicons
                name={online ? 'cloud-upload-outline' : 'save-outline'}
                size={18}
                color={colors.brandContrast}
              />
            }
          />
        </View>
      ) : null}

      <StatusSheet
        target={sheetTarget}
        onClose={() => setSheetTarget(null)}
        onSave={(childId, entry) => draft.set(childId, entry)}
      />
    </View>
  );
}

/** Ta'tildagi bolalar davomat foiziga kirmaydi (TZ §8). */
function absentOnVacation(
  rows: readonly { entry?: { status: AttendanceStatus } | undefined }[],
): number {
  return rows.filter((row) => row.entry?.status === AttendanceStatus.ON_VACATION).length;
}
