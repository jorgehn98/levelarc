import { Link, router, useFocusEffect } from 'expo-router';
import { Check, Flame, Gift, Plus, Target } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { EssenceBadge } from '@/components/EssenceBadge';
import { HabitCard } from '@/components/HabitCard';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { SystemMessageCard } from '@/components/SystemMessageCard';
import { canClaimPerfectWeek as canClaimPerfectWeekBonus, getDailyMissionProgress, getPerfectWeekMissionProgress } from '@/core/missions';
import type { TodayHabit } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { useAiStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';

export default function TodayScreen() {
  const todayHabits = useAppStore((state) => state.todayHabits);
  const player = useAppStore((state) => state.player);
  const dailyMission = useAppStore((state) => state.dailyMission);
  const incrementHabit = useAppStore((state) => state.incrementHabit);
  const failHabit = useAppStore((state) => state.failHabit);
  const undoHabit = useAppStore((state) => state.undoHabit);
  const claimMission = useAppStore((state) => state.claimMission);
  const claimPerfectWeekMission = useAppStore((state) => state.claimPerfectWeekMission);
  const language = useAppStore((state) => state.language);
  const ensureDailyMessage = useAiStore((state) => state.ensureDailyMessage);

  // Recepción del Sistema: al enfocar Hoy aseguramos el mensaje del día. ensureDailyMessage es barato
  // e idempotente (cachea por día), así que llamarlo en cada foco solo regenera si cambió el día o el
  // mensaje no está fresco. Esto cubre también el rollover de día al volver a la pantalla.
  useFocusEffect(
    useCallback(() => {
      void ensureDailyMessage();
    }, [ensureDailyMessage]),
  );

  const mission = getDailyMissionProgress(dailyMission?.completados ?? 0, dailyMission?.objetivo ?? todayHabits.length);
  const perfectWeekMission = getPerfectWeekMissionProgress(dailyMission?.perfectStreakDays ?? 0);
  const canClaim = mission.isComplete && !dailyMission?.reclamada;
  const canClaimPerfectWeek = canClaimPerfectWeekBonus(dailyMission);
  const showPerfectWeekMission = (dailyMission?.perfectStreakDays ?? 0) >= 6;
  const pendingHabits = useMemo(() => todayHabits.filter((habit) => habit.estado === 'pendiente'), [todayHabits]);
  const completedHabits = useMemo(() => todayHabits.filter((habit) => habit.estado === 'completado'), [todayHabits]);
  const failedHabits = useMemo(() => todayHabits.filter((habit) => habit.estado === 'fallado'), [todayHabits]);

  return (
    <Screen>
      <ScreenHeader
        subtitle={t(language, 'habitsToday')}
        title={t(language, 'today')}
        action={(
          <View style={styles.headerActions}>
            <EssenceBadge value={player?.esencia ?? 0} />
            <Link href="/habit/new" asChild>
              <Pressable style={styles.addButton}>
                <Plus color={colors.background.void} size={22} />
              </Pressable>
            </Link>
          </View>
        )}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.missionPanel}>
          <View style={styles.missionTop}>
            <View style={[styles.missionIcon, mission.isComplete && styles.missionCompleteIcon]}>
              {mission.isComplete ? <Check color={colors.state.completed} size={18} /> : <Target color={colors.brand.cyanCore} size={18} />}
            </View>
            <View style={styles.missionCopy}>
              <Text style={styles.kicker}>◆ {t(language, 'missionStatus')}</Text>
              <Text style={styles.systemText}>{mission.isAvailable ? t(language, 'completeTodayHabits') : t(language, 'noDailyMission')}</Text>
            </View>
            <Text style={[styles.missionCount, mission.isComplete && styles.missionComplete]}>{mission.completed} / {mission.target}</Text>
          </View>

          <SegmentedProgress completed={mission.completed} target={mission.target} color={mission.isComplete ? colors.state.completed : colors.brand.cyanCore} />

          {!mission.isAvailable ? (
            <Text style={styles.metaText}>{t(language, 'noDailyMissionCopy')}</Text>
          ) : canClaim ? (
            <View style={styles.claim}>
              <Button icon={Gift} label={t(language, 'claimXp', { xp: dailyMission?.xpBonus ?? 10 })} onPress={claimMission} />
            </View>
          ) : mission.isComplete ? (
            <Text style={styles.claimed}>{t(language, 'missionClaimed')} · +{dailyMission?.xpBonus ?? 10} XP</Text>
          ) : null}
        </View>

        <SystemMessageCard />

        {showPerfectWeekMission ? (
          <View style={[styles.missionPanel, styles.streakMissionPanel]}>
            <View style={styles.missionTop}>
              <View style={[styles.missionIcon, perfectWeekMission.isComplete && styles.missionCompleteIcon]}>
                {perfectWeekMission.isComplete ? <Check color={colors.state.completed} size={18} /> : <Flame color={colors.state.streak} size={18} />}
              </View>
              <View style={styles.missionCopy}>
                <Text style={[styles.kicker, styles.streakKicker]}>◆ {t(language, 'perfectWeekStatus')}</Text>
                <Text style={styles.systemText}>{t(language, 'perfectWeekCopy')}</Text>
              </View>
              <Text style={[styles.missionCount, perfectWeekMission.isComplete && styles.missionComplete]}>
                {perfectWeekMission.completed} / {perfectWeekMission.target}
              </Text>
            </View>

            <SegmentedProgress
              completed={perfectWeekMission.completed}
              target={perfectWeekMission.target}
              color={perfectWeekMission.isComplete ? colors.state.completed : colors.state.streak}
            />

            {canClaimPerfectWeek ? (
              <View style={styles.claim}>
                <Button icon={Flame} label={t(language, 'claimXp', { xp: dailyMission?.streakBonusXp ?? 30 })} onPress={claimPerfectWeekMission} />
              </View>
            ) : dailyMission?.streakBonusClaimed ? (
              <Text style={styles.claimed}>{t(language, 'perfectWeekClaimed')} · +{dailyMission?.streakBonusXp ?? 30} XP</Text>
            ) : (
              <Text style={styles.metaText}>{t(language, 'perfectWeekProgress', { done: perfectWeekMission.completed, target: perfectWeekMission.target })}</Text>
            )}
          </View>
        ) : null}

        {todayHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Target color={colors.state.pending} size={24} />
            </View>
            <Text style={styles.emptyKicker}>◆ {t(language, 'systemOnlineShort')}</Text>
            <Text style={styles.emptyTitle}>{t(language, 'noHabitsToday')}</Text>
            <Text style={styles.emptyText}>{t(language, 'createFirstHabit')}</Text>
            <Pressable onPress={() => router.push('/habit/new')} style={styles.emptyAction}>
              <Plus color={colors.background.void} size={18} />
              <Text style={styles.emptyActionText}>{t(language, 'createHabit')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.groups}>
            <HabitGroup
              accent={colors.brand.cyanCore}
              habits={pendingHabits}
              label={t(language, 'pendingGroup')}
              language={language}
              onFail={failHabit}
              onIncrement={incrementHabit}
              onUndo={undoHabit}
            />
            <HabitGroup
              accent={colors.state.completed}
              habits={completedHabits}
              label={t(language, 'completedGroup')}
              language={language}
              onFail={failHabit}
              onIncrement={incrementHabit}
              onUndo={undoHabit}
            />
            <HabitGroup
              accent={colors.state.failed}
              habits={failedHabits}
              label={t(language, 'failedGroup')}
              language={language}
              onFail={failHabit}
              onIncrement={incrementHabit}
              onUndo={undoHabit}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

type SegmentedProgressProps = {
  completed: number;
  target: number;
  color: string;
};

function SegmentedProgress({ completed, target, color }: SegmentedProgressProps) {
  const segmentCount = Math.max(1, Math.min(target || 1, 6));
  const completedSegments = target > 0 ? Math.round((Math.min(completed, target) / target) * segmentCount) : 0;

  return (
    <View style={styles.segmentedProgress}>
      {Array.from({ length: segmentCount }).map((_, index) => (
        <View key={index} style={styles.segmentTrack}>
          <View style={[styles.segmentFill, index < completedSegments && { backgroundColor: color, width: '100%' }]} />
        </View>
      ))}
    </View>
  );
}

type HabitGroupProps = {
  habits: TodayHabit[];
  label: string;
  accent: string;
  language: Language;
  onIncrement: (id: string) => Promise<void>;
  onFail: (id: string) => Promise<void>;
  onUndo: (id: string) => Promise<void>;
};

function HabitGroup({ habits, label, accent, language, onIncrement, onFail, onUndo }: HabitGroupProps) {
  if (habits.length === 0) return null;

  return (
    <View style={styles.group}>
      <SectionHeader accent={accent} count={habits.length} label={label} />
      <View style={styles.groupList}>
        {habits.map((item) => (
          <HabitCard
            key={item.id}
            habit={item}
            language={language}
            onFail={() => void onFail(item.id)}
            onIncrement={() => void onIncrement(item.id)}
            onOpenDetail={() => router.push(`/habit/${item.id}`)}
            onUndo={() => void onUndo(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 16,
    paddingBottom: 24,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  missionTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  missionPanel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.brand.cyanShadow,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    padding: 16,
  },
  streakMissionPanel: {
    borderColor: `${colors.state.streak}88`,
  },
  missionIcon: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}14`,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  missionCompleteIcon: {
    borderColor: colors.state.completed,
    backgroundColor: `${colors.state.completed}14`,
  },
  missionCopy: {
    flex: 1,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  streakKicker: {
    color: colors.state.streak,
  },
  systemText: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  missionCount: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayBold,
    fontSize: 15,
  },
  segmentedProgress: {
    flexDirection: 'row',
    gap: 5,
  },
  segmentTrack: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  segmentFill: {
    borderRadius: 3,
    height: '100%',
    width: 0,
  },
  missionComplete: {
    color: colors.state.completed,
  },
  metaText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    marginTop: 8,
  },
  claim: {
    marginTop: 14,
  },
  claimed: {
    color: colors.state.completed,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  groups: {
    gap: 16,
  },
  group: {
    gap: 10,
  },
  groupList: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 22,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    marginBottom: 12,
    width: 56,
  },
  emptyTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 17,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyKicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  emptyAction: {
    alignItems: 'center',
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  emptyActionText: {
    color: colors.background.void,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
  },
});
