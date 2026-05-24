import { router } from 'expo-router';
import { Archive, BookOpen, ChevronRight, Dumbbell, ListChecks, Plus, Target } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

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
  const { width } = useWindowDimensions();
  const [filter, setFilter] = useState<HabitFilter>('active');
  const contentWidth = Math.max(280, width - 40);
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

      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <View>
            <Text style={styles.updateMarker}>UI HABITS FIX · b3</Text>
            <View style={styles.filters}>
              <FilterChip active={filter === 'active'} count={counts.active} label={t(language, 'active')} onPress={() => setFilter('active')} width={(contentWidth - 16) / 3} />
              <FilterChip active={filter === 'archived'} count={counts.archived} label={t(language, 'archived')} onPress={() => setFilter('archived')} width={(contentWidth - 16) / 3} />
              <FilterChip active={filter === 'all'} count={counts.all} label={t(language, 'all')} onPress={() => setFilter('all')} width={(contentWidth - 16) / 3} />
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Target color={colors.state.pending} size={22} />
            </View>
            <Text style={styles.rowTitle}>{t(language, 'noHabits')}</Text>
            <Text style={styles.rowText}>{t(language, 'feedSystem')}</Text>
          </View>
        )}
        renderItem={({ item }) => <HabitRow cardWidth={contentWidth} habit={item} language={language} />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function FilterChip({ active, count, label, onPress, width }: { active: boolean; count: number; label: string; onPress: () => void; width: number }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, { width }, active && styles.activeFilter]}>
      <Text style={[styles.filterText, active && styles.activeFilterText]}>{label}</Text>
      <Text style={[styles.filterCount, active && styles.activeFilterText]}>{count}</Text>
    </Pressable>
  );
}

function HabitRow({ cardWidth, habit, language }: { cardWidth: number; habit: HabitRecord; language: Language }) {
  const isArchived = habit.archivado;
  const xp = getCompletionXp(habit.importancia, 0);
  const Icon = habit.tipo === 'contable' ? BookOpen : habit.importancia >= 4 ? Dumbbell : Target;

  return (
    <Pressable onPress={() => router.push(`/habit/${habit.id}`)} style={({ pressed }) => [styles.row, { width: cardWidth }, isArchived && styles.archivedRow, pressed && styles.pressedRow]}>
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
  listContent: {
    alignItems: 'flex-start',
    paddingBottom: 24,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  updateMarker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    marginBottom: 8,
    opacity: 0.72,
    textTransform: 'uppercase',
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
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
  row: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 72,
    marginBottom: 10,
    padding: 12,
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
