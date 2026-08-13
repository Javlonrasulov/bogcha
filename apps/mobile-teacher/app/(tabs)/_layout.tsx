import { DemoBanner, TabBarIcon, fonts, useI18n, useTheme } from '@bogcha/mobile-core';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { colors, scheme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  const tabHeight = 62 + bottomPad;

  return (
    <View style={{ flex: 1 }}>
      <DemoBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: scheme === 'dark' ? '#6B6B9A' : '#9CA3AF',
          tabBarStyle: {
            backgroundColor:
              scheme === 'dark' ? 'rgba(13,13,26,0.94)' : 'rgba(255,255,255,0.94)',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.line,
            height: tabHeight,
            paddingTop: 8,
            paddingBottom: bottomPad,
            position: 'absolute',
            ...Platform.select({
              ios: {
                shadowColor: colors.brand,
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -4 },
              },
              android: { elevation: 12 },
              default: {},
            }),
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: fonts.semiBold,
            fontWeight: '700',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t.attendance.title,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="checkmark-done-outline" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="children"
          options={{
            title: t.children.title,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="people-outline" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t.settings.account,
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name="person-circle-outline" color={color} focused={focused} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
