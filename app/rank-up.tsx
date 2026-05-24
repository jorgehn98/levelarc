import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { RankBadge } from '@/components/RankBadge';
import { Screen } from '@/components/Screen';
import { useAppStore } from '@/stores/appStore';
import { colors, radii, shadows, typography } from '@/theme/colors';
import { getRankAccent } from '@/theme/rankAccent';

export default function RankUpScreen() {
  const player = useAppStore((state) => state.player);
  const rank = player?.rango ?? 'E';
  const accent = getRankAccent(rank);

  return (
    <Screen>
      <View style={[styles.panel, { borderColor: accent }, shadows.rankGlow(accent)]}>
        <Text style={[styles.kicker, { color: accent }]}>ASCENSO CONFIRMADO</Text>
        <View style={styles.rankWrap}>
          <RankBadge glow rank={rank} size={118} />
        </View>
        <Text style={styles.title}>Nuevo rango</Text>
        <Text style={styles.copy}>El Sistema ha registrado tu progreso. Continúa la ascensión.</Text>
        <View style={styles.delta}>
          <Text style={styles.deltaLabel}>RANGO ACTUAL</Text>
          <Text style={[styles.deltaValue, { color: accent }]}>{rank}</Text>
        </View>
      </View>

      <Button icon={Sparkles} label="Continuar" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    padding: 22,
  },
  kicker: {
    fontFamily: typography.font.displayMedium,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  rankWrap: {
    marginVertical: 26,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 32,
    textAlign: 'center',
  },
  copy: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  delta: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  deltaLabel: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
  },
  deltaValue: {
    fontFamily: typography.font.displayBold,
    fontSize: 24,
    marginTop: 2,
  },
});
