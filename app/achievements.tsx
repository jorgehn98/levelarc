import { router } from 'expo-router';
import { Award, Check, ChevronLeft, Lock, Trophy } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EssenceBadge } from '@/components/EssenceBadge';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { getAchievements, type Achievement, type AchievementCategory } from '@/core/achievements';
import { t, type Language } from '@/i18n';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';

// Orden fijo de categorías y su clave i18n de etiqueta. Mantiene un recorrido aspiracional:
// de los primeros pasos hasta la colección.
const CATEGORY_ORDER: { id: AchievementCategory; labelKey: Parameters<typeof t>[1] }[] = [
  { id: 'inicio', labelKey: 'achCatInicio' },
  { id: 'constancia', labelKey: 'achCatConstancia' },
  { id: 'progresion', labelKey: 'achCatProgresion' },
  { id: 'misiones', labelKey: 'achCatMisiones' },
  { id: 'atributos', labelKey: 'achCatAtributos' },
  { id: 'coleccion', labelKey: 'achCatColeccion' },
];

export default function AchievementsScreen() {
  const language = useAppStore((state) => state.language);
  const unlockedAchievements = useAppStore((state) => state.unlockedAchievements);
  const unlockedSet = new Set(unlockedAchievements);

  const achievements = getAchievements();
  const total = achievements.length;
  const unlockedCount = achievements.filter((entry) => unlockedSet.has(entry.id)).length;

  return (
    <Screen>
      <ScreenHeader
        action={
          <Pressable
            accessibilityLabel={t(language, 'goBack')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ChevronLeft color={colors.brand.cyanCore} size={20} />
          </Pressable>
        }
        icon={Trophy}
        subtitle={t(language, 'achievementsSubtitle')}
        title={t(language, 'achievements')}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <Trophy color={colors.brand.cyanCore} size={20} />
          <Text style={styles.summaryText}>
            {t(language, 'achievementsProgress', { n: unlockedCount, total })}
          </Text>
        </View>

        {CATEGORY_ORDER.map(({ id, labelKey }) => {
          const items = sortAchievements(
            achievements.filter((entry) => entry.category === id),
            unlockedSet,
          );
          if (items.length === 0) return null;
          const unlockedInCategory = items.filter((entry) => unlockedSet.has(entry.id)).length;

          return (
            <View key={id} style={styles.section}>
              <SectionHeader count={`${unlockedInCategory}/${items.length}`} label={t(language, labelKey)} />
              <View style={styles.cards}>
                {items.map((item) => (
                  <AchievementCard
                    achievement={item}
                    key={item.id}
                    language={language}
                    unlocked={unlockedSet.has(item.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

// Desbloqueados primero; dentro de cada grupo, por coste ascendente para que la progresión se lea natural.
function sortAchievements(items: Achievement[], unlockedSet: Set<string>): Achievement[] {
  return [...items].sort((a, b) => {
    const aUnlocked = unlockedSet.has(a.id) ? 0 : 1;
    const bUnlocked = unlockedSet.has(b.id) ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    return a.essenceReward - b.essenceReward;
  });
}

function AchievementCard({
  achievement,
  language,
  unlocked,
}: {
  achievement: Achievement;
  language: Language;
  unlocked: boolean;
}) {
  const name = t(language, achievement.nameKey as Parameters<typeof t>[1]);
  const description = t(language, achievement.descKey as Parameters<typeof t>[1]);
  const Icon = unlocked ? Award : Lock;
  const iconColor = unlocked ? colors.state.completed : colors.state.pending;

  return (
    <View
      style={[
        styles.card,
        unlocked ? [styles.cardUnlocked, shadows.rankGlow(colors.state.completed)] : styles.cardLocked,
      ]}
    >
      <View style={[styles.iconTile, unlocked && styles.iconTileUnlocked]}>
        <Icon color={iconColor} size={20} />
      </View>

      <View style={styles.cardCopy}>
        <Text style={styles.cardName}>{name}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
        <View style={styles.cardMeta}>
          <EssenceBadge size={12} value={achievement.essenceReward} />
          {unlocked ? (
            <View style={styles.unlockedTag}>
              <Check color={colors.state.completed} size={13} />
              <Text style={styles.unlockedTagText}>{t(language, 'achievementUnlockedTag')}</Text>
            </View>
          ) : (
            <View style={styles.lockedTag}>
              <Lock color={colors.state.pending} size={11} />
              <Text style={styles.lockedTagText}>{t(language, 'achievementLocked')}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: 18,
    paddingBottom: 28,
  },
  summary: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.brand.cyanShadow,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  summaryText: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 16,
  },
  section: {
    gap: 10,
  },
  cards: {
    gap: 10,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  cardUnlocked: {
    borderColor: colors.state.completed,
  },
  cardLocked: {
    opacity: 0.55,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconTileUnlocked: {
    backgroundColor: `${colors.state.completed}1A`,
    borderColor: colors.state.completed,
  },
  cardCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  cardName: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
  },
  cardDesc: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  cardMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  unlockedTag: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  unlockedTagText: {
    color: colors.state.completed,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  lockedTag: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  lockedTagText: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
