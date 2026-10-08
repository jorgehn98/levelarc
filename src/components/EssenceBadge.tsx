import { Gem } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/theme/colors';

type EssenceBadgeProps = {
  value: number;
  size?: number;
  // Sin etiqueta un lector de pantalla solo dice el número.
  accessibilityLabel?: string;
};

export function EssenceBadge({ value, size = 14, accessibilityLabel }: EssenceBadgeProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} accessible={Boolean(accessibilityLabel)} style={styles.badge}>
      <Gem color={colors.brand.cyanCore} size={size} />
      <Text style={[styles.value, { fontSize: size + 1 }]}>{Math.max(0, Math.floor(value))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: `${colors.brand.cyanCore}14`,
    borderColor: colors.brand.cyanShadow,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  value: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayBold,
  },
});
