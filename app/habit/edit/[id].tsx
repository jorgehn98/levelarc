import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';

import { HabitForm } from '@/components/HabitForm';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { HabitInput, HabitRecord } from '@/db/repository';
import { t } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import { useAppStore } from '@/stores/appStore';
import { colors } from '@/theme/colors';

export default function HabitEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [habit, setHabit] = useState<HabitRecord | null>(null);
  const getHabitById = useAppStore((state) => state.getHabitById);
  const saveHabit = useAppStore((state) => state.saveHabit);
  const archiveHabitById = useAppStore((state) => state.archiveHabitById);
  const unarchiveHabitById = useAppStore((state) => state.unarchiveHabitById);
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    if (id) {
      void getHabitById(id).then(setHabit);
    }
  }, [getHabitById, id]);

  async function handleSave(input: HabitInput) {
    if (!id) return;
    await saveHabit(input, id);
    router.replace(`/habit/${id}`);
  }

  async function archiveCurrentHabit() {
    if (!id) return;
    await archiveHabitById(id);
    router.back();
  }

  async function unarchiveCurrentHabit() {
    if (!id) return;
    await unarchiveHabitById(id);
    const nextHabit = await getHabitById(id);
    setHabit(nextHabit);
  }

  function handleArchive() {
    if (habit?.archivado) {
      confirmAction({
        cancelText: t(language, 'cancel'),
        confirmText: t(language, 'unarchiveHabit'),
        message: t(language, 'unarchiveHabitConfirmCopy'),
        onConfirm: () => void unarchiveCurrentHabit(),
        title: t(language, 'unarchiveHabitConfirmTitle'),
      });
      return;
    }

    confirmAction({
      cancelText: t(language, 'cancel'),
      confirmText: t(language, 'archiveHabit'),
      destructive: true,
      message: t(language, 'archiveHabitConfirmCopy'),
      onConfirm: () => void archiveCurrentHabit(),
      title: t(language, 'archiveHabitConfirmTitle'),
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t(language, 'editHabit') }} />
      <ScreenHeader subtitle={t(language, 'habitEditSubtitle')} title={t(language, 'editHabit')} />
      {habit ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <HabitForm
            habit={habit}
            language={language}
            onArchive={handleArchive}
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
  scroll: {
    alignItems: 'stretch',
    paddingBottom: 30,
    width: '100%',
  },
});
