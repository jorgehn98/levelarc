import '../global.css';

import * as SystemUI from 'expo-system-ui';
import * as Updates from 'expo-updates';
import { Stack, usePathname, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, View } from 'react-native';

import { CelebrationOverlay } from '@/components/CelebrationOverlay';
import { SystemErrorScreen } from '@/components/SystemErrorScreen';
import { SystemInterjectionOverlay } from '@/components/SystemInterjectionOverlay';
import { colors } from '@/theme/colors';
import { useAiStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import { t } from '@/i18n';
import { toDateKey } from '@/lib/date';

void SystemUI.setBackgroundColorAsync(colors.background.surface);

// Convención de Expo Router: si el layout raíz (o una pantalla sin límite propio) lanza al
// renderizar, se muestra esto en lugar de una pantalla en blanco. `retry` vuelve a montar la ruta.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const language = useAppStore((state) => state.language);
  return (
    <SystemErrorScreen
      detail={error.message}
      language={language}
      message={t(language, 'renderErrorCopy')}
      onRetry={() => void retry()}
      title={t(language, 'renderErrorTitle')}
    />
  );
}

export default function RootLayout() {
  const [fontsLoadedOk, fontError] = useFonts({
    Inter_400Regular: require('../assets/fonts/Inter-VariableFont.ttf'),
    Inter_500Medium: require('../assets/fonts/Inter-VariableFont.ttf'),
    Inter_600SemiBold: require('../assets/fonts/Inter-VariableFont.ttf'),
    Orbitron_500Medium: require('../assets/fonts/Orbitron-VariableFont.ttf'),
    Orbitron_700Bold: require('../assets/fonts/Orbitron-VariableFont.ttf'),
  });
  // Si las fuentes no cargan, la app sigue con la fuente del sistema en vez de quedarse en el spinner.
  const fontsLoaded = fontsLoadedOk || Boolean(fontError);
  const boot = useAppStore((state) => state.boot);
  const bootError = useAppStore((state) => state.bootError);
  const interjectionVisible = useAiStore((state) => Boolean(state.interjection));
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

      // La marca se pone antes de esperar: el intervalo y la vuelta a primer plano no lanzan un
      // segundo cierre para el mismo día. Si falla, se retira para reintentar en el siguiente aviso.
      const previousDateKey = activeDateKeyRef.current;
      activeDateKeyRef.current = currentDateKey;
      closeMissedDays()
        .then(refresh)
        .catch(() => {
          activeDateKeyRef.current = previousDateKey;
        });
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

  if (bootError && !isReady) {
    return (
      <SystemErrorScreen
        detail={bootError}
        language={language}
        message={t(language, 'bootErrorCopy')}
        onRetry={() => void boot()}
        title={t(language, 'bootErrorTitle')}
      />
    );
  }

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
      {/* Con NYX en pantalla el fondo queda fuera del árbol de accesibilidad: en Android
          accessibilityViewIsModal no basta y TalkBack podía seguir leyendo la pantalla de detrás. */}
      <View
        accessibilityElementsHidden={interjectionVisible}
        importantForAccessibility={interjectionVisible ? 'no-hide-descendants' : 'auto'}
        style={{ flex: 1 }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.void },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="habit/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="habit/edit/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="onboarding" options={{ presentation: 'modal' }} />
          <Stack.Screen name="rank-up" options={{ presentation: 'modal' }} />
          <Stack.Screen name="shop" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="system-chat" />
          <Stack.Screen name="system-ai" />
        </Stack>
      </View>
      {/* Celebración: toast ARRIBA. Aparición del Sistema: panel ABAJO. No se solapan. */}
      <CelebrationOverlay />
      <SystemInterjectionOverlay />
    </>
  );
}
