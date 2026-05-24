import { Check, Clock, Flame, Shield, Sparkles, Target, Trophy, X } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AttributeRadar } from '@/components/AttributeRadar';
import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/StatTile';
import { getLevelProgress } from '@/core/ranks';
import type { EventRecord } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography, type Rank } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

const ranks: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];

export default function ProgressScreen() {
  const player = useAppStore((state) => state.player);
  const events = useAppStore((state) => state.events);
  const habits = useAppStore((state) => state.habits);
  const language = useAppStore((state) => state.language);
  const progress = getLevelProgress(player?.xpTotal ?? 0);
  const accent = getRankAccent(progress.rank);
  const activeHabits = habits.filter((habit) => !habit.archivado).length;

  return (
    <Screen>
      <ScreenHeader icon={Shield} subtitle={t(language, 'rankHistoryStats')} title={t(language, 'progress')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.rankHero, { borderColor: accent }, shadows.rankGlow(accent)]}>
          <RankBadge glow rank={progress.rank} size={92} />
          <View style={styles.rankCopy}>
            <Text style={[styles.kicker, { color: accent }]}>{t(language, 'currentRank')}</Text>
            <Text style={styles.rankTitle}>{t(language, 'rank', { rank: progress.rank }).toUpperCase()}</Text>
            <Text style={styles.rankMeta}>{t(language, 'level', { level: progress.level })} · {player?.xpTotal ?? 0} XP</Text>
          </View>
          <View style={styles.heroProgress}>
            <ProgressBar ratio={progress.ratio} color={accent} />
            <View style={styles.xpRow}>
              <Text style={styles.xpText}>{progress.gainedInLevel} / {progress.neededForLevel} XP</Text>
              <Text style={[styles.xpText, { color: accent }]}>{Math.round(progress.ratio * 100)}%</Text>
            </View>
          </View>
        </View>

        <AttributeRadar attributeXp={player?.atributosXp} />

        <View style={styles.panel}>
          <SectionHeader accent={accent} label={t(language, 'ascensionPath')} />
          <View style={styles.rankLadder}>
            {ranks.map((rank) => {
              const isCurrent = rank === progress.rank;
              const passed = ranks.indexOf(rank) < ranks.indexOf(progress.rank);
              const rankColor = colors.rank[rank];
              return (
                <View key={rank} style={styles.rankStep}>
                  <View
                    style={[
                      styles.rankNode,
                      {
                        backgroundColor: isCurrent ? rankColor : passed ? `${rankColor}33` : colors.background.card,
                        borderColor: isCurrent || passed ? rankColor : colors.background.border,
                      },
                      isCurrent && shadows.rankGlow(rankColor),
                    ]}
                  >
                    <Text style={[styles.rankNodeText, { color: isCurrent ? colors.background.void : passed ? rankColor : colors.state.pending }]}>{rank}</Text>
                  </View>
                  {isCurrent ? <Text style={[styles.currentRank, { color: rankColor }]}>ACTUAL</Text> : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatTile color={colors.state.streak} icon={Flame} label={t(language, 'missionStreak')} unit={t(language, 'daysUnit')} value={player?.rachaMisiones ?? 0} />
            <StatTile color={accent} icon={Trophy} label={t(language, 'level', { level: '' }).trim()} unit={t(language, 'rank', { rank: progress.rank })} value={progress.level} />
          </View>
          <View style={styles.statsRow}>
            <StatTile color={colors.brand.cyanCore} icon={Target} label={t(language, 'activeHabits')} unit={t(language, 'missionsUnit')} value={activeHabits} />
            <StatTile color={colors.rank.S} icon={Sparkles} label={t(language, 'totalXp')} unit="XP" value={player?.xpTotal ?? 0} />
          </View>
        </View>

        <View style={styles.panel}>
          <SectionHeader label={t(language, 'history')} />
          <View style={styles.events}>
            {events.length === 0 ? (
              <Text style={styles.empty}>{t(language, 'noEvents')}</Text>
            ) : (
              events.map((item) => <EventRow key={item.id} event={item} language={language} />)
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function EventRow({ event, language }: { event: EventRecord; language: Language }) {
  const positive = event.xpDelta >= 0;

  return (
    <View style={styles.eventRow}>
      <View style={[styles.eventIcon, positive ? styles.eventPositiveIcon : styles.eventNegativeIcon]}>
        {positive ? <Check color={colors.state.completed} size={14} /> : <X color={colors.state.failed} size={14} />}
      </View>
      <View style={styles.eventCopy}>
        <Text numberOfLines={1} style={styles.eventName}>{event.habitName ?? t(language, 'archivedHabit')}</Text>
        <View style={styles.eventMetaRow}>
          <Clock color={colors.state.pending} size={11} />
          <Text style={styles.eventMeta}>{event.fecha} · {event.tipoEvento}</Text>
        </View>
      </View>
      <Text style={[styles.eventXp, positive ? styles.positive : styles.negative]}>{positive ? '+' : ''}{event.xpDelta} XP</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 18,
    paddingBottom: 24,
  },
  rankHero: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    overflow: 'hidden',
    padding: 18,
  },
  rankCopy: {
    flex: 1,
    minWidth: 160,
  },
  kicker: {
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  rankTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 28,
    lineHeight: 34,
    marginTop: 4,
  },
  rankMeta: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    marginTop: 3,
  },
  heroProgress: {
    flexBasis: '100%',
    gap: 7,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpText: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  panel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
  },
  rankLadder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  rankStep: {
    alignItems: 'center',
    gap: 6,
    minHeight: 56,
  },
  rankNode: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rankNodeText: {
    fontFamily: typography.font.displayBold,
    fontSize: 15,
  },
  currentRank: {
    fontFamily: typography.font.displayMedium,
    fontSize: 8,
  },
  statsGrid: {
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  events: {
    gap: 8,
    marginTop: 12,
  },
  empty: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    paddingVertical: 12,
    textAlign: 'center',
  },
  eventRow: {
    alignItems: 'center',
    borderBottomColor: colors.background.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 10,
    paddingTop: 2,
  },
  eventIcon: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  eventPositiveIcon: {
    backgroundColor: `${colors.state.completed}1A`,
    borderColor: colors.state.completed,
  },
  eventNegativeIcon: {
    backgroundColor: `${colors.state.failed}1A`,
    borderColor: colors.state.failed,
  },
  eventCopy: {
    flex: 1,
    minWidth: 0,
  },
  eventName: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 13,
  },
  eventMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 3,
  },
  eventMeta: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11,
  },
  eventXp: {
    fontFamily: typography.font.displayBold,
    fontSize: 12,
  },
  positive: {
    color: colors.state.completed,
  },
  negative: {
    color: colors.state.failed,
  },
});
