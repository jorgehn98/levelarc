import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { Screen } from '@/components/Screen';
import { colors, typography } from '@/theme/colors';

export default function OnboardingScreen() {
  return (
    <Screen>
      <View style={styles.hero}>
        <BrandMark size={168} variant="transparent" />
        <Text style={styles.kicker}>LEVELARC</Text>
        <Text style={styles.title}>Sistema activado</Text>
        <Text style={styles.text}>Completa hábitos, gana XP y asciende de rango.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 12,
    letterSpacing: 0,
    marginTop: 16,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 28,
    letterSpacing: 0,
    marginBottom: 10,
    marginTop: 8,
    textAlign: 'center',
  },
  text: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
    fontSize: 16,
    maxWidth: 280,
    textAlign: 'center',
  },
});
