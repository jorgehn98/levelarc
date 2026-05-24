import '../global.css';

import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/theme/colors';
import { useAppStore } from '@/stores/appStore';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require('../assets/fonts/Inter-VariableFont.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter-VariableFont.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter-VariableFont.ttf'),
    Orbitron_500Medium: require('../assets/fonts/Orbitron-VariableFont.ttf'),
    Orbitron_700Bold: require('../assets/fonts/Orbitron-VariableFont.ttf'),
  });
  const boot = useAppStore((state) => state.boot);
  const isReady = useAppStore((state) => state.isReady);
  const player = useAppStore((state) => state.player);
  const pathname = usePathname();
  const router = useRouter();
  const [entryShown, setEntryShown] = useState(false);

  useEffect(() => {
    if (fontsLoaded && !isReady) {
      void boot();
    }
  }, [boot, fontsLoaded, isReady]);

  useEffect(() => {
    if (!fontsLoaded || !isReady || pathname === '/onboarding') return;

    if (!player?.nombre?.trim()) {
      setEntryShown(true);
      router.replace('/onboarding');
      return;
    }

    if (!entryShown) {
      setEntryShown(true);
      router.replace('/onboarding');
    }
  }, [entryShown, fontsLoaded, isReady, pathname, player?.nombre, router]);

  if (!fontsLoaded || !isReady) {
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
