import { AppProviders, fonts, useAuth, useI18n, useTheme } from '@bogcha/mobile-core';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BranchProvider } from '../src/branch-context';
import { API_URL } from '../src/config';

function AuthGate() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    const onLogin = pathname === '/login';
    if (!user && !onLogin) router.replace('/login');
    if (user && onLogin) router.replace('/');
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.canvas, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <BranchProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: {
            color: colors.content,
            fontSize: 17,
            fontFamily: fonts.semiBold,
            fontWeight: '400',
          },
          headerTintColor: colors.brand,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="children/index" options={{ title: t.children.title }} />
        <Stack.Screen name="children/[id]" options={{ title: t.children.profile }} />
        <Stack.Screen name="payments" options={{ title: t.finance.payments }} />
        <Stack.Screen name="debts" options={{ title: t.finance.debts }} />
        <Stack.Screen name="notifications" options={{ title: t.notifications.title }} />
        <Stack.Screen name="food-consumption/index" options={{ title: t.foodConsumption.title }} />
        <Stack.Screen name="food-consumption/daily" options={{ title: t.foodConsumption.dailyTable }} />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
      </Stack>
    </BranchProvider>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders baseUrl={API_URL} demoProfile="admin">
        <ThemedStatusBar />
        <AuthGate />
      </AppProviders>
    </SafeAreaProvider>
  );
}
