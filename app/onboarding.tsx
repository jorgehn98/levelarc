import { router } from 'expo-router';
import { ChevronRight, Shield } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { RankBadge } from '@/components/RankBadge';
import { Screen } from '@/components/Screen';
import { colors, radii, shadows, typography } from '@/theme/colors';

export default function OnboardingScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logoWrap}>
          <BrandMark size={148} variant="transparent" />
        </View>

        <Text style={styles.wordmark}>LEVEL<Text style={styles.arc}>ARC</Text></Text>
        <Text style={styles.kicker}>[ SISTEMA ACTIVADO ]</Text>
        <Text style={styles.text}>Completa hábitos, gana XP y asciende de rango. Todo queda en tu dispositivo.</Text>

        <View style={styles.identity}>
          <RankBadge glow rank="E" size={44} />
          <View style={styles.identityCopy}>
            <Text style={styles.identityKicker}>IDENTIDAD INICIAL</Text>
            <Text style={styles.identityTitle}>CAZADOR 001</Text>
            <Text style={styles.identityMeta}>Rango E · Nivel 1 · 0 XP</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button icon={ChevronRight} label="Iniciar ascensión" onPress={() => router.back()} />
        <View style={styles.privacy}>
          <Shield color={colors.state.pending} size={12} />
          <Text style={styles.privacyText}>100% local · sin cuenta · sin servidor</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  logoWrap: {
    alignItems: 'center',
    borderColor: colors.brand.cyanCore,
    borderRadius: 88,
    borderWidth: 1,
    height: 176,
    justifyContent: 'center',
    width: 176,
    ...shadows.primaryGlow,
  },
  wordmark: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 30,
    marginTop: 22,
  },
  arc: {
    color: colors.brand.cyanCore,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    marginTop: 8,
  },
  text: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 14,
    maxWidth: 300,
    textAlign: 'center',
  },
  identity: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 26,
    padding: 12,
    width: '100%',
  },
  identityCopy: {
    flex: 1,
  },
  identityKicker: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
  },
  identityTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 15,
    marginTop: 3,
  },
  identityMeta: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    gap: 10,
    paddingBottom: 8,
  },
  privacy: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  privacyText: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
});
