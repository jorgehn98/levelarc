import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/theme/colors';

type SystemPanelProps = PropsWithChildren<{
  title: string;
}>;

export function SystemPanel({ title, children }: SystemPanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: colors.background.border,
    backgroundColor: colors.background.surface,
    borderRadius: radii.md,
    padding: 16,
  },
  title: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  content: {
    marginTop: 12,
  },
});
