import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, typography, type Rank } from '@/theme/colors';

type RankBadgeProps = {
  rank: Rank;
  size?: number;
  glow?: boolean;
};

export function RankBadge({ rank, size = 52, glow }: RankBadgeProps) {
  const accent = colors.rank[rank];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: accent,
          borderColor: accent,
          height: size,
          width: size,
        },
        glow && shadows.rankGlow(accent),
      ]}
    >
      <Text style={[styles.label, { fontSize: Math.round(size * 0.48), lineHeight: Math.round(size * 0.58) }]}>{rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  label: {
    color: colors.background.void,
    fontFamily: typography.font.displayBold,
  },
});
