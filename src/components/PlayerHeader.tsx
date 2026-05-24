import { User } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import type { PlayerRecord } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { colors, radii, shadows, typography } from '@/theme/colors';

type PlayerHeaderProps = {
  player: PlayerRecord | null;
  language: Language;
};

export function PlayerHeader({ player, language }: PlayerHeaderProps) {
  const name = player?.nombre?.trim() || t(language, 'playerId');

  return (
    <View style={[styles.panel, shadows.primaryGlow]}>
      <View style={styles.row}>
        <View style={styles.iconTile}>
          <User color={colors.brand.cyanCore} size={18} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.systemLabel}>{t(language, 'systemOnline')}</Text>
          <Text numberOfLines={1} style={styles.name}>{name}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.borderBright,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  systemLabel: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 20,
    lineHeight: 26,
    marginTop: 2,
  },
});
