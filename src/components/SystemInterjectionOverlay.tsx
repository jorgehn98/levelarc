import { ChevronRight, Cpu, MessageCircle, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { useAiStore } from '@/stores/aiStore';
import { colors, radii, shadows, typography } from '@/theme/colors';
import { getCharacterPose } from '@/components/systemCharacter';

const ENTER_MS = 360;
const EXIT_MS = 220;

// Overlay global de las "Apariciones del Sistema": el Sistema "asoma" por la parte INFERIOR de la
// pantalla con su personaje (placeholder = emblema) y un bocadillo, y el usuario decide Continuar
// (abre el chat con contexto) o Cerrar. Lee `interjection` del aiStore: si es null no renderiza nada.
// Se monta una sola vez en app/_layout.tsx, encima del Stack. Va ABAJO para no chocar con la
// CelebrationOverlay (toast arriba).
export function SystemInterjectionOverlay() {
  const language = useAppStore((state) => state.language);
  const interjection = useAiStore((state) => state.interjection);
  const dismissInterjection = useAiStore((state) => state.dismissInterjection);
  const continueFromInterjection = useAiStore((state) => state.continueFromInterjection);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Copia local de la aparición que esta animación está mostrando. Desacoplarla del store permite
  // animar la SALIDA aunque el store ya haya puesto interjection=null (dismiss/continue limpian el
  // estado al instante; nosotros seguimos pintando hasta que termina el fade de salida).
  const [shown, setShown] = useState<typeof interjection>(null);

  const progress = useSharedValue(0);
  // Guard contra doble disparo (toque rápido en Continuar/Cerrar mientras anima la salida).
  const isClosing = useRef(false);

  // Sincroniza la aparición del store con la copia local y dispara la animación de entrada.
  useEffect(() => {
    if (!interjection) return;
    isClosing.current = false;
    setShown(interjection);
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1.04, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
    );
  }, [interjection, progress]);

  const clearShown = useCallback(() => {
    setShown(null);
    isClosing.current = false;
  }, []);

  // Anima la salida (fade + caída) y, al terminar, ejecuta el efecto (dismiss/continue) en JS.
  const animateOut = useCallback(
    (after: () => void) => {
      if (isClosing.current) return;
      isClosing.current = true;
      progress.value = withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(clearShown)();
          runOnJS(after)();
        }
      });
    },
    [progress, clearShown],
  );

  const handleClose = useCallback(() => {
    animateOut(dismissInterjection);
  }, [animateOut, dismissInterjection]);

  const handleContinue = useCallback(() => {
    animateOut(() => {
      void (async () => {
        await continueFromInterjection();
        router.push('/system-chat');
      })();
    });
  }, [animateOut, continueFromInterjection, router]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value, 1) * 0.5,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value, 1),
    transform: [{ translateY: (1 - Math.min(progress.value, 1)) * 40 }, { scale: progress.value }],
  }));

  if (!shown) return null;

  const pose = getCharacterPose(shown.tone);
  const accent = pose.accent;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Scrim ligero: oscurece un poco el fondo y cierra al tocar fuera del panel. */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
      <Pressable accessibilityLabel={t(language, 'close')} onPress={handleClose} style={StyleSheet.absoluteFill} />

      <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={[styles.row, panelStyle]}>
          {/* Personaje: avatar circular (emblema placeholder o sprite) con glow del tono. */}
          <View style={[styles.avatar, { borderColor: accent }, shadows.rankGlow(accent)]}>
            <Image accessibilityIgnoresInvertColors resizeMode="contain" source={pose.source} style={styles.avatarImage} />
          </View>

          {/* Bocadillo con colita apuntando al personaje. */}
          <View style={styles.bubbleWrap}>
            <View style={[styles.tail, { borderRightColor: accent }]} />
            <View style={[styles.bubble, { borderColor: accent }]}>
              <Pressable accessibilityLabel={t(language, 'close')} hitSlop={8} onPress={handleClose} style={styles.closeButton}>
                <X color={colors.brand.boneMuted} size={16} />
              </Pressable>

              <View style={styles.bubbleHeader}>
                <Text style={[styles.kicker, { color: accent }]}>{t(language, 'systemChatLabel')}</Text>
                {shown.fromAi ? (
                  <View style={[styles.aiBadge, { borderColor: accent }]}>
                    <Cpu color={accent} size={11} />
                    <Text style={[styles.aiBadgeText, { color: accent }]}>{t(language, 'systemMessageAiBadge')}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.text}>{shown.text}</Text>

              <View style={styles.actions}>
                <Pressable
                  onPress={handleContinue}
                  style={({ pressed }) => [styles.primaryButton, { borderColor: accent }, pressed && styles.pressed]}
                >
                  <MessageCircle color={accent} size={16} />
                  <Text style={[styles.primaryLabel, { color: accent }]}>{t(language, 'continue')}</Text>
                  <ChevronRight color={accent} size={16} />
                </Pressable>
                <Pressable onPress={handleClose} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <Text style={styles.secondaryLabel}>{t(language, 'close')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: colors.background.voidDeep,
  },
  dock: {
    bottom: 0,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    maxWidth: 460,
    width: '100%',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.background.surfaceRaised,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1.5,
    height: AVATAR_SIZE,
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    width: AVATAR_SIZE,
  },
  avatarImage: {
    height: '78%',
    width: '78%',
  },
  bubbleWrap: {
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  tail: {
    alignSelf: 'flex-end',
    borderBottomColor: 'transparent',
    borderBottomWidth: 8,
    borderRightWidth: 10,
    borderTopColor: 'transparent',
    borderTopWidth: 8,
    marginBottom: 18,
  },
  bubble: {
    backgroundColor: colors.background.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: 14,
    paddingRight: 30,
  },
  closeButton: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  bubbleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  kicker: {
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  aiBadge: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
  },
  text: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  primaryLabel: {
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  secondaryLabel: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
});
