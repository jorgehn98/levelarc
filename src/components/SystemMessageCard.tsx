import { router } from 'expo-router';
import { ChevronRight, Cpu, Terminal } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t } from '@/i18n';
import { useAiStore } from '@/stores/aiStore';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, typography } from '@/theme/colors';

// Tarjeta "consola del Sistema" para la pantalla Hoy: muestra el mensaje del día (dailyMessage) como
// una recepción proactiva del Sistema. Toca → abre el chat. Si el mensaje lo generó el LLM local,
// muestra un distintivo "IA"/"AI". Si todavía no hay mensaje (primer instante antes de que
// ensureDailyMessage setee el de plantilla), no renderiza nada para no romper el layout.
export function SystemMessageCard() {
  const language = useAppStore((state) => state.language);
  const dailyMessage = useAiStore((state) => state.dailyMessage);

  if (!dailyMessage) return null;

  return (
    <Pressable
      accessibilityHint={t(language, 'systemMessageTapHint')}
      accessibilityLabel={t(language, 'systemChatLabel')}
      accessibilityRole="button"
      onPress={() => router.push('/system-chat')}
      style={styles.card}
    >
      <View style={styles.icon} pointerEvents="none">
        <Terminal color={colors.brand.cyanCore} size={18} />
      </View>
      <View style={styles.copy} pointerEvents="none">
        <View style={styles.labelRow}>
          <Text style={styles.kicker}>◆ {t(language, 'systemChatLabel')}</Text>
          {dailyMessage.fromAi ? (
            <View style={styles.aiBadge}>
              <Cpu color={colors.brand.cyanCore} size={10} />
              <Text style={styles.aiBadgeText}>{t(language, 'systemMessageAiBadge')}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.message}>{dailyMessage.text}</Text>
      </View>
      <ChevronRight color={colors.brand.cyanCore} size={20} pointerEvents="none" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.background.surfaceRaised,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}14`,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  aiBadge: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}14`,
    borderColor: colors.brand.cyanShadow,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  message: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
