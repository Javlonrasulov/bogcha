import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Row,
  radius,
  relativeTime,
  spacing,
  toneColors,
  useI18n,
  useSync,
  useTheme,
} from '@bogcha/mobile-core';
import { Pressable, StyleSheet } from 'react-native';

/**
 * Tarmoq va sinxronizatsiya holati. Tarbiyachi internet yo'qligini va
 * yuborilmagan yozuvlar borligini bir qarashda ko'radi (TZ §41).
 */
export function SyncBar() {
  const { online, pending, state, lastSyncedAt, sync } = useSync();
  const { colors } = useTheme();
  const { t } = useI18n();

  const tone = !online ? 'warning' : pending > 0 ? 'info' : 'success';
  const accent = toneColors(colors, tone);

  const label = !online
    ? t.sync.offline
    : state === 'syncing'
      ? t.sync.syncing
      : pending > 0
        ? `${pending} ${t.sync.pending.toLowerCase()}`
        : t.sync.online;

  const hint = !online
    ? t.sync.queuedHint
    : lastSyncedAt
      ? `${t.sync.lastSynced}: ${relativeTime(lastSyncedAt)}`
      : null;

  return (
    <Pressable
      onPress={() => void sync()}
      disabled={!online || pending === 0}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: accent.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: accent.fg,
      }}
    >
      <Ionicons
        name={!online ? 'cloud-offline-outline' : pending > 0 ? 'sync-outline' : 'cloud-done-outline'}
        size={16}
        color={accent.fg}
      />
      <Row gap={spacing.xs} style={{ flex: 1 }} wrap>
        <AppText variant="caption" weight="700" style={{ color: accent.fg }}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            · {hint}
          </AppText>
        ) : null}
      </Row>
      {online && pending > 0 ? (
        <AppText variant="caption" weight="700" style={{ color: accent.fg }}>
          {t.sync.syncNow}
        </AppText>
      ) : null}
    </Pressable>
  );
}
