import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme/colors';

type SectionHeaderProps = {
  label: string;
  count?: string | number;
  accent?: string;
};

export function SectionHeader({ label, count, accent = colors.brand.cyanCore }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: accent, shadowColor: accent }]} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
      {count !== undefined ? <Text style={styles.count}>{count}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    borderRadius: 3,
    height: 6,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    width: 6,
  },
  label: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  line: {
    backgroundColor: colors.background.border,
    flex: 1,
    height: 1,
    opacity: 0.8,
  },
  count: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
});
