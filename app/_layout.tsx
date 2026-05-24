import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts as useInterFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { useFonts as useOrbitronFonts, Orbitron_500Medium, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/theme/colors';
import { useAppStore } from '@/stores/appStore';

export default function RootLayout() {
  const [interLoaded] = useInterFonts({ Inter_400Regular, Inter_500Medium });
  const [orbitronLoaded] = useOrbitronFonts({ Orbitron_500Medium, Orbitron_700Bold });
  const boot = useAppStore((state) => state.boot);
  const isReady = useAppStore((state) => state.isReady);

  useEffect(() => {
    if (interLoaded && orbitronLoaded && !isReady) {
      void boot();
    }
  }, [boot, interLoaded, isReady, orbitronLoaded]);

  if (!interLoaded || !orbitronLoaded || !isReady) {
    return (
      <View style={{ alignItems: 'center', backgroundColor: colors.background.void, flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand.cyanCore} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.void },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="habit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
        <Stack.Screen name="rank-up" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
