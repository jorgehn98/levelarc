import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { RankBadge } from '@/components/RankBadge';
import { Screen } from '@/components/Screen';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

export default function RankUpScreen() {
  const player = useAppStore((state) => state.player);
  const language = useAppStore((state) => state.language);
  const rank = player?.rango ?? 'E';
  const accent = getRankAccent(rank);
  const pulse = useSharedValue(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [pulse, reveal]);

  const ringOuterStyle = useAnimatedStyle(() => ({
    opacity: 0.14 + pulse.value * 0.28,
    transform: [{ scale: 0.92 + pulse.value * 0.26 }],
  }));
  const ringInnerStyle = useAnimatedStyle(() => ({
    opacity: 0.14 + pulse.value * 0.28,
  }));
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ scale: 0.88 + reveal.value * 0.12 }],
  }));

  return (
    <Screen>
      <View style={[styles.panel, { borderColor: accent }, shadows.rankGlow(accent)]}>
        <View style={styles.scanline} />
        <Animated.View style={[styles.ringOuter, { borderColor: accent }, ringOuterStyle]} />
        <Animated.View style={[styles.ringInner, { borderColor: accent }, ringInnerStyle]} />
        <Animated.View style={[styles.content, revealStyle]}>
          <Text style={[styles.kicker, { color: accent }]}>◆ {t(language, 'ascensionConfirmed')}</Text>
          <View style={styles.rankWrap}>
            <View style={[styles.rankAura, { backgroundColor: accent }]} />
            <RankBadge glow rank={rank} size={124} />
          </View>
          <Text style={styles.title}>{t(language, 'newRank')}</Text>
          <Text style={styles.copy}>{t(language, 'rankUpCopy')}</Text>
        </Animated.View>
        <View style={[styles.delta, { borderColor: `${accent}88` }]}>
          <Text style={styles.deltaLabel}>{t(language, 'currentRank')}</Text>
          <Text style={[styles.deltaValue, { color: accent }]}>{rank}</Text>
        </View>
      </View>

      <Button icon={Sparkles} label={t(language, 'continue')} onPress={() => router.back()} />
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
