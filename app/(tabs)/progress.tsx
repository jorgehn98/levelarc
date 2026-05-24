import { FlatList, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { getLevelProgress } from '@/core/ranks';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

export default function ProgressScreen() {
  const player = useAppStore((state) => state.player);
  const events = useAppStore((state) => state.events);
  const language = useAppStore((state) => state.language);
  const progress = getLevelProgress(player?.xpTotal ?? 0);
  const accent = getRankAccent(progress.rank);

  return (
    <Screen>
      <Text style={styles.kicker}>{t(language, 'currentRank')}</Text>
      <View style={[styles.rankBadge, { borderColor: accent }]}>
        <BrandMark size={156} style={styles.rankWatermark} variant="transparent" />
        <Text style={[styles.rank, { color: accent }]}>{progress.rank}</Text>
        <Text style={styles.level}>{t(language, 'level', { level: progress.level })}</Text>
      </View>

      <ProgressBar ratio={progress.ratio} color={accent} />
      <Text style={styles.meta}>
        {t(language, 'xpToNext', { done: progress.gainedInLevel, target: progress.neededForLevel })}
      </Text>

      <Text style={styles.sectionTitle}>{t(language, 'history')}</Text>
      <FlatList
        contentContainerStyle={styles.list}
        data={events}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>{t(language, 'noEvents')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.eventRow}>
            <View>
              <Text style={styles.eventName}>{item.habitName ?? t(language, 'archivedHabit')}</Text>
              <Text style={styles.eventMeta}>{item.fecha} · {item.tipoEvento}</Text>
            </View>
            <Text style={[styles.eventXp, item.xpDelta >= 0 ? styles.positive : styles.negative]}>
              {item.xpDelta >= 0 ? '+' : ''}{item.xpDelta} XP
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: 'Orbitron_500Medium',
    fontSize: 12,
    letterSpacing: 0,
    marginBottom: 12,
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingVertical: 30,
  },
  rankWatermark: {
    opacity: 0.16,
    position: 'absolute',
  },
  rank: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 76,
    letterSpacing: 0,
  },
  level: {
    color: colors.brand.bone,
    fontFamily: 'Orbitron_500Medium',
    fontSize: 18,
    letterSpacing: 0,
    marginTop: 4,
  },
  meta: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 10,
  },
  sectionTitle: {
    color: colors.brand.bone,
    fontFamily: 'Orbitron_700Bold',
    fontSize: 18,
    letterSpacing: 0,
    marginTop: 28,
  },
  list: {
    gap: 10,
    paddingTop: 12,
    paddingBottom: 24,
  },
  empty: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
  },
  eventRow: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  eventName: {
    color: colors.brand.bone,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  eventMeta: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 3,
  },
  eventXp: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 13,
    letterSpacing: 0,
  },
  positive: {
    color: colors.state.completed,
  },
  negative: {
    color: colors.state.failed,
  },
});
