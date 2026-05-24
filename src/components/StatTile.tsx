import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideProps } from 'lucide-react-native';

import { colors, radii, typography } from '@/theme/colors';

type StatTileProps = {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  icon?: ComponentType<LucideProps>;
};

export function StatTile({ label, value, unit, color = colors.brand.bone, icon: Icon }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {Icon ? <Icon color={colors.state.pending} size={14} /> : null}
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 96,
    overflow: 'hidden',
    padding: 14,
    position: 'relative',
  },
  accent: {
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: typography.font.displayBold,
    fontSize: 24,
    lineHeight: 30,
    marginTop: 8,
  },
  unit: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11,
    marginTop: 2,
  },
});
