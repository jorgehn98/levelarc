import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';

import { HabitForm } from '@/components/HabitForm';
import { Screen } from '@/components/Screen';
import type { HabitInput, HabitRecord } from '@/db/repository';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, typography } from '@/theme/colors';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [habit, setHabit] = useState<HabitRecord | null>(null);
  const getHabitById = useAppStore((state) => state.getHabitById);
  const saveHabit = useAppStore((state) => state.saveHabit);
  const archiveHabitById = useAppStore((state) => state.archiveHabitById);
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (id) {
      void getHabitById(id).then(setHabit);
    }
  }, [getHabitById, id]);

  async function handleSave(input: HabitInput) {
    if (!id) return;
    await saveHabit(input, id);
    router.back();
  }

  async function handleArchive() {
    if (!id) return;
    await archiveHabitById(id);
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Hábito' }} />
      <Text style={styles.title}>{t(language, 'editHabit')}</Text>
      {habit ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <HabitForm
            habit={habit}
            language={language}
            onArchive={() => void handleArchive()}
            onCancel={() => router.back()}
            onSave={(input) => void handleSave(input)}
          />
        </ScrollView>
      ) : (
        <ActivityIndicator color={colors.brand.cyanCore} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 28,
    letterSpacing: 0,
    marginBottom: 18,
  },
  scroll: {
    paddingBottom: 30,
  },
});
