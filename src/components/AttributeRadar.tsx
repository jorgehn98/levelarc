import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { attributeIds, getAttributeLevelProgress, normalizeAttributeXp, type AttributeXp } from '@/core/attributes';
import { t, type Language } from '@/i18n';
import { getHabitAttribute } from '@/lib/habitAttributes';
import { colors, radii, typography } from '@/theme/colors';

type AttributeRadarProps = {
  attributeXp: AttributeXp | null | undefined;
  language: Language;
};

const size = 230;
const center = size / 2;
const radius = 72;
const rings = [0.33, 0.66, 1];
const radarLevelScale = 20;

export function AttributeRadar({ attributeXp, language }: AttributeRadarProps) {
  const xp = normalizeAttributeXp(attributeXp);
  const items = attributeIds.map((id, index) => {
    const attribute = getHabitAttribute(id);
    const progress = getAttributeLevelProgress(xp[id]);
    const angle = getAngle(index);
    const ratio = Math.min(1, (progress.level - 1 + progress.ratio) / radarLevelScale);
    return {
      ...attribute,
      progress,
      point: getPoint(angle, radius * ratio),
      axis: getPoint(angle, radius),
      labelPoint: getPoint(angle, radius + 25),
    };
  });
  const polygonPoints = items.map((item) => `${item.point.x},${item.point.y}`).join(' ');

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t(language, 'statusMatrix')}</Text>
        <Text style={styles.title}>{t(language, 'attributeProfile')}</Text>
      </View>

      <View style={styles.radarWrap}>
        <Svg height={size} width={size}>
          {rings.map((ring) => {
            const points = attributeIds.map((_, index) => {
              const point = getPoint(getAngle(index), radius * ring);
              return `${point.x},${point.y}`;
            }).join(' ');
            return <Polygon key={ring} fill="none" points={points} stroke={colors.background.borderBright} strokeWidth={1} />;
          })}
          {items.map((item) => (
            <Line key={item.id} stroke={colors.background.borderBright} strokeWidth={1} x1={center} x2={item.axis.x} y1={center} y2={item.axis.y} />
          ))}
          <Polygon fill={`${colors.brand.cyanCore}33`} points={polygonPoints} stroke={colors.brand.cyanCore} strokeWidth={2} />
          {items.map((item) => (
            <Circle key={item.id} cx={item.point.x} cy={item.point.y} fill={item.color} r={4} />
          ))}
          {items.map((item) => (
            <SvgText
              key={`${item.id}-label`}
              fill={item.color}
              fontSize="9"
              fontWeight="700"
              textAnchor="middle"
              x={item.labelPoint.x}
              y={item.labelPoint.y}
            >
              {t(language, `attr_${item.id}_code`)}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
}

function getAngle(index: number) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / attributeIds.length;
}

function getPoint(angle: number, distance: number) {
  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance,
  };
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
  header: {
    marginBottom: 8,
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 18,
    marginTop: 3,
  },
  radarWrap: {
    alignItems: 'center',
  },
});
