import '../global.css';

import * as Updates from 'expo-updates';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, View } from 'react-native';

import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { colors } from '@/theme/colors';
import { useAppStore } from '@/stores/appStore';
import { t } from '@/i18n';
import { toDateKey } from '@/lib/date';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require('../assets/fonts/Inter-VariableFont.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter-VariableFont.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter-VariableFont.ttf'),
    Orbitron_500Medium: require('../assets/fonts/Orbitron-VariableFont.ttf'),
    Orbitron_700Bold: require('../assets/fonts/Orbitron-VariableFont.ttf'),
  });
  const boot = useAppStore((state) => state.boot);
  const closeMissedDays = useAppStore((state) => state.closeMissedDays);
  const refresh = useAppStore((state) => state.refresh);
  const isReady = useAppStore((state) => state.isReady);
  const language = useAppStore((state) => state.language);
  const player = useAppStore((state) => state.player);
  const pendingRankUp = useAppStore((state) => state.pendingRankUp);
  const consumeRankUp = useAppStore((state) => state.consumeRankUp);
  const pathname = usePathname();
  const router = useRouter();
  const [entryShown, setEntryShown] = useState(false);
  const [startupUpdateChecked, setStartupUpdateChecked] = useState(false);
  const activeDateKeyRef = useRef(toDateKey());

  useEffect(() => {
    if (fontsLoaded && !isReady) {
      void boot();
    }
  }, [boot, fontsLoaded, isReady]);

  useEffect(() => {
    if (!fontsLoaded || !isReady || startupUpdateChecked) return;

    setStartupUpdateChecked(true);

    async function checkStartupUpdate() {
      if (!Updates.isEnabled) return;

      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;

        await Updates.fetchUpdateAsync();
        Alert.alert(t(language, 'updateReady'), t(language, 'updateReadyCopy'), [
          { text: t(language, 'later'), style: 'cancel' },
          { text: t(language, 'restart'), onPress: () => void Updates.reloadAsync() },
        ]);
      } catch {
        // Startup checks should never block the app. Manual update remains in Settings.
      }
    }

    void checkStartupUpdate();
  }, [fontsLoaded, isReady, language, startupUpdateChecked]);

  useEffect(() => {
    if (!fontsLoaded || !isReady) return;

    function refreshIfLocalDayChanged() {
      const currentDateKey = toDateKey();
      if (currentDateKey === activeDateKeyRef.current) return;

      activeDateKeyRef.current = currentDateKey;
      void (async () => {
        await closeMissedDays();
        await refresh();
      })();
    }

    refreshIfLocalDayChanged();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshIfLocalDayChanged();
      }
    });
    const interval = setInterval(refreshIfLocalDayChanged, 60_000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [closeMissedDays, fontsLoaded, isReady, refresh]);

  useEffect(() => {
    if (!fontsLoaded || !isReady) return;

    if (pathname === '/onboarding') {
      if (!entryShown) {
        setEntryShown(true);
      }
      return;
    }

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

  // Dispara la cinemática de ascenso cuando una acción de juego sube el rango del jugador. El estado
  // parte de null y consumeRankUp lo devuelve a null antes de navegar, así que el efecto solo actúa
  // en la transición null → valor provocada por una acción real (nunca en boot ni en el primer render).
  // Si ya estamos en /rank-up (segundo salto encadenado sin cerrar la cinemática), no apilamos otra
  // pantalla: solo limpiamos el estado. El rango del jugador ya es el correcto.
  useEffect(() => {
    if (!pendingRankUp) return;
    const { from, to } = pendingRankUp;
    consumeRankUp();
    if (pathname === '/rank-up') return;
    router.push({ pathname: '/rank-up', params: { from, to } });
  }, [pendingRankUp, consumeRankUp, pathname, router]);

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
        <Stack.Screen name="shop" />
        <Stack.Screen name="achievements" />
      </Stack>
      <CelebrationOverlay />
    </>
  );
}
