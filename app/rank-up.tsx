import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { RankBadge } from '@/components/RankBadge';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

export default function RankUpScreen() {
  const player = useAppStore((state) => state.player);
  const rank = player?.rango ?? 'E';
  const accent = getRankAccent(rank);
  const pulse = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(reveal, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            duration: 1600,
            easing: Easing.inOut(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            duration: 1600,
            easing: Easing.inOut(Easing.cubic),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [pulse, reveal]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.18] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.42] });
  const revealScale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  return (
    <Screen>
      <View style={[styles.panel, { borderColor: accent }, shadows.rankGlow(accent)]}>
        <View style={styles.scanline} />
        <Animated.View style={[styles.ringOuter, { borderColor: accent, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
        <Animated.View style={[styles.ringInner, { borderColor: accent, opacity: ringOpacity }]} />
        <Animated.View style={[styles.content, { opacity: reveal, transform: [{ scale: revealScale }] }]}>
          <Text style={[styles.kicker, { color: accent }]}>◆ ASCENSO CONFIRMADO</Text>
          <View style={styles.rankWrap}>
            <View style={[styles.rankAura, { backgroundColor: accent }]} />
            <RankBadge glow rank={rank} size={124} />
          </View>
          <Text style={styles.title}>Nuevo rango</Text>
          <Text style={styles.copy}>El Sistema ha registrado tu progreso. Continúa la ascensión.</Text>
        </Animated.View>
        <View style={[styles.delta, { borderColor: `${accent}88` }]}>
          <Text style={styles.deltaLabel}>RANGO ACTUAL</Text>
          <Text style={[styles.deltaValue, { color: accent }]}>{rank}</Text>
        </View>
      </View>

      <Button icon={Sparkles} label="Continuar" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    padding: 22,
  },
  scanline: {
    backgroundColor: `${colors.brand.cyanCore}12`,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '42%',
  },
  ringOuter: {
    borderRadius: 999,
    borderWidth: 1,
    height: 260,
    position: 'absolute',
    width: 260,
  },
  ringInner: {
    borderRadius: 999,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 198,
    position: 'absolute',
    width: 198,
  },
  content: {
    alignItems: 'center',
  },
  kicker: {
    fontFamily: typography.font.displayMedium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  rankWrap: {
    marginVertical: 26,
    position: 'relative',
  },
  rankAura: {
    borderRadius: 999,
    bottom: -18,
    left: -18,
    opacity: 0.16,
    position: 'absolute',
    right: -18,
    top: -18,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 32,
    textAlign: 'center',
  },
  copy: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  delta: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deltaLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
  },
  deltaValue: {
    fontFamily: typography.font.displayBold,
    fontSize: 24,
    marginTop: 2,
  },
});
