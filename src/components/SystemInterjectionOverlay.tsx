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

// Tiempo que NYX permanece visible si el jugador no interactúa. Es un "peek" efímero: aparece en la
// esquina, dice lo suyo y se retira sola para no estorbar. Suficiente para leer 1-2 frases.
const AUTO_DISMISS_MS = 14_000;

// Overlay global de las apariciones de NYX. CLAVE de diseño: NO es un modal. Asoma en la ESQUINA
// inferior derecha, SIN scrim y SIN capturar los toques de fuera (pointerEvents="box-none" en todos
// los contenedores), así que el jugador puede seguir usando la app mientras NYX está en pantalla.
// Toda la tarjeta lleva al chat (con contexto); la X la cierra; y si no haces nada, se va sola tras
// AUTO_DISMISS_MS. Se monta una vez en app/_layout.tsx, encima del Stack. Lee `interjection` del
// aiStore: si es null no renderiza nada.
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
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Sin scrim ni capa de cierre: los toques de fuera de la tarjeta pasan a la app (no bloquea). */}
      <View pointerEvents="box-none" style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <Animated.View style={panelStyle}>
          <Pressable
            accessibilityHint={t(language, 'systemChatTapToReply')}
            accessibilityLabel={t(language, 'systemChatLabel')}
            accessibilityRole="button"
            onPress={handleContinue}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            {/* Bocadillo compacto a la izquierda, con colita apuntando a la derecha (al personaje). */}
            <View style={styles.bubbleWrap}>
              <View style={[styles.bubble, { borderColor: accent }]}>
                <Pressable
                  accessibilityLabel={t(language, 'close')}
                  hitSlop={10}
                  onPress={handleClose}
                  style={styles.closeButton}
                >
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
              <View style={[styles.tail, { borderLeftColor: accent }]} />
            </View>

            {/* Personaje de NYX: asoma en la esquina derecha con un aura del tono. */}
            <View style={styles.character}>
              <View style={[styles.characterAura, { backgroundColor: accent }, shadows.rankGlow(accent)]} />
              <Image accessibilityIgnoresInvertColors resizeMode="contain" source={pose.source} style={styles.characterImage} />
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Anclado abajo a la DERECHA: la tarjeta es un peek de esquina, no un panel centrado.
  dock: {
    bottom: 0,
    paddingHorizontal: 14,
    position: 'absolute',
    right: 0,
  },
  row: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 2,
    maxWidth: 340,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  bubbleWrap: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexShrink: 1,
    minWidth: 0,
  },
  bubble: {
    backgroundColor: colors.background.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingHorizontal: 13,
    paddingVertical: 11,
    paddingRight: 26,
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
  // Colita del bocadillo apuntando a la derecha (hacia el personaje).
  tail: {
    alignSelf: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 7,
    borderLeftWidth: 9,
    borderTopColor: 'transparent',
    borderTopWidth: 7,
  },
  character: {
    alignItems: 'center',
    height: 116,
    justifyContent: 'flex-end',
    marginBottom: 2,
    width: 92,
  },
  characterAura: {
    borderRadius: 38,
    bottom: 8,
    height: 70,
    opacity: 0.22,
    position: 'absolute',
    width: 70,
  },
  characterImage: {
    height: '100%',
    width: '100%',
  },
});
