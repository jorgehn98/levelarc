import { Cpu, MessageCircle, X } from 'lucide-react-native';
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

const ENTER_MS = 340;
const EXIT_MS = 200;

// Tiempo que NYX permanece visible si el jugador no interactúa. Aunque ahora bloquea el fondo, se
// retira sola para no dejar al jugador atrapado si no toca la X ni el bocadillo.
const AUTO_DISMISS_MS = 14_000;
const TAB_BAR_HEIGHT = 70;

// Overlay global de las apariciones de NYX. Es modal: oscurece y bloquea el fondo para que la
// aparición sea un momento claro del Sistema, no un peek que compite con la UI. El bocadillo lleva al
// chat (con contexto), la X cierra y si no haces nada se va sola tras AUTO_DISMISS_MS. La base del
// sprite queda justo en la línea superior de la tab bar.
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
  // Guard contra doble disparo (toque rápido en la tarjeta/X o auto-cierre solapado con un toque).
  const isClosing = useRef(false);

  // Sincroniza la aparición del store con la copia local y dispara la animación de entrada (desliza
  // desde la esquina con un leve rebote).
  useEffect(() => {
    if (!interjection) return;
    isClosing.current = false;
    setShown(interjection);
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1.03, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
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

  // Auto-cierre: mientras haya una aparición visible y el jugador no actúe, se retira sola. Si toca la
  // tarjeta o la X, animateOut marca isClosing y este timer (al vencer) cae en el guard, sin efecto.
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(handleClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [shown, handleClose]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value, 1),
    transform: [
      { translateY: (1 - Math.min(progress.value, 1)) * 28 },
      { scale: 0.96 + Math.min(progress.value, 1) * 0.04 },
    ],
  }));

  if (!shown) return null;

  const pose = getCharacterPose(shown.tone);
  const accent = pose.accent;

  return (
    <View style={styles.overlay}>
      <View style={styles.scrim} />
      <View style={[styles.dock, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}>
        <Animated.View style={[styles.stage, panelStyle]}>
          <Pressable
            accessibilityHint={t(language, 'systemChatTapToReply')}
            accessibilityLabel={t(language, 'systemChatLabel')}
            accessibilityRole="button"
            onPress={handleContinue}
            style={({ pressed }) => [styles.bubbleWrap, pressed && styles.pressed]}
          >
            <View style={[styles.bubble, { borderColor: accent }]}>
              <Pressable accessibilityLabel={t(language, 'close')} hitSlop={10} onPress={handleClose} style={styles.closeButton}>
                <X color={colors.brand.boneMuted} size={15} />
              </Pressable>

              <View style={styles.bubbleHeader}>
                <Text style={[styles.kicker, { color: accent }]}>{t(language, 'systemChatLabel')}</Text>
                {shown.fromAi ? (
                  <View style={[styles.aiBadge, { borderColor: accent }]}>
                    <Cpu color={accent} size={10} />
                    <Text style={[styles.aiBadgeText, { color: accent }]}>{t(language, 'systemMessageAiBadge')}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.text}>{shown.text}</Text>

              <View style={styles.hintRow}>
                <MessageCircle color={colors.brand.boneMuted} size={12} />
                <Text style={styles.hint}>{t(language, 'systemChatTapToReply')}</Text>
              </View>
            </View>
            <View style={[styles.tail, { borderTopColor: accent }]} />
          </Pressable>

          {/* Personaje de NYX: grande, centrada y apoyada justo sobre la barra de navegación. */}
          <View style={styles.character}>
            <View style={[styles.characterAura, { backgroundColor: accent }, shadows.rankGlow(accent)]} />
            <Image accessibilityIgnoresInvertColors resizeMode="contain" source={pose.source} style={styles.characterImage} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.64)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  // Anclado sobre la tab bar: la parte inferior del sprite coincide con su línea superior.
  dock: {
    alignItems: 'center',
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
  },
  stage: {
    alignItems: 'center',
    width: '100%',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  bubbleWrap: {
    alignItems: 'center',
    marginBottom: -4,
    width: '100%',
  },
  bubble: {
    backgroundColor: colors.background.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    maxWidth: 560,
    paddingHorizontal: 13,
    paddingVertical: 11,
    paddingRight: 26,
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    right: 7,
    top: 7,
  },
  bubbleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  kicker: {
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  aiBadge: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
  },
  text: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  hintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
  },
  hint: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  // Colita del bocadillo apuntando hacia abajo, al personaje.
  tail: {
    alignSelf: 'center',
    borderLeftColor: 'transparent',
    borderLeftWidth: 10,
    borderRightColor: 'transparent',
    borderRightWidth: 10,
    borderTopWidth: 12,
  },
  character: {
    alignItems: 'center',
    height: 286,
    justifyContent: 'flex-end',
    width: 216,
  },
  characterAura: {
    borderRadius: 92,
    bottom: 16,
    height: 176,
    opacity: 0.24,
    position: 'absolute',
    width: 176,
  },
  characterImage: {
    height: '100%',
    width: '100%',
  },
});
