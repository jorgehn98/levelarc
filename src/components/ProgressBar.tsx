import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme/colors';

type ProgressBarProps = {
  ratio: number;
  color?: string;
};

export function ProgressBar({ ratio, color = colors.brand.cyanCore }: ProgressBarProps) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { backgroundColor: color, width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 3,
    height: '100%',
  },
});
