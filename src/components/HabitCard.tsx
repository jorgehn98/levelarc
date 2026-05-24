import { Check, Plus, RotateCcw, Skull } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { normalizeHabitAttributes } from '@/core/attributes';
import type { TodayHabit } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { getHabitAttribute } from '@/lib/habitAttributes';
import { getHabitIconComponent } from '@/lib/habitIcons';
import { colors, radii, shadows, typography } from '@/theme/colors';

type HabitCardProps = {
  habit: TodayHabit;
  language: Language;
  onIncrement: () => void;
  onFail: () => void;
  onUndo: () => void;
};

export function HabitCard({ habit, language, onIncrement, onFail, onUndo }: HabitCardProps) {
  const isDone = habit.estado === 'completado';
  const isFailed = habit.estado === 'fallado';
  const ratio = habit.meta > 0 ? habit.cantidad / habit.meta : 0;
  const HabitIcon = getHabitIconComponent(habit.icono);
  const attributes = normalizeHabitAttributes(habit.atributos);

  return (
    <View style={[styles.card, isDone && styles.doneCard, isFailed && styles.failedCard]}>
      <View style={[styles.statusRail, isDone && styles.doneRail, isFailed && styles.failedRail]} />
      <View style={styles.topRow}>
        <View style={[styles.iconTile, isDone && styles.doneIconTile, isFailed && styles.failedIconTile]}>
          {isDone ? (
            <Check color={colors.state.completed} size={20} />
          ) : (
            <HabitIcon color={isFailed ? colors.state.pending : colors.brand.cyanCore} size={20} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{habit.nombre}</Text>
          <Text style={styles.meta}>
            {t(language, 'importance')} {habit.importancia} · {habit.tipo === 'binario' ? t(language, 'binary') : `${habit.cantidad}/${habit.meta}`}
          </Text>
          <View style={styles.attributeChips}>
            {attributes.map((attributeId) => {
              const attribute = getHabitAttribute(attributeId);
              return (
                <View key={attribute.id} style={[styles.attributeChip, { borderColor: attribute.color, backgroundColor: `${attribute.color}14` }]}>
                  <Text style={[styles.attributeChipText, { color: attribute.color }]}>{attribute.code}</Text>
                </View>
              );
            })}
          </View>
        </View>
        <Text style={[styles.state, isDone && styles.doneText, isFailed && styles.failedText]}>
          {isDone ? t(language, 'completed') : isFailed ? t(language, 'failed') : t(language, 'pending')}
        </Text>
      </View>

      {habit.tipo === 'contable' ? <ProgressBar ratio={ratio} color={isDone ? colors.state.completed : colors.brand.cyanCore} /> : null}

      <View style={styles.actions}>
        <Button
          disabled={isDone || isFailed}
          icon={habit.tipo === 'binario' ? Check : Plus}
          label={habit.tipo === 'binario' ? t(language, 'complete') : '+1'}
          onPress={onIncrement}
        />
        <Button disabled={isDone || isFailed || habit.cantidad > 0} icon={Skull} label={t(language, 'fail')} onPress={onFail} variant="danger" />
        {(isDone || isFailed || habit.cantidad > 0) ? (
          <Button icon={RotateCcw} label={t(language, 'undo')} onPress={onUndo} variant="secondary" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    padding: 16,
    paddingLeft: 18,
    position: 'relative',
  },
  doneCard: {
    borderColor: colors.state.completed,
    ...shadows.rankGlow(colors.state.completed),
  },
  failedCard: {
    borderColor: colors.state.failed,
    opacity: 0.78,
  },
  statusRail: {
    backgroundColor: colors.brand.cyanCore,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  doneRail: {
    backgroundColor: colors.state.completed,
  },
  failedRail: {
    backgroundColor: colors.state.failed,
    opacity: 0.56,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  doneIconTile: {
    borderColor: colors.state.completed,
  },
  failedIconTile: {
    borderColor: colors.background.border,
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 17,
  },
  meta: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
    marginTop: 4,
  },
  attributeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 8,
  },
  attributeChip: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  attributeChipText: {
    fontFamily: typography.font.displayBold,
    fontSize: 8,
  },
  state: {
    color: colors.state.pending,
    borderColor: colors.state.pending,
    borderRadius: radii.sm,
    borderWidth: 1,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    letterSpacing: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  doneText: {
    borderColor: colors.state.completed,
    color: colors.state.completed,
  },
  failedText: {
    borderColor: colors.state.failed,
    color: colors.state.failed,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
