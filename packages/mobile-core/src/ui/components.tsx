import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/provider';
import {
  radius,
  spacing,
  toneColors,
  typeStyle,
  type ToneName,
} from '../theme/tokens';
import { AppText, Badge, Card, Column, ProgressBar, Row } from './primitives';

type IonIconName = ComponentProps<typeof Ionicons>['name'];

/* ─────────────────────────── Screen ─────────────────────────── */

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Har bir ekranning asosi: canvas foni, tortib yangilash, bir xil paddinglar. */
export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  padded = true,
  style,
}: ScreenProps) {
  const { colors } = useTheme();
  const base: ViewStyle = { flex: 1, backgroundColor: colors.canvas };
  const inner: ViewStyle = {
    padding: padded ? spacing.lg : 0,
    // Absolute tab bar (~88–110px) ostidan kontent chiqib ketmasin.
    paddingBottom: spacing['4xl'] + 96,
    gap: spacing.md,
  };

  if (!scroll) {
    return <View style={[base, padded ? { padding: spacing.lg } : null, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={base}
      contentContainerStyle={[inner, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/* ─────────────────────────── Section header ─────────────────────────── */

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Row justify="space-between" align="flex-end" style={{ marginTop: spacing.sm }}>
      <Column gap={2} style={{ flex: 1 }}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" weight="600" style={{ color: colors.contentSecondary }}>
            {subtitle}
          </AppText>
        ) : null}
      </Column>
      {action}
    </Row>
  );
}

/* ─────────────────────────── Stat card ─────────────────────────── */

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: ToneName;
  trend?: { value: number; label?: string };
  /** Emoji yoki oddiy matn ikon (eski uslub). */
  icon?: string;
  /** Tez amallar uslubidagi Ionicons (ustunlik beriladi). */
  ionIcon?: IonIconName;
  /** ionIcon rangi — `#00C853` kabi. */
  iconColor?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Dashboard uchun asosiy ko'rsatkich kartasi (TZ §5, §46). */
export function StatCard({
  label,
  value,
  hint,
  tone = 'brand',
  trend,
  icon,
  ionIcon,
  iconColor,
  compact = false,
  style,
}: StatCardProps) {
  const { colors } = useTheme();
  const accent = toneColors(colors, tone);
  const trendTone: ToneName = !trend ? 'neutral' : trend.value >= 0 ? 'success' : 'danger';
  const ionColor = iconColor ?? accent.fg;

  return (
    <Card
      style={[{ flex: 1, minWidth: 150, overflow: 'hidden' }, style]}
      padded={false}
    >
      {/* Kontent flex:1 — qatordagi kartalar teng balandlikda, chiziq pastga yopishadi. */}
      <View
        style={{
          flex: 1,
          padding: compact ? spacing.md : spacing.lg,
          gap: spacing.sm,
        }}
      >
        <Row justify="space-between" align="flex-start">
          <AppText variant="caption" tone="muted" numberOfLines={2} style={{ flex: 1 }}>
            {label}
          </AppText>
          {ionIcon ? (
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: `${ionColor}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={ionIcon} size={18} color={ionColor} />
            </View>
          ) : icon ? (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radius.sm,
                backgroundColor: accent.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14 }}>{icon}</Text>
            </View>
          ) : null}
        </Row>
        <AppText variant={compact ? 'heading' : 'title'} numberOfLines={1}>
          {value}
        </AppText>
        {trend ? (
          <Badge
            tone={trendTone}
            label={`${trend.value >= 0 ? '+' : ''}${trend.value.toFixed(1)}%${
              trend.label ? ` ${trend.label}` : ''
            }`}
          />
        ) : hint ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: accent.fg,
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
        }}
      />
    </Card>
  );
}

/** Ikki ustunli statistik to'r. */
export function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <Row gap={spacing.md} align="stretch" wrap>
      {children}
    </Row>
  );
}

/* ─────────────────────────── Mini stat ─────────────────────────── */

export function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: ToneName;
}) {
  const { colors } = useTheme();
  const accent = toneColors(colors, tone);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 96,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: accent.bg,
        gap: 2,
      }}
    >
      <Text style={[{ color: accent.fg }, typeStyle('title')]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[{ color: colors.contentSecondary }, typeStyle('caption')]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/**
 * «Shu oy» moliya bloki — zamonaviy layout:
 * 3 ta metric tile + bitta yig‘ilish progress + qarzdorlik.
 */
export function MonthFinanceCard({
  revenueLabel,
  revenue,
  expenseLabel,
  expense,
  profitLabel,
  profit,
  profitPositive,
  marginLabel,
  marginPercent,
  marginTone = 'success',
  collectionLabel,
  collectionRate,
  collectionTone = 'success',
  collectedLabel,
  collectedText,
  debtLabel,
  debt,
}: {
  revenueLabel: string;
  revenue: string;
  expenseLabel: string;
  expense: string;
  profitLabel: string;
  profit: string;
  profitPositive: boolean;
  marginLabel: string;
  marginPercent: number;
  marginTone?: ToneName;
  collectionLabel: string;
  collectionRate: number;
  collectionTone?: ToneName;
  collectedLabel: string;
  collectedText: string;
  debtLabel: string;
  debt: string;
}) {
  const { colors } = useTheme();
  const margin = toneColors(colors, marginTone);

  const tiles: Array<{ label: string; value: string; tone: ToneName }> = [
    { label: revenueLabel, value: revenue, tone: 'success' },
    { label: expenseLabel, value: expense, tone: 'warning' },
    { label: profitLabel, value: profit, tone: profitPositive ? 'success' : 'danger' },
  ];

  return (
    <Card>
      <Column gap={spacing.lg}>
        <Row justify="space-between" align="center">
          <Column gap={2} style={{ flex: 1 }}>
            <AppText
              variant="caption"
              weight="700"
              style={{ color: colors.contentSecondary }}
            >
              {marginLabel}
            </AppText>
            <AppText variant="title" weight="800" style={{ color: margin.fg }}>
              {Math.round(marginPercent)}%
            </AppText>
          </Column>
          <View
            style={{
              flex: 1.4,
              height: 10,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceMuted,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${Math.max(0, Math.min(100, marginPercent))}%`,
                borderRadius: radius.pill,
                backgroundColor: margin.fg,
              }}
            />
          </View>
        </Row>

        <Row gap={spacing.sm} align="stretch">
          {tiles.map((tile) => {
            const accent = toneColors(colors, tile.tone);
            return (
              <View
                key={tile.label}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.lg,
                  backgroundColor: accent.bg,
                  borderLeftWidth: 3,
                  borderLeftColor: accent.fg,
                  gap: 4,
                }}
              >
                <AppText
                  variant="caption"
                  weight="700"
                  numberOfLines={1}
                  style={{ color: colors.contentSecondary }}
                >
                  {tile.label}
                </AppText>
                <AppText
                  variant="label"
                  weight="800"
                  numberOfLines={1}
                  style={{ color: accent.fg, fontSize: 14 }}
                >
                  {tile.value}
                </AppText>
              </View>
            );
          })}
        </Row>

        <Column gap={spacing.sm}>
          <ProgressBar
            value={collectionRate}
            tone={collectionTone}
            label={collectionLabel}
            height={8}
          />
          <AppText
            variant="caption"
            weight="600"
            style={{ color: colors.contentSecondary }}
          >
            {collectedLabel}: {collectedText}
          </AppText>
        </Column>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: colors.dangerSoft,
          }}
        >
          <AppText variant="caption" weight="700" style={{ color: colors.danger }}>
            {debtLabel}
          </AppText>
          <AppText variant="label" weight="800" style={{ color: colors.danger }}>
            {debt}
          </AppText>
        </View>
      </Column>
    </Card>
  );
}

/* ─────────────────────────── List row ─────────────────────────── */

export interface ListRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  metaTone?: ToneName;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}

export function ListRow({
  title,
  subtitle,
  meta,
  metaTone = 'neutral',
  leading,
  trailing,
  onPress,
  last = false,
}: ListRowProps) {
  const { colors } = useTheme();
  const metaColor = toneColors(colors, metaTone).fg;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: colors.line,
        backgroundColor: pressed && onPress ? colors.surfaceMuted : 'transparent',
      })}
    >
      {leading}
      <Column gap={2} style={{ flex: 1 }}>
        <AppText variant="label" weight="600" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </Column>
      {meta ? (
        <Text style={[{ color: metaColor }, typeStyle('label', '600')]}>{meta}</Text>
      ) : null}
      {trailing}
    </Pressable>
  );
}

/** Ro'yxat qatorlarini bitta kartaga o'raydi. */
export function ListCard({ children }: { children: React.ReactNode }) {
  return <Card padded={false}>{children}</Card>;
}

/* ─────────────────────────── Segmented ─────────────────────────── */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        padding: 3,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceMuted,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.line,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.sm,
              alignItems: 'center',
              backgroundColor: active ? 'rgba(108,92,231,0.15)' : 'transparent',
            }}
          >
            <Text
              style={[
                typeStyle('caption', active ? '700' : '600'),
                {
                  color: active ? colors.brand : colors.contentSecondary,
                },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─────────────────────────── Input ─────────────────────────── */

export interface FieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  /** Maydon ichida o'ng tomonda ko'rsatiladigan tugma (masalan, parolni ko'rsatish). */
  trailing?: React.ReactNode;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, trailing, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Column gap={spacing.xs}>
      {label ? (
        <AppText variant="caption" tone="secondary" weight="600">
          {label}
        </AppText>
      ) : null}
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.contentMuted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            typeStyle('body', '600'),
            {
              height: 52,
              paddingHorizontal: spacing.lg,
              paddingRight: trailing ? 48 : spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: colors.surfaceMuted,
              borderWidth: focused || error ? 1.5 : StyleSheet.hairlineWidth,
              borderColor: error ? colors.danger : focused ? colors.brand : colors.line,
              color: colors.content,
            },
            style,
          ]}
          {...rest}
        />
        {trailing ? (
          <View style={{ position: 'absolute', right: spacing.sm }}>{trailing}</View>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </Column>
  );
});

/* ─────────────────────────── States ─────────────────────────── */

export function EmptyState({
  icon = '📭',
  ionIcon,
  iconColor = '#6C5CE7',
  title,
  description,
  action,
}: {
  icon?: string;
  ionIcon?: IonIconName;
  iconColor?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing['3xl'], gap: spacing.sm }}>
      {ionIcon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: `${iconColor}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={ionIcon} size={24} color={iconColor} />
        </View>
      ) : (
        <Text style={{ fontSize: 34 }}>{icon}</Text>
      )}
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" tone="muted" align="center">
          {description}
        </AppText>
      ) : null}
      {action}
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
  retryLabel = 'Qayta urinish',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.md, borderColor: colors.danger }}>
      <Row gap={spacing.sm} align="flex-start">
        <Text style={{ fontSize: 18 }}>⚠️</Text>
        <AppText variant="label" style={{ flex: 1 }}>
          {message}
        </AppText>
      </Row>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={{
            alignSelf: 'flex-start',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.sm,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <AppText variant="caption" tone="brand" weight="600">
            {retryLabel}
          </AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing['3xl'] }}>
      <ActivityIndicator color={colors.brand} />
      {label ? (
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
      ) : null}
    </Card>
  );
}

/** Yuklanish paytidagi joy egallovchi (shimmer) blok. */
export function Skeleton({
  height = 16,
  width = '100%',
  rounded = radius.sm,
}: {
  height?: number;
  width?: number | `${number}%`;
  rounded?: number;
}) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 780,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        height,
        width,
        borderRadius: rounded,
        backgroundColor: colors.surfaceMuted,
        opacity: pulse,
      }}
    />
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <Card style={{ gap: spacing.lg }}>
      {Array.from({ length: rows }).map((_, index) => (
        <Row key={index} gap={spacing.md}>
          <Skeleton height={40} width={40} rounded={radius.pill} />
          <Column gap={spacing.xs} style={{ flex: 1 }}>
            <Skeleton height={12} width="60%" />
            <Skeleton height={10} width="35%" />
          </Column>
        </Row>
      ))}
    </Card>
  );
}

/* ─────────────────────────── Banner ─────────────────────────── */

export function Banner({
  tone = 'info',
  icon,
  title,
  description,
  action,
}: {
  tone?: ToneName;
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const accent = toneColors(colors, tone);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: accent.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: accent.fg,
      }}
    >
      {icon ? <Text style={{ fontSize: 16 }}>{icon}</Text> : null}
      <Column gap={2} style={{ flex: 1 }}>
        <Text style={[{ color: accent.fg }, typeStyle('label', '700')]}>{title}</Text>
        {description ? (
          <Text style={[{ color: colors.contentSecondary }, typeStyle('caption')]}>
            {description}
          </Text>
        ) : null}
      </Column>
      {action}
    </View>
  );
}

/* ─────────────────────────── Key-value ─────────────────────────── */

export function KeyValue({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  return (
    <Row justify="space-between" gap={spacing.md}>
      <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText variant="label" weight="600" tone={tone}>
        {value}
      </AppText>
    </Row>
  );
}
