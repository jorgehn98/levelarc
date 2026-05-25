import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { HabitForm } from '@/components/HabitForm';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { HabitInput } from '@/db/repository';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';

export default function NewHabitScreen() {
  const saveHabit = useAppStore((state) => state.saveHabit);
  const language = useAppStore((state) => state.language);

  async function handleSave(input: HabitInput) {
    await saveHabit(input);
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t(language, 'newHabit') }} />
      <ScreenHeader subtitle={t(language, 'habitRegisterSubtitle')} title={t(language, 'newHabit')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <HabitForm language={language} onCancel={() => router.back()} onSave={(input) => void handleSave(input)} />
      </ScrollView>
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
