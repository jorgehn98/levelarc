import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors, typography } from '@/theme/colors';

export default function RankUpScreen() {
  return (
    <Screen>
      <Text style={styles.kicker}>ASCENSO CONFIRMADO</Text>
      <Text style={styles.title}>Nuevo rango</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 13,
    letterSpacing: 0,
    marginBottom: 10,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 36,
    letterSpacing: 0,
  },
});
