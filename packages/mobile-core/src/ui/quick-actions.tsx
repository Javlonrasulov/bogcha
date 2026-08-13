import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../theme/provider';
import { fontForWeight, radius, spacing } from '../theme/tokens';
import { AppText } from './primitives';

export type QuickActionIcon = ComponentProps<typeof Ionicons>['name'];

export interface QuickActionItem {
  key: string;
  label: string;
  icon: QuickActionIcon;
  /** Accent rang — `#00C853` kabi. */
  color: string;
  onPress: () => void;
}

/**
 * Tez amallar — Lider Manager Home uslubi:
 * gorizontal scroll, 76px kartalar, rangli ikon box.
 */
export function QuickActions({
  title,
  actions,
}: {
  title: string;
  actions: readonly QuickActionItem[];
}) {
  const { colors, elevation } = useTheme();

  if (actions.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" weight="800" style={{ fontSize: 14 }}>
        {title}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={86}
        snapToAlignment="start"
        contentContainerStyle={{
          gap: 10,
          paddingTop: 4,
          paddingBottom: 8,
          paddingRight: spacing.lg,
        }}
        style={{ marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg }}
      >
        {actions.map((action) => (
          <Pressable
            key={action.key}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            style={({ pressed }) => [
              {
                width: 76,
                paddingVertical: 14,
                paddingHorizontal: 6,
                borderRadius: 18,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.line,
                alignItems: 'center',
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              },
              elevation.sm,
            ]}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                backgroundColor: `${action.color}20`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={action.icon} size={18} color={action.color} />
            </View>
            <Text
              numberOfLines={2}
              style={{
                fontSize: 10,
                fontWeight: '700',
                fontFamily: fontForWeight('700'),
                color: colors.content,
                textAlign: 'center',
                lineHeight: 13,
              }}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
