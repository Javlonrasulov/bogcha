import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/provider';
import { heroGradient, radius, spacing } from '../theme/tokens';
import { AppText, Column, Row } from './primitives';

export interface HeroBannerProps {
  eyebrow?: string;
  title: string;
  value: string;
  hint?: string;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lider uslubidagi KPI hero: violet→gold gradient, diagonal stripe, oq matn.
 */
export function HeroBanner({ eyebrow, title, value, hint, footer, style }: HeroBannerProps) {
  const { elevation } = useTheme();

  return (
    <View
      style={[
        {
          borderRadius: radius.hero,
          overflow: 'hidden',
          ...elevation.brand,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[...heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: spacing.xl, minHeight: 132 }}
      >
        {/* Soft circle ornament */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: 'rgba(255,255,255,0.12)',
            top: -48,
            right: -32,
          }}
        />
        {/* Diagonal stripe overlay */}
        <View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFill,
            opacity: 0.12,
            transform: [{ rotate: '45deg' }, { scale: 1.6 }],
            backgroundColor: 'transparent',
            borderTopWidth: 28,
            borderTopColor: 'rgba(255,255,255,0.35)',
            borderBottomWidth: 14,
            borderBottomColor: 'rgba(255,255,255,0.15)',
          }}
        />

        <Column gap={spacing.sm}>
          {eyebrow ? (
            <AppText
              variant="caption"
              weight="700"
              style={{
                color: 'rgba(255,255,255,0.85)',
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}
            >
              {eyebrow}
            </AppText>
          ) : null}
          <AppText
            variant="label"
            weight="700"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {title}
          </AppText>
          <AppText
            variant="display"
            weight="900"
            style={{
              color: '#FFFFFF',
              fontSize: 28,
              lineHeight: 34,
            }}
          >
            {value}
          </AppText>
          {hint ? (
            <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {hint}
            </AppText>
          ) : null}
          {footer ? <Row style={{ marginTop: spacing.xs }}>{footer}</Row> : null}
        </Column>
      </LinearGradient>
    </View>
  );
}
