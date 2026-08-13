import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Column,
  EmptyState,
  ErrorState,
  Field,
  ListRow,
  MiniStat,
  Row,
  Screen,
  SkeletonList,
  ageInYears,
  spacing,
  useI18n,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import { ChildStatus, type GroupDetail, type MyGroup } from '@bogcha/shared';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STATUS_TONE = {
  [ChildStatus.ACTIVE]: 'success',
  [ChildStatus.ON_VACATION]: 'info',
  [ChildStatus.TEMPORARILY_ABSENT]: 'warning',
  [ChildStatus.WITHDRAWN]: 'danger',
} as const;

export default function ChildrenScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [groupId, setGroupId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const groups = useResource<MyGroup[]>('/groups/my', 'groups.my');
  const group = useResource<GroupDetail>(
    groupId ? `/groups/${groupId}` : null,
    groupId ? `group.${groupId}` : undefined,
  );

  useEffect(() => {
    if (!groupId && groups.data?.length) setGroupId(groups.data[0]!.id);
  }, [groups.data, groupId]);

  const children = useMemo(() => {
    const all = group.data?.children ?? [];
    const needle = query.trim().toLowerCase();
    const visible = all.filter((child) => child.status !== ChildStatus.WITHDRAWN);
    if (!needle) return visible;
    return visible.filter((child) =>
      `${child.lastName} ${child.firstName} ${child.middleName ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [group.data, query]);

  const stats = useMemo(() => {
    const all = (group.data?.children ?? []).filter(
      (child) => child.status !== ChildStatus.WITHDRAWN,
    );
    return {
      total: all.length,
      active: all.filter((child) => child.status === ChildStatus.ACTIVE).length,
      onVacation: all.filter((child) => child.status === ChildStatus.ON_VACATION).length,
      capacity: group.data?.capacity ?? 0,
    };
  }, [group.data]);

  if (groups.error && !groups.data) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.lg }}>
        <ErrorState message={groups.error} onRetry={groups.refresh} retryLabel={t.common.retry} />
      </Screen>
    );
  }

  const myGroups = groups.data ?? [];

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
        <AppText variant="title">{t.children.title}</AppText>

        {myGroups.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row gap={spacing.sm}>
              {myGroups.map((item) => {
                const active = item.id === groupId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => setGroupId(item.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: 999,
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
                      {item.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </Row>
          </ScrollView>
        ) : null}

        <Field
          value={query}
          onChangeText={setQuery}
          placeholder={t.common.search}
          autoCorrect={false}
          trailing={<Ionicons name="search" size={18} color={colors.contentMuted} />}
        />
      </View>

      <Screen refreshing={group.refreshing} onRefresh={group.refresh}>
        {group.loading && !group.data ? (
          <SkeletonList rows={8} />
        ) : group.error && !group.data ? (
          <ErrorState message={group.error} onRetry={group.refresh} retryLabel={t.common.retry} />
        ) : (
          <>
            <Card>
              <Column gap={spacing.md}>
                <Row justify="space-between">
                  <AppText variant="heading">{group.data?.name}</AppText>
                  <Badge
                    tone="brand"
                    label={`${stats.total}/${stats.capacity}`}
                  />
                </Row>
                <Row gap={spacing.sm}>
                  <MiniStat label={t.common.total} value={String(stats.total)} tone="brand" />
                  <MiniStat
                    label={t.children.statuses[ChildStatus.ACTIVE]}
                    value={String(stats.active)}
                    tone="success"
                  />
                  <MiniStat
                    label={t.children.statuses[ChildStatus.ON_VACATION]}
                    value={String(stats.onVacation)}
                    tone="info"
                  />
                </Row>
              </Column>
            </Card>

            {children.length === 0 ? (
              <EmptyState
                icon="🧒"
                title={t.common.empty}
                description={query ? t.common.search : t.common.emptyHint}
              />
            ) : (
              <Card padded={false}>
                {children.map((child, index) => (
                  <ListRow
                    key={child.id}
                    title={`${child.lastName} ${child.firstName}`}
                    subtitle={`${ageInYears(child.birthDate)} ${t.children.age} · ${
                      t.children.statuses[child.status]
                    }`}
                    leading={
                      <Avatar
                        name={`${child.lastName} ${child.firstName}`}
                        tone={STATUS_TONE[child.status]}
                      />
                    }
                    trailing={
                      <Ionicons name="chevron-forward" size={18} color={colors.contentMuted} />
                    }
                    last={index === children.length - 1}
                    onPress={() => router.push(`/child/${child.id}`)}
                  />
                ))}
              </Card>
            )}
          </>
        )}
      </Screen>
    </View>
  );
}
