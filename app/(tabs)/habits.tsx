import { router } from 'expo-router';
import { Archive, BookOpen, ChevronRight, Dumbbell, ListChecks, Plus, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getCompletionXp } from '@/core/xp';
import type { HabitRecord } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';

type HabitFilter = 'active' | 'archived' | 'all';

export default function HabitsScreen() {
  const habits = useAppStore((state) => state.habits);
  const language = useAppStore((state) => state.language);
  const [filter, setFilter] = useState<HabitFilter>('active');
  const counts = {
    active: habits.filter((habit) => !habit.archivado).length,
    archived: habits.filter((habit) => habit.archivado).length,
    all: habits.length,
  };
  const filtered = habits.filter((habit) => {
    if (filter === 'all') return true;
    if (filter === 'archived') return habit.archivado;
    return !habit.archivado;
  });

  return (
    <Screen>
      <ScreenHeader
        icon={ListChecks}
        subtitle={t(language, 'registeredMissions')}
        title={t(language, 'habits')}
        action={(
          <Pressable onPress={() => router.push('/habit/new')} style={styles.iconButton}>
            <Plus color={colors.background.void} size={22} />
          </Pressable>
        )}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} style={styles.scroll}>
        <View style={styles.filters}>
          <FilterChip active={filter === 'active'} count={counts.active} label={t(language, 'active')} onPress={() => setFilter('active')} />
          <FilterChip active={filter === 'archived'} count={counts.archived} label={t(language, 'archived')} onPress={() => setFilter('archived')} />
          <FilterChip active={filter === 'all'} count={counts.all} label={t(language, 'all')} onPress={() => setFilter('all')} />
        </View>

        <Text style={styles.debugText}>QA HABITS v4 · activos {counts.active} · mostrados {filtered.length} · total {counts.all}</Text>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Target color={colors.state.pending} size={22} />
            </View>
            <Text style={styles.rowTitle}>{t(language, 'noHabits')}</Text>
            <Text style={styles.rowText}>{t(language, 'feedSystem')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((habit, index) => (
              <HabitRow key={`${habit.id}-${index}`} habit={habit} language={language} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function FilterChip({ active, count, label, onPress }: { active: boolean; count: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, active && styles.activeFilter]}>
      <Text style={[styles.filterText, active && styles.activeFilterText]}>{label}</Text>
      <Text style={[styles.filterCount, active && styles.activeFilterText]}>{count}</Text>
    </Pressable>
  );
}

function HabitRow({ habit, language }: { habit: HabitRecord; language: Language }) {
  const isArchived = habit.archivado;
  const xp = getCompletionXp(habit.importancia, 0);
  const Icon = habit.tipo === 'contable' ? BookOpen : habit.importancia >= 4 ? Dumbbell : Target;

  return (
    <View style={[styles.habitCard, isArchived && styles.archivedRow]}>
      <View style={styles.statusRail} />
      <Pressable onPress={() => router.push(`/habit/${habit.id}`)} style={({ pressed }) => [styles.rowContent, pressed && styles.pressedRow]}>
        <View style={[styles.rowIcon, isArchived && styles.archivedIcon]}>
          {isArchived ? <Archive color={colors.state.pending} size={19} /> : <Icon color={colors.brand.cyanCore} size={19} />}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.rowTitle, isArchived && styles.archivedText]}>{habit.nombre}</Text>
          <View style={styles.metaLine}>
            <Text style={styles.xpText}>+{xp} XP</Text>
            <Text style={styles.dotText}>·</Text>
            <Text numberOfLines={1} style={styles.rowText}>
              {habit.tipo === 'binario' ? t(language, 'binary') : t(language, 'goal', { goal: habit.meta })}
            </Text>
            <Text style={styles.dotText}>·</Text>
            <Text style={styles.streakText}>{habit.diasSemana}</Text>
          </View>
          <View style={styles.importanceLine}>
            {Array.from({ length: 5 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.importanceDot,
                  index < habit.importancia ? styles.activeImportanceDot : styles.inactiveImportanceDot,
                  isArchived && styles.archivedImportanceDot,
                ]}
              />
            ))}
          </View>
        </View>
        <ChevronRight color={colors.state.pending} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadows.primaryGlow,
  },
  scroll: {
    alignSelf: 'stretch',
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'stretch',
    flexGrow: 1,
    paddingBottom: 24,
    width: '100%',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  debugText: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    marginBottom: 10,
    opacity: 0.78,
    textTransform: 'uppercase',
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 8,
  },
  activeFilter: {
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
  },
  filterText: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  filterCount: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  activeFilterText: {
    color: colors.background.void,
  },
  habitCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.background.card,
    borderColor: colors.background.borderBright,
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 72,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
    ...shadows.primaryGlow,
  },
  statusRail: {
    backgroundColor: colors.brand.cyanCore,
    bottom: 0,
    left: 0,
    opacity: 0.88,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  rowContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 12,
    width: '100%',
  },
  list: {
    alignSelf: 'stretch',
    gap: 10,
    width: '100%',
  },
  pressedRow: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  archivedRow: {
    opacity: 0.58,
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  archivedIcon: {
    borderColor: colors.background.border,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  empty: {
    alignItems: 'center',
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 24,
    width: '100%',
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginBottom: 10,
    width: 48,
  },
  rowTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 16,
  },
  archivedText: {
    color: colors.brand.boneMuted,
  },
  rowText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
  },
  metaLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 5,
    minWidth: 0,
  },
  xpText: {
    color: colors.rank.S,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
  dotText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
  },
  streakText: {
    color: colors.state.streak,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
  importanceLine: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 8,
    maxWidth: 86,
  },
  importanceDot: {
    borderRadius: 1,
    height: 2,
    flex: 1,
  },
  activeImportanceDot: {
    backgroundColor: colors.brand.cyanCore,
  },
  inactiveImportanceDot: {
    backgroundColor: colors.background.border,
  },
  archivedImportanceDot: {
    backgroundColor: colors.state.pending,
  },
});
