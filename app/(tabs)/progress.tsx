import { router } from 'expo-router';
import { BarChart3, CalendarDays, Check, Clock, Flame, Gem, Shield, Sparkles, Store, Target, Trophy, X } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AttributeRadar } from '@/components/AttributeRadar';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { RankBadge } from '@/components/RankBadge';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { StatTile } from '@/components/StatTile';
import { getLevelProgress } from '@/core/ranks';
import type { EventRecord, HabitRecord } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { getEquippedTitle } from '@/lib/equippedTitle';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography, type Rank } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

const ranks: Rank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const weekLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const heatLevels = [colors.background.card, '#5F5224', '#8D7429', '#C79B31', colors.rank.S];

export default function ProgressScreen() {
  const player = useAppStore((state) => state.player);
  const events = useAppStore((state) => state.events);
  const habits = useAppStore((state) => state.habits);
  const language = useAppStore((state) => state.language);
  const progress = getLevelProgress(player?.xpTotal ?? 0);
  const accent = getRankAccent(progress.rank);
  const equippedTitle = getEquippedTitle(player?.tituloEquipado ?? null, language);
  const activeHabits = habits.filter((habit) => !habit.archivado).length;
  const weekActivity = getWeekActivity(events, habits);
  const heatMap = getHeatMap(events);

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
            {equippedTitle ? <Text style={[styles.equippedTitle, { color: accent }]}>◆ {equippedTitle}</Text> : null}
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
          <View style={styles.panelTitleRow}>
            <View style={styles.panelTitleCopy}>
              <BarChart3 color={colors.brand.cyanCore} size={14} />
              <Text style={styles.panelTitle}>{t(language, 'weekActivity')}</Text>
            </View>
            <Text style={styles.panelMetric}>{weekActivity.completed} / {weekActivity.target}</Text>
          </View>
          <View style={styles.weekBars}>
            {weekActivity.days.map((day) => (
              <View key={day.dateKey} style={styles.weekBarItem}>
                <Text style={styles.weekBarValue}>{day.completed}</Text>
                <View style={styles.weekBarTrack}>
                  <View style={[styles.weekBarFill, { height: `${day.ratio * 100}%`, minHeight: day.completed > 0 ? 8 : 0 }]} />
                </View>
                <Text style={[styles.weekBarLabel, day.isToday && styles.weekBarLabelActive]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelTitleRow}>
            <View style={styles.panelTitleCopy}>
              <CalendarDays color={colors.brand.cyanCore} size={14} />
              <Text style={styles.panelTitle}>{t(language, 'heatMap')}</Text>
            </View>
          </View>
          <View style={styles.heatGrid}>
            {heatMap.map((week) => (
              <View key={week[0]?.dateKey} style={styles.heatColumn}>
                {week.map((item) => (
                  <View key={item.dateKey} style={[styles.heatCell, { backgroundColor: heatLevels[item.level] }]} />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.heatLegend}>
            <Text style={styles.legendText}>{t(language, 'less').toUpperCase()}</Text>
            {heatLevels.map((color, index) => (
              <View key={`${color}-${index}`} style={[styles.legendCell, { backgroundColor: color }]} />
            ))}
            <Text style={styles.legendText}>{t(language, 'more').toUpperCase()}</Text>
          </View>
        </View>

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
          <View style={styles.statsRow}>
            <Pressable onPress={() => router.push('/shop')} style={styles.essenceTile}>
              <StatTile color={colors.brand.cyanCore} icon={Gem} label={t(language, 'essence')} unit="ES" value={player?.esencia ?? 0} />
            </Pressable>
            <View style={styles.shopAction}>
              <Button icon={Store} label={t(language, 'shop')} onPress={() => router.push('/shop')} variant="selected" />
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <SectionHeader label={t(language, 'history')} />
          <View style={styles.events}>
            {events.length === 0 ? (
              <Text style={styles.empty}>{t(language, 'noEvents')}</Text>
            ) : (
              events.slice(0, 25).map((item) => <EventRow key={item.id} event={item} language={language} />)
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

type WeekActivityDay = {
  dateKey: string;
  label: string;
  completed: number;
  target: number;
  ratio: number;
  isToday: boolean;
};

function getWeekActivity(events: EventRecord[], habits: HabitRecord[]) {
  const today = startOfLocalDay(new Date());
  const start = addDays(today, -6);
  const completedByDate = countCompletedEventsByDate(events);
  const activeHabits = habits.filter((habit) => !habit.archivado);
  const days: WeekActivityDay[] = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(start, index);
    const dateKey = toLocalDateKey(date);
    const target = activeHabits.filter((habit) => isHabitScheduledOn(habit, date)).length;
    const completed = completedByDate.get(dateKey) ?? 0;
    return {
      dateKey,
      label: weekLabels[getLevelArcWeekday(date) - 1],
      completed,
      target,
      ratio: target > 0 ? Math.min(1, completed / target) : 0,
      isToday: dateKey === toLocalDateKey(today),
    };
  });

  return {
    completed: days.reduce((total, day) => total + day.completed, 0),
    target: days.reduce((total, day) => total + day.target, 0),
    days,
  };
}

function getHeatMap(events: EventRecord[]) {
  const completedByDate = countCompletedEventsByDate(events);
  const today = startOfLocalDay(new Date());
  const firstDay = addDays(today, -83);
  const days = Array.from({ length: 84 }).map((_, index) => {
    const date = addDays(firstDay, index);
    const dateKey = toLocalDateKey(date);
    const count = completedByDate.get(dateKey) ?? 0;
    return { dateKey, count, level: getHeatLevel(count) };
  });

  const rows = 7;
  return Array.from({ length: 12 }).map((_, column) => days.slice(column * rows, column * rows + rows));
}

function countCompletedEventsByDate(events: EventRecord[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.tipoEvento !== 'completado') continue;
    counts.set(event.fecha, (counts.get(event.fecha) ?? 0) + 1);
  }
  return counts;
}

function getHeatLevel(count: number) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function isHabitScheduledOn(habit: HabitRecord, date: Date) {
  return habit.diasSemana.split(',').map(Number).includes(getLevelArcWeekday(date));
}

function getLevelArcWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  equippedTitle: {
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    marginTop: 5,
    textTransform: 'uppercase',
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
  panelTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelTitleCopy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  panelTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  panelMetric: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
  weekBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 9,
    height: 130,
    marginTop: 14,
  },
  weekBarItem: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  weekBarValue: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
  weekBarTrack: {
    backgroundColor: `${colors.background.card}66`,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 96,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: '100%',
  },
  weekBarFill: {
    backgroundColor: colors.brand.cyanCore,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    width: '100%',
  },
  weekBarLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
  weekBarLabelActive: {
    color: colors.brand.cyanGlow,
  },
  heatGrid: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 14,
  },
  heatColumn: {
    flex: 1,
    gap: 4,
  },
  heatCell: {
    aspectRatio: 1,
    borderColor: `${colors.background.borderBright}88`,
    borderRadius: 3,
    borderWidth: 1,
    width: '100%',
  },
  heatLegend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  legendText: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
  },
  legendCell: {
    borderColor: `${colors.background.borderBright}88`,
    borderRadius: 2,
    borderWidth: 1,
    height: 10,
    width: 10,
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
  essenceTile: {
    flex: 1,
  },
  shopAction: {
    justifyContent: 'center',
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
