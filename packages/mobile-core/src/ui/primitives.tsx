import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/provider';
import {
  brandGradient,
  fonts,
  fontStyleForWeight,
  radius,
  spacing,
  toneColors,
  typography,
  type Palette,
  type ToneName,
} from '../theme/tokens';

/* ─────────────────────────── Text ─────────────────────────── */

export type TextTone =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger';

export interface AppTextProps {
  children?: React.ReactNode;
  variant?: keyof typeof typography;
  tone?: TextTone;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

function textColor(colors: Palette, tone: TextTone): string {
  switch (tone) {
    case 'secondary':
      return colors.contentSecondary;
    case 'muted':
      return colors.contentMuted;
    case 'inverse':
      return colors.contentInverse;
    case 'brand':
      return colors.brand;
    case 'success':
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'danger':
      return colors.danger;
    default:
      return colors.content;
  }
}

export function AppText({
  children,
  variant = 'body',
  tone = 'default',
  weight,
  align,
  numberOfLines,
  style,
}: AppTextProps) {
  const { colors } = useTheme();
  const base = typography[variant];
  const flat = StyleSheet.flatten(style);
  const resolvedWeight = weight ?? flat?.fontWeight ?? base.fontWeight;
  const { fontWeight: _ignoredWeight, fontFamily: _ignoredFamily, ...restStyle } = flat ?? {};

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: base.fontSize,
          lineHeight: base.lineHeight,
          letterSpacing: 'letterSpacing' in base ? base.letterSpacing : undefined,
          color: textColor(colors, tone),
          ...fontStyleForWeight(resolvedWeight),
        },
        align ? { textAlign: align } : null,
        restStyle,
      ]}
    >
      {children}
    </Text>
  );
}

/* ─────────────────────────── Card ─────────────────────────── */

export interface CardProps {
  children: React.ReactNode;
  padded?: boolean;
  surface?: 'default' | 'muted' | 'accent';
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  padded = true,
  surface = 'default',
  raised = false,
  style,
}: CardProps) {
  const { colors, elevation } = useTheme();
  const background =
    surface === 'muted'
      ? colors.surfaceMuted
      : surface === 'accent'
        ? colors.canvasAccent
        : colors.surface;

  return (
    <View
      style={[
        {
          backgroundColor: background,
          borderRadius: radius.xl,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
          padding: padded ? spacing.lg : 0,
        },
        raised ? elevation.md : elevation.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ─────────────────────────── Badge ─────────────────────────── */

export function Badge({
  label,
  tone = 'neutral',
  dot = false,
}: {
  label: string;
  tone?: ToneName;
  dot?: boolean;
}) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        backgroundColor: bg,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.pill,
      }}
    >
      {dot ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />
      ) : null}
      <Text
        style={{
          fontSize: typography.caption.fontSize,
          lineHeight: typography.caption.lineHeight,
          color: fg,
          ...fontStyleForWeight('700'),
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────────────── Button ─────────────────────────── */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const BUTTON_HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 54 };

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, elevation } = useTheme();
  const isDisabled = Boolean(disabled) || loading;

  const surfaces: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.brand, fg: colors.brandContrast, border: 'transparent' },
    secondary: { bg: colors.surfaceMuted, fg: colors.content, border: colors.line },
    ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#ffffff', border: colors.danger },
    success: { bg: colors.success, fg: '#ffffff', border: colors.success },
  };
  const tone = surfaces[variant];
  const height = BUTTON_HEIGHT[size];
  const labelSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : (
        <>
          {icon}
          <Text
            style={{
              color: tone.fg,
              fontSize: labelSize,
              ...fontStyleForWeight('600'),
            }}
          >
            {label}
          </Text>
        </>
      )}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          height,
          borderRadius: radius.lg,
          overflow: 'hidden',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        variant === 'primary' ? elevation.brand : null,
        style,
      ]}
      {...rest}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[...brandGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            height,
            paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={{
            flex: 1,
            height,
            paddingHorizontal: size === 'sm' ? spacing.md : spacing.lg,
            backgroundColor: tone.bg,
            borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
            borderColor: tone.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
}

/** Faqat ikonkadan iborat tugma — sarlavhalar va maydon ichidagi amallar uchun. */
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  size = 36,
  tone = 'neutral',
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  tone?: ToneName;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const { bg } = toneColors(colors, tone);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'neutral' ? colors.surfaceMuted : bg,
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

/* ─────────────────────────── Layout ─────────────────────────── */

export function Row({
  children,
  gap = spacing.sm,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap,
          flexWrap: wrap ? 'wrap' : 'nowrap',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Column({
  children,
  gap = spacing.sm,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

export function Divider({ spacingY = 0 }: { spacingY?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.line,
        marginVertical: spacingY,
      }}
    />
  );
}

export function Spacer({ size = spacing.md }: { size?: number }) {
  return <View style={{ height: size }} />;
}

/* ─────────────────────────── Avatar ─────────────────────────── */

export function Avatar({
  name,
  size = 40,
  tone = 'brand',
}: {
  name: string;
  size?: number;
  tone?: ToneName;
}) {
  const { colors } = useTheme();
  const { fg, bg } = toneColors(colors, tone);
  const label = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.35,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: fg,
          ...fontStyleForWeight('700'),
          fontSize: size * 0.36,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────────────── Progress ─────────────────────────── */

export function ProgressBar({
  value,
  tone = 'brand',
  height = 8,
  label,
}: {
  value: number;
  tone?: ToneName;
  height?: number;
  /** Berilsa, chizma ustida sarlavha va foiz ko'rsatiladi. */
  label?: string;
}) {
  const { colors } = useTheme();
  const { fg } = toneColors(colors, tone);
  const clamped = Math.max(0, Math.min(100, value));

  const bar = (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: fg,
        }}
      />
    </View>
  );

  if (!label) return bar;

  return (
    <Column gap={spacing.xs}>
      <Row justify="space-between" gap={spacing.sm}>
        <Text
          style={{
            fontSize: typography.caption.fontSize,
            color: colors.content,
            flex: 1,
            ...fontStyleForWeight('700'),
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: typography.label.fontSize,
            color: fg,
            ...fontStyleForWeight('800'),
          }}
        >
          {Math.round(clamped)}%
        </Text>
      </Row>
      {bar}
    </Column>
  );
}
