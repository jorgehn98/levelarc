import { Link } from 'expo-router';
import { Check, Flame, Gift, Plus, Target } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { HabitCard } from '@/components/HabitCard';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { SystemPanel } from '@/components/SystemPanel';
import { getDailyMissionProgress, getPerfectWeekMissionProgress } from '@/core/missions';
import type { TodayHabit } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';

export default function TodayScreen() {
  const todayHabits = useAppStore((state) => state.todayHabits);
  const dailyMission = useAppStore((state) => state.dailyMission);
  const incrementHabit = useAppStore((state) => state.incrementHabit);
  const failHabit = useAppStore((state) => state.failHabit);
  const undoHabit = useAppStore((state) => state.undoHabit);
  const claimMission = useAppStore((state) => state.claimMission);
  const claimPerfectWeekMission = useAppStore((state) => state.claimPerfectWeekMission);
  const language = useAppStore((state) => state.language);
  const mission = getDailyMissionProgress(dailyMission?.completados ?? 0, dailyMission?.objetivo ?? todayHabits.length);
  const perfectWeekMission = getPerfectWeekMissionProgress(dailyMission?.perfectStreakDays ?? 0);
  const canClaim = mission.isComplete && !dailyMission?.reclamada;
  const canClaimPerfectWeek = perfectWeekMission.isComplete && !dailyMission?.streakBonusClaimed;
  const showPerfectWeekMission = (dailyMission?.perfectStreakDays ?? 0) >= 6;
  const pendingHabits = todayHabits.filter((habit) => habit.estado === 'pendiente');
  const completedHabits = todayHabits.filter((habit) => habit.estado === 'completado');
  const failedHabits = todayHabits.filter((habit) => habit.estado === 'fallado');

  return (
    <Screen>
      <ScreenHeader
        subtitle={t(language, 'habitsToday')}
        title={t(language, 'today')}
        action={(
          <Link href="/habit/new" asChild>
            <Pressable style={styles.addButton}>
              <Plus color={colors.background.void} size={22} />
            </Pressable>
          </Link>
        )}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SystemPanel title={t(language, 'dailyMission')}>
          <View style={styles.missionTop}>
            <View style={[styles.missionIcon, mission.isComplete && styles.missionCompleteIcon]}>
              {mission.isComplete ? <Check color={colors.state.completed} size={18} /> : <Target color={colors.brand.cyanCore} size={18} />}
            </View>
            <View style={styles.missionCopy}>
              <Text style={styles.kicker}>{t(language, 'missionStatus')}</Text>
              <Text style={styles.systemText}>{mission.isAvailable ? t(language, 'completeTodayHabits') : t(language, 'noDailyMission')}</Text>
            </View>
            <Text style={[styles.missionCount, mission.isComplete && styles.missionComplete]}>{mission.completed} / {mission.target}</Text>
          </View>

          <ProgressBar ratio={mission.ratio} color={mission.isComplete ? colors.state.completed : colors.brand.cyanCore} />

          {!mission.isAvailable ? (
            <Text style={styles.metaText}>{t(language, 'noDailyMissionCopy')}</Text>
          ) : canClaim ? (
            <View style={styles.claim}>
              <Button icon={Gift} label={t(language, 'claimXp', { xp: dailyMission?.xpBonus ?? 10 })} onPress={claimMission} />
            </View>
          ) : mission.isComplete ? (
            <Text style={styles.claimed}>{t(language, 'missionClaimed')} · +{dailyMission?.xpBonus ?? 10} XP</Text>
          ) : (
            <Text style={styles.metaText}>{t(language, 'completedCount', { done: mission.completed, target: mission.target })}</Text>
          )}
        </SystemPanel>

        {showPerfectWeekMission ? (
          <SystemPanel title={t(language, 'perfectWeekMission')}>
            <View style={styles.missionTop}>
              <View style={[styles.missionIcon, perfectWeekMission.isComplete && styles.missionCompleteIcon]}>
                {perfectWeekMission.isComplete ? <Check color={colors.state.completed} size={18} /> : <Flame color={colors.state.streak} size={18} />}
              </View>
              <View style={styles.missionCopy}>
                <Text style={styles.kicker}>{t(language, 'perfectWeekStatus')}</Text>
                <Text style={styles.systemText}>{t(language, 'perfectWeekCopy')}</Text>
              </View>
              <Text style={[styles.missionCount, perfectWeekMission.isComplete && styles.missionComplete]}>
                {perfectWeekMission.completed} / {perfectWeekMission.target}
              </Text>
            </View>

            <ProgressBar ratio={perfectWeekMission.ratio} color={perfectWeekMission.isComplete ? colors.state.completed : colors.state.streak} />

            {canClaimPerfectWeek ? (
              <View style={styles.claim}>
                <Button icon={Flame} label={t(language, 'claimXp', { xp: dailyMission?.streakBonusXp ?? 30 })} onPress={claimPerfectWeekMission} />
              </View>
            ) : perfectWeekMission.isComplete ? (
              <Text style={styles.claimed}>{t(language, 'perfectWeekClaimed')} · +{dailyMission?.streakBonusXp ?? 30} XP</Text>
            ) : (
              <Text style={styles.metaText}>{t(language, 'perfectWeekProgress', { done: perfectWeekMission.completed, target: perfectWeekMission.target })}</Text>
            )}
          </SystemPanel>
        ) : null}

        {todayHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Target color={colors.state.pending} size={24} />
            </View>
            <Text style={styles.emptyTitle}>{t(language, 'noHabitsToday')}</Text>
            <Text style={styles.emptyText}>{t(language, 'createFirstHabit')}</Text>
          </View>
        ) : (
          <View style={styles.groups}>
            <HabitGroup
              accent={colors.brand.cyanCore}
              habits={pendingHabits}
              label={t(language, 'pending')}
              language={language}
              onFail={failHabit}
              onIncrement={incrementHabit}
              onUndo={undoHabit}
            />
            <HabitGroup
              accent={colors.state.completed}
              habits={completedHabits}
              label={t(language, 'completed')}
              language={language}
              onFail={failHabit}
              onIncrement={incrementHabit}
              onUndo={undoHabit}
            />
            <HabitGroup
              accent={colors.state.failed}
              habits={failedHabits}
              label={t(language, 'failed')}
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
    marginBottom: 12,
  },
  missionIcon: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  missionCompleteIcon: {
    borderColor: colors.state.completed,
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
  systemText: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3,
  },
  missionCount: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayBold,
    fontSize: 15,
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
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 24,
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
  },
  emptyText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
