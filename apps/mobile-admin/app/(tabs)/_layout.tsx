import { TabBarIcon, fonts, useI18n, useTheme } from '@bogcha/mobile-core';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom tab — Android edge-to-edge da system nav / home indicator
 * ustiga chiqmasligi uchun safe-area + minimal pastki padding.
 */
export default function TabsLayout() {
  const { colors, scheme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Emulator/ba'zi Android qurilmalarda insets.bottom = 0 bo‘lib qoladi,
  // lekin gesture/3-button bar hali ham joy egallaydi.
  const minBottom = Platform.OS === 'android' ? 28 : 12;
  const bottomPad = Math.max(insets.bottom, minBottom);
  const contentH = 52;
  const tabHeight = contentH + 8 + bottomPad;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: scheme === 'dark' ? '#6B6B9A' : '#9CA3AF',
          // Default safe-area qo‘shilmasin — o‘zimiz hisoblaymiz.
          safeAreaInsets: { bottom: 0 },
          tabBarStyle: {
            backgroundColor:
              scheme === 'dark' ? 'rgba(13,13,26,0.96)' : 'rgba(255,255,255,0.96)',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.line,
            height: tabHeight,
            paddingTop: 8,
            paddingBottom: bottomPad,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            elevation: 0,
            ...Platform.select({
              ios: {
                shadowColor: colors.brand,
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -4 },
              },
              android: { elevation: 16 },
              default: {},
            }),
          },
          tabBarItemStyle: {
            paddingBottom: 0,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: fonts.semiBold,
            fontWeight: '700',
            marginTop: 2,
            marginBottom: 0,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.dashboard.title,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="speedometer-outline" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            title: t.attendance.title,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="checkmark-done-outline" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: t.finance.title,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="cash-outline" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: t.inventory.title,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="cube-outline" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: t.common.more,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="grid-outline" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
