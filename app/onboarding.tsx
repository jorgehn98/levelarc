import { router } from 'expo-router';
import { ChevronRight, Flame, Shield, Swords, Trophy } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { BrandMark } from '@/components/BrandMark';
import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { getLevelProgress } from '@/core/ranks';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography, type Rank } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

const RANK_SEQUENCE: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export default function OnboardingScreen() {
  const language = useAppStore((state) => state.language);
  const insets = useSafeAreaInsets();
  const player = useAppStore((state) => state.player);
  const habits = useAppStore((state) => state.habits);
  const setPlayerName = useAppStore((state) => state.setPlayerName);
  const isFirstRun = !player?.nombre?.trim();
  const progress = getLevelProgress(player?.xpTotal ?? 0);
  const accent = isFirstRun ? colors.brand.cyanCore : getRankAccent(progress.rank);
  const [name, setName] = useState(player?.nombre ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isValid = name.trim().length >= 2;
  const activeHabits = useMemo(() => habits.filter((habit) => !habit.archivado).length, [habits]);

  async function handleContinue() {
    if (isFirstRun && !isValid) return;
    setIsSubmitting(true);
    try {
      if (isFirstRun || name.trim() !== player?.nombre) {
        await setPlayerName(name);
      }
      router.replace('/(tabs)');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { borderColor: accent }]}>
      <BackgroundFx accent={accent} />
      <CornerTicks accent={accent} />

      <ScrollView
        contentContainerStyle={[styles.content, isFirstRun ? styles.firstContent : styles.returnContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <AnimatedIntro>
          <LogoOrbit accent={accent} compact={!isFirstRun} />

          <FlickerWordmark accent={accent} compact={!isFirstRun} />
          <Text style={[styles.systemLabel, { color: accent }]}>[ {isFirstRun ? t(language, 'systemActivated') : t(language, 'systemOnlineShort')} ]</Text>

          {isFirstRun ? (
            <FirstRunPanel accent={accent} language={language} name={name} onChangeName={setName} />
          ) : (
            <ReturnPanel
              accent={accent}
              activeHabits={activeHabits}
              language={language}
              name={player?.nombre ?? t(language, 'hunterId')}
              progress={progress}
              streak={player?.rachaMisiones ?? 0}
              totalXp={player?.xpTotal ?? 0}
            />
          )}
        </AnimatedIntro>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 26) }]}>
        <View style={[styles.ctaVisual, { backgroundColor: accent, borderColor: accent, shadowColor: accent }, (isSubmitting || (isFirstRun && !isValid)) && styles.disabled]}>
          <Text style={styles.ctaText}>{isSubmitting ? t(language, 'initializing') : isFirstRun ? t(language, 'beginAscension') : t(language, 'continueAscension')}</Text>
          {isSubmitting ? <ActivityIndicator color={colors.background.void} size="small" /> : <ChevronRight color={colors.background.void} size={18} />}
          <Pressable
            disabled={isSubmitting || (isFirstRun && !isValid)}
            onPress={() => void handleContinue()}
            style={({ pressed }) => [styles.ctaHitArea, pressed && styles.pressed]}
          />
        </View>

        <View style={styles.privacy}>
          <Shield color={colors.state.pending} size={12} />
          <Text style={styles.privacyText}>{t(language, 'privacyLine')}</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function BackgroundFx({ accent }: { accent: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <HexGridBg accent={accent} />
      <View style={styles.scanlines} />
    </View>
  );
}

function HexGridBg({ accent }: { accent: string }) {
  return (
    <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
      <Defs>
        <Pattern height="32" id="hex-grid" patternUnits="userSpaceOnUse" width="28">
          <Path d="M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z" fill="none" opacity={0.07} stroke={accent} strokeWidth="1" />
        </Pattern>
      </Defs>
      <Rect fill="url(#hex-grid)" height="100%" width="100%" />
    </Svg>
  );
}

function CornerTicks({ accent }: { accent: string }) {
  return (
    <>
      <View style={[styles.corner, styles.cornerTopLeft, { borderColor: accent }]} />
      <View style={[styles.corner, styles.cornerTopRight, { borderColor: accent }]} />
      <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: accent }]} />
      <View style={[styles.corner, styles.cornerBottomRight, { borderColor: accent }]} />
    </>
  );
}

function LogoOrbit({ accent, compact }: { accent: string; compact: boolean }) {
  const size = compact ? 156 : 180;
  const markSize = compact ? 108 : 124;
  const spin = useRef(new Animated.Value(0)).current;
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        duration: 28000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    const makePulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            duration: 3000,
            easing: Easing.out(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            duration: 0,
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    const pulseLoopA = makePulse(pulseA, 0);
    const pulseLoopB = makePulse(pulseB, 1500);

    spinLoop.start();
    pulseLoopA.start();
    pulseLoopB.start();

    return () => {
      spinLoop.stop();
      pulseLoopA.stop();
      pulseLoopB.stop();
    };
  }, [pulseA, pulseB, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const pulseStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.7, 0, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.18] }) }],
  });

  return (
    <View style={[styles.logoOrbit, { height: size, width: size }]}>
      <Animated.View style={[styles.logoRingDashed, { borderColor: `${accent}88`, transform: [{ rotate }] }]} />
      <View style={[styles.logoRingInner, { borderColor: `${accent}55` }]} />
      <Animated.View style={[styles.logoPulse, { borderColor: accent }, pulseStyle(pulseA)]} />
      <Animated.View style={[styles.logoPulse, { borderColor: accent }, pulseStyle(pulseB)]} />
      <View style={[styles.logoMark, { shadowColor: accent }]}>
        <BrandMark size={markSize} variant="transparent" />
      </View>
    </View>
  );
}

function FlickerWordmark({ accent, compact }: { accent: string; compact: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { duration: 180, toValue: 1, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 70, toValue: 0.45, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 110, toValue: 1, useNativeDriver: true }),
      ]),
      Animated.timing(translateY, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.Text style={[styles.wordmark, compact && styles.wordmarkCompact, { opacity, transform: [{ translateY }] }]}>
      LEVEL<Text style={{ color: accent }}>ARC</Text>
    </Animated.Text>
  );
}

function AnimatedIntro({ children }: { children: ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return <Animated.View style={[styles.intro, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function FirstRunPanel({
  accent,
  language,
  name,
  onChangeName,
}: {
  accent: string;
  language: ReturnType<typeof useAppStore.getState>['language'];
  name: string;
  onChangeName: (value: string) => void;
}) {
  return (
    <View style={styles.firstPanel}>
      <Text style={styles.bodyCopy}>{t(language, 'onboardingBody')}</Text>

      <View style={styles.nameBlock}>
        <Text style={styles.inputLabel}>◇ {t(language, 'hunterName')}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            autoCapitalize="words"
            cursorColor={colors.brand.cyanCore}
            maxLength={24}
            onChangeText={(value) => onChangeName(value.slice(0, 24))}
            placeholder={t(language, 'hunterNamePlaceholder')}
            placeholderTextColor={colors.state.pending}
            returnKeyType="done"
            selectionColor={colors.brand.cyanShadow}
            style={[styles.nameInput, name.trim() && { borderColor: accent, shadowColor: accent }]}
            value={name}
          />
          <InputTicks active={Boolean(name.trim())} accent={accent} />
        </View>
        <Text style={styles.nameHelp}>{t(language, 'nameHelp')}</Text>
      </View>

      <IdentityPreview accent={accent} language={language} name={name.trim()} />
    </View>
  );
}

function InputTicks({ active, accent }: { active: boolean; accent: string }) {
  const color = active ? accent : colors.background.border;

  return (
    <>
      <View style={[styles.inputTick, styles.inputTickTopLeft, { borderColor: color }]} />
      <View style={[styles.inputTick, styles.inputTickTopRight, { borderColor: color }]} />
      <View style={[styles.inputTick, styles.inputTickBottomLeft, { borderColor: color }]} />
      <View style={[styles.inputTick, styles.inputTickBottomRight, { borderColor: color }]} />
    </>
  );
}

function IdentityPreview({ accent, language, name }: { accent: string; language: ReturnType<typeof useAppStore.getState>['language']; name: string }) {
  return (
    <View style={styles.identityPreview}>
      <RankBadge glow rank="E" size={40} />
      <View style={styles.identityCopy}>
        <Text style={styles.miniLabel}>◇ {t(language, 'initialIdentity')}</Text>
        <Text numberOfLines={1} style={styles.identityName}>{name || t(language, 'unnamedHunter')}</Text>
        <Text style={styles.identityMeta}>{t(language, 'rank', { rank: 'E' })} · {t(language, 'level', { level: 1 })} · 0 XP</Text>
      </View>
      <View style={[styles.identitySpark, { backgroundColor: accent }]} />
    </View>
  );
}

type ReturnPanelProps = {
  accent: string;
  activeHabits: number;
  language: ReturnType<typeof useAppStore.getState>['language'];
  name: string;
  progress: ReturnType<typeof getLevelProgress>;
  streak: number;
  totalXp: number;
};

function ReturnPanel({ accent, activeHabits, language, name, progress, streak, totalXp }: ReturnPanelProps) {
  const currentRankIndex = RANK_SEQUENCE.indexOf(progress.rank);
  const nextRank = RANK_SEQUENCE[Math.min(RANK_SEQUENCE.length - 1, currentRankIndex + 1)];
  const isMaxRank = progress.rank === 'S';

  return (
    <View style={styles.returnPanel}>
      <View style={styles.welcome}>
        <Text style={styles.miniLabel}>◇ {t(language, 'welcomeBackHunter')}</Text>
        <Text numberOfLines={1} style={[styles.returnName, { textShadowColor: `${accent}88` }]}>{name.toUpperCase()}</Text>
      </View>

      <View style={[styles.rankPanel, { borderColor: `${accent}88`, shadowColor: accent }]}>
        <View style={[styles.rankGlow, { backgroundColor: accent }]} />
        <View style={styles.rankRow}>
          <RankBadge glow rank={progress.rank} size={56} />
          <View style={styles.rankCopy}>
            <Text style={[styles.rankKicker, { color: accent }]}>◆ {t(language, 'currentRank')}</Text>
            <Text style={styles.rankTitle}>{t(language, 'rank', { rank: progress.rank }).toUpperCase()}</Text>
            <Text style={styles.rankMeta}>{t(language, 'level', { level: progress.level })} · {totalXp.toLocaleString()} {t(language, 'totalXpLong')}</Text>
          </View>
        </View>

        <View style={styles.rankProgress}>
          <ProgressBar color={accent} ratio={progress.ratio} />
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>{progress.gainedInLevel} / {progress.neededForLevel} XP</Text>
            <Text style={[styles.xpText, isMaxRank && { color: accent }]}>
              {isMaxRank ? `◆ ${t(language, 'maxRank')}` : `→ ${t(language, 'nextRank', { rank: nextRank }).toUpperCase()}`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statGrid}>
        <MiniStat color={colors.state.streak} icon={Flame} label={t(language, 'missionStreak')} unit={t(language, 'daysUnit')} value={streak} />
        <MiniStat color={accent} icon={Swords} label={t(language, 'activeHabits')} unit={t(language, 'missionsUnit')} value={activeHabits} />
        <MiniStat color={accent} icon={Trophy} label={t(language, 'level', { level: '' }).trim()} unit={`Rango ${progress.rank}`} value={progress.level} />
      </View>
    </View>
  );
}

function MiniStat({ color, icon: Icon, label, unit, value }: { color: string; icon: typeof Flame; label: string; unit: string; value: number }) {
  return (
    <View style={styles.miniStat}>
      <View style={styles.miniStatTop}>
        <Icon color={color} size={11} />
        <Text numberOfLines={1} style={styles.miniStatLabel}>{label}</Text>
      </View>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text numberOfLines={1} style={styles.miniStatUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background.void,
    borderWidth: 0,
    flex: 1,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  scanlines: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.012)',
  },
  corner: {
    height: 22,
    opacity: 0.55,
    position: 'absolute',
    width: 22,
    zIndex: 2,
  },
  cornerTopLeft: {
    borderLeftWidth: 1,
    borderTopWidth: 1,
    left: 16,
    top: 16,
  },
  cornerTopRight: {
    borderRightWidth: 1,
    borderTopWidth: 1,
    right: 16,
    top: 16,
  },
  cornerBottomLeft: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    bottom: 16,
    left: 16,
  },
  cornerBottomRight: {
    borderBottomWidth: 1,
    borderRightWidth: 1,
    bottom: 16,
    right: 16,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    paddingHorizontal: 28,
    position: 'relative',
    zIndex: 1,
  },
  firstContent: {
    paddingBottom: 132,
    paddingTop: 44,
  },
  returnContent: {
    paddingBottom: 132,
    paddingTop: 36,
  },
  intro: {
    alignItems: 'center',
    width: '100%',
  },
  logoOrbit: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoRingDashed: {
    borderRadius: 999,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: '98%',
    position: 'absolute',
    width: '98%',
  },
  logoRingInner: {
    borderRadius: 999,
    borderWidth: 1,
    height: '86%',
    position: 'absolute',
    width: '86%',
  },
  logoPulse: {
    borderRadius: 999,
    borderWidth: 1,
    height: '86%',
    opacity: 0.42,
    position: 'absolute',
    width: '86%',
  },
  logoMark: {
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  wordmark: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 30,
    letterSpacing: 0,
    marginTop: 18,
  },
  wordmarkCompact: {
    fontSize: 26,
    marginTop: 14,
  },
  systemLabel: {
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  firstPanel: {
    alignItems: 'center',
    marginTop: 18,
    maxWidth: 320,
    width: '100%',
  },
  bodyCopy: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  nameBlock: {
    marginTop: 18,
    width: '100%',
  },
  inputLabel: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  inputWrap: {
    marginTop: 8,
    position: 'relative',
  },
  nameInput: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.brand.bone,
    fontFamily: typography.font.displayMedium,
    fontSize: 16,
    height: 48,
    paddingHorizontal: 14,
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  inputTick: {
    height: 8,
    position: 'absolute',
    width: 8,
  },
  inputTickTopLeft: {
    borderLeftWidth: 1.5,
    borderTopWidth: 1.5,
    left: -4,
    top: -4,
  },
  inputTickTopRight: {
    borderRightWidth: 1.5,
    borderTopWidth: 1.5,
    right: -4,
    top: -4,
  },
  inputTickBottomLeft: {
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    bottom: -4,
    left: -4,
  },
  inputTickBottomRight: {
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    bottom: -4,
    right: -4,
  },
  nameHelp: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11.5,
    marginTop: 8,
    textAlign: 'center',
  },
  identityPreview: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    padding: 12,
    position: 'relative',
    width: '100%',
  },
  identityCopy: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  miniLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  identityName: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 14,
    marginTop: 2,
  },
  identityMeta: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11.5,
    marginTop: 2,
  },
  identitySpark: {
    borderRadius: 2,
    height: 3,
    opacity: 0.9,
    position: 'absolute',
    right: 12,
    top: 12,
    width: 3,
  },
  returnPanel: {
    marginTop: 14,
    maxWidth: 320,
    width: '100%',
  },
  welcome: {
    alignItems: 'center',
  },
  returnName: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 22,
    letterSpacing: 0,
    marginTop: 6,
    textShadowOffset: { height: 0, width: 0 },
    textShadowRadius: 14,
  },
  rankPanel: {
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
    padding: 14,
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  rankGlow: {
    height: 140,
    opacity: 0.12,
    position: 'absolute',
    right: -70,
    top: -50,
    transform: [{ rotate: '18deg' }],
    width: 180,
  },
  rankRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  rankCopy: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  rankKicker: {
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  rankTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 24,
    lineHeight: 28,
    marginTop: 2,
  },
  rankMeta: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    marginTop: 4,
  },
  rankProgress: {
    marginTop: 12,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  xpText: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9.5,
    textTransform: 'uppercase',
  },
  statGrid: {
    flexDirection: 'row',
    marginTop: 8,
  },
  miniStat: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  miniStatTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  miniStatLabel: {
    color: colors.state.pending,
    flex: 1,
    fontFamily: typography.font.displayMedium,
    fontSize: 8.5,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  miniStatValue: {
    fontFamily: typography.font.displayBold,
    fontSize: 18,
    lineHeight: 21,
    marginTop: 4,
  },
  miniStatUnit: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 10,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: colors.background.voidDeep,
    borderTopColor: colors.background.border,
    borderTopWidth: 1,
    bottom: 0,
    elevation: 24,
    left: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    position: 'absolute',
    right: 0,
    shadowColor: colors.background.voidDeep,
    shadowOpacity: 0.9,
    shadowRadius: 18,
    zIndex: 50,
  },
  ctaVisual: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'center',
    maxWidth: 320,
    shadowOpacity: 0.36,
    shadowRadius: 18,
    width: '100%',
  },
  ctaHitArea: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.md,
  },
  ctaText: {
    color: colors.background.void,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
    marginRight: 8,
  },
  disabled: {
    opacity: 0.42,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  privacy: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  privacyText: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9.5,
    marginLeft: 6,
    textTransform: 'uppercase',
  },
});
