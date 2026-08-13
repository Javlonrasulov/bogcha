import { Ionicons } from '@expo/vector-icons';
import { NotificationKind, NotificationSeverity } from '@bogcha/shared';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/provider';
import { radius, spacing, toneColors, type ToneName } from '../theme/tokens';
import { dateTime, relativeTime } from '../utils/format';
import { AppText } from './primitives';

type IonName = ComponentProps<typeof Ionicons>['name'];
type AccentTone = ToneName | 'gold';

const SEVERITY_TONE: Record<NotificationSeverity, ToneName> = {
  [NotificationSeverity.INFO]: 'info',
  [NotificationSeverity.WARNING]: 'warning',
  [NotificationSeverity.CRITICAL]: 'danger',
};

/** Lider Manager NotificationsScreen dagi typeMeta ga o‘xshash ikon/rang. */
function metaFor(
  kind: NotificationKind | string | undefined,
  severity: NotificationSeverity,
): { icon: IonName; tone: AccentTone } {
  switch (kind) {
    case NotificationKind.NEW_PURCHASE:
    case NotificationKind.PURCHASE_APPROVAL:
    case NotificationKind.PRICE_SPIKE:
      return { icon: 'cart-outline', tone: 'gold' };
    case NotificationKind.LOW_STOCK:
    case NotificationKind.ABNORMAL_CONSUMPTION:
      return { icon: 'cube-outline', tone: 'warning' };
    case NotificationKind.EXPENSE_SPIKE:
    case NotificationKind.BUDGET_EXCEEDED:
      return { icon: 'wallet-outline', tone: 'danger' };
    case NotificationKind.DEBT_ALERT:
    case NotificationKind.PAYMENT_DUE:
      return { icon: 'cash-outline', tone: 'success' };
    case NotificationKind.STAFF_LATE:
    case NotificationKind.ATTENDANCE_DROP:
      return { icon: 'people-outline', tone: 'brand' };
    case NotificationKind.SYSTEM:
      return { icon: 'notifications-outline', tone: 'brand' };
    default:
      return {
        icon:
          severity === NotificationSeverity.CRITICAL
            ? 'warning-outline'
            : severity === NotificationSeverity.WARNING
              ? 'alert-circle-outline'
              : 'information-circle-outline',
        tone: SEVERITY_TONE[severity] ?? 'info',
      };
  }
}

function resolveAccent(
  colors: ReturnType<typeof useTheme>['colors'],
  tone: AccentTone,
): { fg: string; bg: string } {
  if (tone === 'gold') {
    return { fg: colors.gold, bg: colors.warningSoft };
  }
  return toneColors(colors, tone);
}

export interface NotificationCardProps {
  title: string;
  message: string;
  createdAt: string;
  severity: NotificationSeverity;
  kind?: NotificationKind | string;
  unread?: boolean;
  /** Dashboard uchun ixcham: vaqt qatorisiz. */
  compact?: boolean;
  onPress?: () => void;
}

/**
 * Bildirishnoma kartasi — desktop Lider Manager NotificationsScreen uslubi:
 * yumshoq radius, unread uchun violet border/fon, 44px ikon box, unread nuqta.
 */
export function NotificationCard({
  title,
  message,
  createdAt,
  severity,
  kind,
  unread = false,
  compact = false,
  onPress,
}: NotificationCardProps) {
  const { colors, elevation, scheme } = useTheme();
  const meta = metaFor(kind, severity);
  const accent = resolveAccent(colors, meta.tone);

  const card = (
    <View
      style={[
        {
          borderRadius: radius.xl,
          padding: 14,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
          borderWidth: 1,
          borderColor: unread ? 'rgba(108,92,231,0.35)' : colors.line,
          backgroundColor: unread
            ? scheme === 'dark'
              ? 'rgba(108,92,231,0.18)'
              : 'rgba(108,92,231,0.08)'
            : colors.surface,
        },
        unread ? elevation.md : null,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: accent.bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={meta.icon} size={20} color={accent.fg} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: compact ? 4 : spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppText
            variant="label"
            weight="800"
            numberOfLines={compact ? 2 : 3}
            style={{ flex: 1, fontSize: 14, lineHeight: 19 }}
          >
            {title}
          </AppText>
          {unread ? (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                backgroundColor: colors.brand,
                shadowColor: colors.brand,
                shadowOpacity: 0.45,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 0 },
                elevation: 2,
                flexShrink: 0,
              }}
            />
          ) : null}
        </View>

        <AppText
          variant="caption"
          tone="secondary"
          numberOfLines={compact ? 2 : 3}
          style={{ fontSize: 13, lineHeight: 18 }}
          weight="600"
        >
          {message}
        </AppText>

        {!compact ? (
          <AppText variant="caption" tone="muted" weight="700" style={{ marginTop: 4, fontSize: 11 }}>
            {`${relativeTime(new Date(createdAt))} · ${dateTime(createdAt)}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {card}
    </Pressable>
  );
}
