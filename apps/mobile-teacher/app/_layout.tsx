import { AppProviders, fonts, useAuth, useTheme } from '@bogcha/mobile-core';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { API_URL } from '../src/config';

/** Sessiya holatiga qarab login yoki asosiy ekranga yo'naltiradi. */
function AuthGate() {
  const { user, loading } = useAuth();
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
      <Stack.Screen name="child/[id]" options={{ title: 'Bola profili' }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProviders baseUrl={API_URL}>
        <ThemedStatusBar />
        <AuthGate />
      </AppProviders>
    </SafeAreaProvider>
  );
}
