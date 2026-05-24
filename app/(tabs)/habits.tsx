import { Link } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { t } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';

export default function HabitsScreen() {
  const habits = useAppStore((state) => state.habits);
  const language = useAppStore((state) => state.language);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{t(language, 'habits')}</Text>
        <Link href="/habit/new" asChild>
          <Pressable style={styles.iconButton}>
            <Plus color={colors.background.void} size={22} />
          </Pressable>
        </Link>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={habits}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.rowTitle}>{t(language, 'noHabits')}</Text>
            <Text style={styles.rowText}>{t(language, 'feedSystem')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link href={`/habit/${item.id}`} asChild>
            <Pressable style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{item.nombre}</Text>
                <Text style={styles.rowText}>
                  {t(language, 'importance')} {item.importancia} · {item.tipo === 'binario' ? t(language, 'binary') : t(language, 'goal', { goal: item.meta })} · {item.diasSemana}
                </Text>
              </View>
              <ChevronRight color={colors.state.pending} size={20} />
            </Pressable>
          </Link>
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
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 30,
    letterSpacing: 0,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadows.primaryGlow,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  copy: {
    flex: 1,
    paddingRight: 10,
  },
  empty: {
    alignItems: 'center',
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 24,
  },
  rowTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 16,
  },
  rowText: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 14,
    marginTop: 6,
  },
});
