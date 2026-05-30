import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { getAttributeLevelProgress, type AttributeId } from '@/core/attributes';
import { t, type Language } from '@/i18n';
import { getHabitAttribute } from '@/lib/habitAttributes';
import { colors, radii, typography } from '@/theme/colors';

type AttributeRowProps = {
  id: AttributeId;
  xp: number;
  language: Language;
};

// Fila legible de un atributo: icono + nombre + nivel actual y una barra de progreso al siguiente
// nivel. Reusa el color del atributo (mismo que el radar) para mantener coherencia visual.
export function AttributeRow({ id, xp, language }: AttributeRowProps) {
  const attribute = getHabitAttribute(id);
  const Icon = attribute.icon;
  const progress = getAttributeLevelProgress(xp);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { borderColor: `${attribute.color}66`, backgroundColor: `${attribute.color}1A` }]}>
        <Icon color={attribute.color} size={16} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{t(language, `attr_${id}`)}</Text>
          <Text style={[styles.level, { color: attribute.color }]}>{t(language, 'level', { level: progress.level })}</Text>
        </View>
        <ProgressBar ratio={progress.ratio} color={attribute.color} />
      </View>
      <Text style={styles.percent}>{Math.round(progress.ratio * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  body: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  name: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 13,
  },
  level: {
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  percent: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    minWidth: 34,
    textAlign: 'right',
  },
});
