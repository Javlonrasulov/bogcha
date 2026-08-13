import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Badge,
  Column,
  IconButton,
  Row,
  radius,
  spacing,
  useI18n,
  useRealtime,
  useTheme,
} from '@bogcha/mobile-core';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBranch } from '../branch-context';

/**
 * Ekran sarlavhasi: nom, filial tanlovi va bildirishnoma tugmasi.
 * Barcha admin ekranlarida bir xil ko'rinish beradi (TZ §34).
 */
export function ScreenHeader({
  title,
  subtitle,
  showBranchPicker = true,
  unreadCount,
  trailing,
}: {
  title: string;
  subtitle?: string;
  showBranchPicker?: boolean;
  unreadCount?: number;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { branches, branchId, setBranchId } = useBranch();
  const { connected } = useRealtime();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const chips: Array<{ id: string | null; label: string }> = [
    { id: null, label: t.common.allBranches },
    ...branches.map((branch) => ({ id: branch.id, label: branch.name })),
  ];

  return (
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
      <Row justify="space-between" align="flex-start" gap={spacing.md}>
        <Column gap={2} style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <Row gap={spacing.xs} align="center">
              {/* Jonli ulanish indikatori — ma'lumot o'zi yangilanayotganini bildiradi. */}
              {connected ? (
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: colors.success,
                  }}
                />
              ) : null}
              <AppText variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                {subtitle}
              </AppText>
            </Row>
          ) : null}
        </Column>
        {trailing}
        {unreadCount === undefined ? null : (
          <View>
            <IconButton
              accessibilityLabel={t.notifications.title}
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color={colors.contentSecondary} />
            </IconButton>
            {unreadCount > 0 ? (
              <View style={{ position: 'absolute', top: 2, right: 2 }}>
                <Badge tone="danger" label={unreadCount > 9 ? '9+' : String(unreadCount)} />
              </View>
            ) : null}
          </View>
        )}
      </Row>

      {showBranchPicker && branches.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row gap={spacing.sm}>
            {chips.map((chip) => {
              const active = chip.id === branchId;
              return (
                <Pressable
                  key={chip.id ?? 'all'}
                  onPress={() => setBranchId(chip.id)}
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
                    {chip.label}
                  </AppText>
                </Pressable>
              );
            })}
          </Row>
        </ScrollView>
      ) : null}
    </View>
  );
}
