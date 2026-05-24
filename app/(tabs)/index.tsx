import { Link } from 'expo-router';
import { Gift, Plus } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { HabitCard } from '@/components/HabitCard';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { SystemPanel } from '@/components/SystemPanel';
import { getDailyMissionProgress } from '@/core/missions';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors } from '@/theme/colors';

export default function TodayScreen() {
  const todayHabits = useAppStore((state) => state.todayHabits);
  const dailyMission = useAppStore((state) => state.dailyMission);
  const incrementHabit = useAppStore((state) => state.incrementHabit);
  const failHabit = useAppStore((state) => state.failHabit);
  const undoHabit = useAppStore((state) => state.undoHabit);
  const claimMission = useAppStore((state) => state.claimMission);
  const language = useAppStore((state) => state.language);
  const mission = getDailyMissionProgress(dailyMission?.completados ?? 0, dailyMission?.objetivo ?? 3);
  const canClaim = mission.isComplete && !dailyMission?.reclamada;

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{t(language, 'systemOnline')}</Text>
          <Text style={styles.title}>{t(language, 'today')}</Text>
        </View>
        <Link href="/habit/new" asChild>
          <Pressable style={styles.iconButton}>
            <Plus color={colors.background.void} size={22} />
          </Pressable>
        </Link>
      </View>

      <SystemPanel title={t(language, 'dailyMission')}>
        <Text style={styles.systemText}>{t(language, 'completeThree')}</Text>
        <ProgressBar ratio={mission.ratio} />
        <Text style={styles.metaText}>
          {t(language, 'completedCount', { done: mission.completed, target: mission.target })}
        </Text>
        {canClaim ? (
          <View style={styles.claim}>
            <Button icon={Gift} label={t(language, 'claimXp', { xp: dailyMission?.xpBonus ?? 10 })} onPress={claimMission} />
          </View>
        ) : null}
      </SystemPanel>

      <FlatList
        contentContainerStyle={styles.list}
        data={todayHabits}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t(language, 'noHabitsToday')}</Text>
            <Text style={styles.emptyText}>{t(language, 'createFirstHabit')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <HabitCard
            habit={item}
            language={language}
            onFail={() => void failHabit(item.id)}
            onIncrement={() => void incrementHabit(item.id)}
            onUndo={() => void undoHabit(item.id)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: 'Orbitron_500Medium',
    fontSize: 12,
    letterSpacing: 0,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: 'Orbitron_700Bold',
    fontSize: 34,
    letterSpacing: 0,
    marginTop: 4,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.cyanCore,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  systemText: {
    color: colors.brand.bone,
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  metaText: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 8,
  },
  claim: {
    marginTop: 14,
  },
  list: {
    gap: 12,
    paddingTop: 18,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    borderColor: colors.background.border,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 18,
    padding: 24,
  },
  emptyTitle: {
    color: colors.brand.bone,
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
  },
  emptyText: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
