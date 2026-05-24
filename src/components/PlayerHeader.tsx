import { Flame } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { getLevelProgress } from '@/core/ranks';
import type { PlayerRecord } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { colors, radii, shadows, typography } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

type PlayerHeaderProps = {
  player: PlayerRecord | null;
  language: Language;
};

export function PlayerHeader({ player, language }: PlayerHeaderProps) {
  const progress = getLevelProgress(player?.xpTotal ?? 0);
  const accent = getRankAccent(progress.rank);
  const streak = player?.rachaMisiones ?? 0;

  return (
    <View style={[styles.panel, shadows.primaryGlow]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.systemLabel}>{t(language, 'systemOnline')}</Text>
          <Text style={styles.name}>{t(language, 'hunterId')}</Text>
        </View>
        <View style={styles.streak}>
          <Flame color={colors.state.streak} size={14} />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
      </View>

      <View style={styles.rankRow}>
        <RankBadge glow rank={progress.rank} />
        <View style={styles.progressCopy}>
          <Text style={styles.level}>{t(language, 'level', { level: progress.level })} · {t(language, 'rank', { rank: progress.rank })}</Text>
          <ProgressBar color={accent} ratio={progress.ratio} />
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>XP</Text>
            <Text style={styles.xpValue}>
              {progress.gainedInLevel} / {progress.neededForLevel} XP
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    padding: 16,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  systemLabel: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 23,
    lineHeight: 30,
    marginTop: 2,
  },
  streak: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.borderBright,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  streakText: {
    color: colors.state.streak,
    fontFamily: typography.font.displayMedium,
    fontSize: 12,
  },
  rankRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  progressCopy: {
    flex: 1,
    gap: 7,
  },
  level: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  xpValue: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
});
