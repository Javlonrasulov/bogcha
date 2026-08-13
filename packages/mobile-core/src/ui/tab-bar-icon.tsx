import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';
import { useTheme } from '../theme/provider';
import { radius } from '../theme/tokens';

/** Lider uslubidagi tab ikonka — active da violet soft well. */
export function TabBarIcon({
  name,
  color,
  focused,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
  focused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: focused ? 50 : 40,
        height: 36,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? 'rgba(108,92,231,0.15)' : 'transparent',
      }}
    >
      <Ionicons name={name} size={20} color={(focused ? colors.brand : color) as string} />
    </View>
  );
}
