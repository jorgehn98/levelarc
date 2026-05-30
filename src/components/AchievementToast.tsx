import { Trophy } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';

type ToastItem = { id: string; essenceReward: number };

const VISIBLE_MS = 2500;
const ENTER_MS = 320;
const EXIT_MS = 260;

// Overlay global de celebración. Observa recentlyUnlocked del store, muestra cada logro en
// secuencia con una tarjeta flotante animada (Reanimated v4) y vacía la cola al terminar.
// Se monta una sola vez en app/_layout.tsx, encima del Stack, así aparece en cualquier pantalla.
export function AchievementToast() {
  const language = useAppStore((state) => state.language);
  const recentlyUnlocked = useAppStore((state) => state.recentlyUnlocked);
  const consumeRecentAchievements = useAppStore((state) => state.consumeRecentAchievements);
  const insets = useSafeAreaInsets();

  // Cola local: copia de los pendientes que esta animación está mostrando. Desacoplarla del
  // store evita re-disparar la secuencia si el store cambia a mitad de animación.
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const isRunning = useRef(false);

  const progress = useSharedValue(0);

  // Absorbe nuevos logros del store en la cola local y limpia el store de inmediato, para que la
  // misma acción no se procese dos veces. Si llegan más durante la animación, se acumulan.
  useEffect(() => {
    if (recentlyUnlocked.length === 0) return;
    setQueue((prev) => [...prev, ...recentlyUnlocked]);
    consumeRecentAchievements();
  }, [recentlyUnlocked, consumeRecentAchievements]);

  const handleHidden = useCallback(() => {
    isRunning.current = false;
    setCurrent(null);
  }, []);

  // Saca el siguiente elemento de la cola y lanza su animación de entrada/permanencia/salida.
  useEffect(() => {
    if (isRunning.current || current !== null || queue.length === 0) return;

    const [next, ...rest] = queue;
    isRunning.current = true;
    setQueue(rest);
    setCurrent(next);
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }),
      withDelay(
        VISIBLE_MS,
        withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
          if (finished) runOnJS(handleHidden)();
        }),
      ),
    );
  }, [queue, current, progress, handleHidden]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: -24 + progress.value * 24 }],
  }));

  if (!current) return null;

  const name = t(language, current.id as Parameters<typeof t>[1]);

  return (
    <View pointerEvents="none" style={[styles.overlay, { top: insets.top + 10 }]}>
      <Animated.View style={[styles.card, shadows.rankGlow(colors.brand.cyanCore), cardStyle]}>
        <View style={styles.iconTile}>
          <Trophy color={colors.brand.cyanCore} size={22} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.kicker}>{t(language, 'achievementUnlocked')}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text style={styles.reward}>{t(language, 'essencePlus', { n: current.essenceReward })}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1000,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.background.surfaceRaised,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '90%',
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}1A`,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
    marginTop: 3,
  },
  reward: {
    color: colors.state.completed,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    marginTop: 3,
  },
});
