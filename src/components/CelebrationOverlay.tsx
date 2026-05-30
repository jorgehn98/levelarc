import { Award, ChevronsUp, Trophy, type LucideIcon } from 'lucide-react-native';
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

import { t, type Language } from '@/i18n';
import { getHabitAttribute } from '@/lib/habitAttributes';
import { useAppStore, type Celebration } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';
import type { AttributeId } from '@/core/attributes';

const VISIBLE_MS = 2500;
const ENTER_MS = 320;
const EXIT_MS = 260;

// Identificador estable de inserción: la celebración no trae key propia y la cola podría repetir
// valores (p. ej. el mismo nivel), así que numeramos cada item al absorberlo del store.
type QueuedCelebration = { key: string; celebration: Celebration };

// Datos de presentación de cada variante: icono, color de acento y textos ya traducidos.
type CardContent = { icon: LucideIcon; accent: string; kicker: string; title: string; reward?: string };

function getCardContent(celebration: Celebration, language: Language): CardContent {
  switch (celebration.kind) {
    case 'achievement': {
      const name = t(language, celebration.id as Parameters<typeof t>[1]);
      return {
        icon: Trophy,
        accent: colors.brand.cyanCore,
        kicker: t(language, 'achievementUnlocked'),
        title: name,
        reward: t(language, 'essencePlus', { n: celebration.essenceReward }),
      };
    }
    case 'level':
      return {
        icon: ChevronsUp,
        accent: colors.brand.cyanCore,
        kicker: t(language, 'levelUpKicker'),
        title: t(language, 'levelUpTitle', { n: celebration.level }),
      };
    case 'attribute': {
      const attribute = getHabitAttribute(celebration.attribute as AttributeId);
      const attributeName = t(language, `attr_${attribute.id}` as Parameters<typeof t>[1]);
      return {
        icon: attribute.icon as LucideIcon,
        accent: attribute.color,
        kicker: t(language, 'attributeLevelKicker'),
        title: t(language, 'attributeLevelTitle', { attribute: attributeName, n: celebration.level }),
      };
    }
    default:
      return { icon: Award, accent: colors.brand.cyanCore, kicker: '', title: '' };
  }
}

// Overlay global de celebración. Observa el canal `celebrations` del store y muestra cada
// celebración (logro, subida de nivel, subida de atributo) en secuencia con una tarjeta flotante
// animada (Reanimated v4), vaciando el canal del store al absorberlo. Se monta una sola vez en
// app/_layout.tsx, encima del Stack, así aparece en cualquier pantalla.
export function CelebrationOverlay() {
  const language = useAppStore((state) => state.language);
  const celebrations = useAppStore((state) => state.celebrations);
  const consumeCelebrations = useAppStore((state) => state.consumeCelebrations);
  const insets = useSafeAreaInsets();

  // Cola local: copia de las celebraciones pendientes que esta animación está mostrando.
  // Desacoplarla del store evita re-disparar la secuencia si el store cambia a mitad de animación.
  const [queue, setQueue] = useState<QueuedCelebration[]>([]);
  const [current, setCurrent] = useState<QueuedCelebration | null>(null);
  const isRunning = useRef(false);
  const insertionCount = useRef(0);

  const progress = useSharedValue(0);

  // Absorbe nuevas celebraciones del store en la cola local y limpia el store de inmediato, para
  // que la misma acción no se procese dos veces. Si llegan más durante la animación, se acumulan.
  useEffect(() => {
    if (celebrations.length === 0) return;
    setQueue((prev) => [
      ...prev,
      ...celebrations.map((celebration) => ({ key: String(insertionCount.current++), celebration })),
    ]);
    consumeCelebrations();
  }, [celebrations, consumeCelebrations]);

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

  const content = getCardContent(current.celebration, language);
  const Icon = content.icon;

  return (
    <View pointerEvents="none" style={[styles.overlay, { top: insets.top + 10 }]}>
      <Animated.View style={[styles.card, { borderColor: content.accent }, shadows.rankGlow(content.accent), cardStyle]}>
        <View style={[styles.iconTile, { borderColor: content.accent, backgroundColor: `${content.accent}1A` }]}>
          <Icon color={content.accent} size={22} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.kicker, { color: content.accent }]}>{content.kicker}</Text>
          <Text numberOfLines={1} style={styles.name}>
            {content.title}
          </Text>
          {content.reward ? <Text style={styles.reward}>{content.reward}</Text> : null}
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
