import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { HabitForm } from '@/components/HabitForm';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { HabitInput, HabitRecord } from '@/db/repository';
import { t } from '@/i18n';
import { confirmAction } from '@/lib/confirm';
import { useAppStore } from '@/stores/appStore';
import { colors, typography } from '@/theme/colors';

export default function HabitEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [habit, setHabit] = useState<HabitRecord | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const getHabitById = useAppStore((state) => state.getHabitById);
  const saveHabit = useAppStore((state) => state.saveHabit);
  const archiveHabitById = useAppStore((state) => state.archiveHabitById);
  const unarchiveHabitById = useAppStore((state) => state.unarchiveHabitById);
  const language = useAppStore((state) => state.language);
  const isBusy = useAppStore((state) => state.isBusy);

  const loadHabit = useCallback(() => {
    if (!id) return;
    setLoadFailed(false);
    getHabitById(id).then(setHabit, () => setLoadFailed(true));
  }, [getHabitById, id]);

  useEffect(loadHabit, [loadHabit]);

  async function handleSave(input: HabitInput) {
    if (!id) return;
    // Volver en vez de reemplazar: el detalle que abrió esta pantalla sigue debajo y recarga al
    // recuperar el foco. Si falla, el store ya avisó y el formulario sigue abierto.
    if (await saveHabit(input, id)) router.back();
  }

  async function archiveCurrentHabit() {
    if (!id) return;
    if (await archiveHabitById(id)) router.back();
  }

  async function unarchiveCurrentHabit() {
    if (!id) return;
    if (await unarchiveHabitById(id)) loadHabit();
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
            isSaving={isBusy}
            language={language}
            onArchive={handleArchive}
            onCancel={() => router.back()}
            onSave={(input) => void handleSave(input)}
          />
        </ScrollView>
      ) : loadFailed ? (
        <View style={styles.loadError}>
          <Text style={styles.loadErrorText}>{t(language, 'habitLoadFailed')}</Text>
          <Button label={t(language, 'retry')} onPress={loadHabit} variant="secondary" />
        </View>
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
  loadError: {
    gap: 14,
  },
  loadErrorText: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
  },
});
