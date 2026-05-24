import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { HabitForm } from '@/components/HabitForm';
import { Screen } from '@/components/Screen';
import type { HabitInput } from '@/db/repository';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors } from '@/theme/colors';

export default function NewHabitScreen() {
  const saveHabit = useAppStore((state) => state.saveHabit);
  const language = useAppStore((state) => state.language);

  async function handleSave(input: HabitInput) {
    await saveHabit(input);
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Nuevo hábito' }} />
      <Text style={styles.title}>{t(language, 'newHabit')}</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <HabitForm language={language} onSave={(input) => void handleSave(input)} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.brand.bone,
    fontFamily: 'Orbitron_700Bold',
    fontSize: 28,
    letterSpacing: 0,
    marginBottom: 18,
  },
  scroll: {
    paddingBottom: 30,
  },
});
