import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { lightPalette } from './tokens';

/** Inter shriftlari — Lider Manager APK (`family=Inter`) bilan bir xil. */
export function FontGate({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: lightPalette.canvas,
        }}
      >
        <ActivityIndicator size="large" color={lightPalette.brand} />
      </View>
    );
  }

  return <>{children}</>;
}
