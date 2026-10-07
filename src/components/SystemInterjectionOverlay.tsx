import { Cpu, MessageCircle, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
// El icono de cerrar mide 15 pt: con este hitSlop el área táctil llega a 45 pt.
const CLOSE_HIT_SLOP = 15;

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

  // Identidad de la aparición: `createdAt` no cambia cuando el texto de plantilla se sustituye por el
  // del LLM. Entrada y auto-cierre dependen de ella y no del objeto entero; antes, al llegar el texto
  // de IA, la entrada se repetía y los 14 s volvían a empezar.
  const interjectionId = interjection?.createdAt ?? null;
  const shownId = shown?.createdAt ?? null;

  // Mantiene la copia local al día (incluido el cambio de texto/fromAi, sin reanimar). Si el store
  // retira la aparición por su cuenta (reset de datos) sin pasar por la salida animada, se quita.
  useEffect(() => {
    if (interjection) setShown(interjection);
    else if (!isClosing.current) setShown(null);
  }, [interjection]);

  // Animación de entrada (sube con un leve rebote): solo cuando empieza una aparición NUEVA.
  useEffect(() => {
    if (!interjectionId) return;
    isClosing.current = false;
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1.03, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
    );
  }, [interjectionId, progress]);

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
    if (!shownId) return;
    const timer = setTimeout(handleClose, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [shownId, handleClose]);

  // Atrás de Android: el overlay es una View sobre el Stack, no una ruta. Sin esto, "atrás" navegaba
  // la pantalla de detrás del velo y NYX seguía encima. Mientras está visible, atrás la cierra.
  useEffect(() => {
    if (!shownId) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => subscription.remove();
  }, [shownId, handleClose]);

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
    <View accessibilityViewIsModal onAccessibilityEscape={handleClose} style={styles.overlay}>
      <View style={styles.scrim} />
      <View style={[styles.dock, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}>
        <Animated.View style={[styles.stage, panelStyle]}>
          {/* La X es HERMANA del bocadillo, no hija: un botón accesible dentro de otro no es
              alcanzable con lector de pantalla. */}
          <View style={styles.bubbleWrap}>
            <Pressable
              accessibilityHint={t(language, 'systemChatTapToReply')}
              accessibilityLabel={`${t(language, 'systemChatLabel')}. ${shown.text}`}
              accessibilityRole="button"
              onPress={handleContinue}
              style={({ pressed }) => [styles.bubbleButton, pressed && styles.pressed]}
            >
              <View style={[styles.bubble, { borderColor: accent }]}>
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

            <Pressable
              accessibilityLabel={t(language, 'close')}
              accessibilityRole="button"
              hitSlop={CLOSE_HIT_SLOP}
              onPress={handleClose}
              style={styles.closeButton}
            >
              <X color={colors.brand.boneMuted} size={15} />
            </Pressable>
          </View>

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
  // El ancho máximo vive aquí (antes en `bubble`) para que la X, ahora hermana del bocadillo, siga
  // anclada a su esquina también en pantallas anchas.
  bubbleWrap: {
    marginBottom: -4,
    maxWidth: 560,
    width: '100%',
  },
  bubbleButton: {
    alignItems: 'center',
    width: '100%',
  },
  bubble: {
    backgroundColor: colors.background.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
    paddingRight: 26,
    width: '100%',
  },
  // 8 = los 7 de antes + 1 del borde del bocadillo, del que ya no es hija.
  closeButton: {
    position: 'absolute',
    right: 8,
    top: 8,
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
