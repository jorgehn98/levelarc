import { Check, Plus, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ProgressBar } from '@/components/ProgressBar';
import { normalizeHabitAttributes } from '@/core/attributes';
import { getCompletionXp, type HabitImportance } from '@/core/xp';
import type { TodayHabit } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { getHabitAttribute } from '@/lib/habitAttributes';
import { getHabitIconComponent } from '@/lib/habitIcons';
import { colors, radii, typography } from '@/theme/colors';

type HabitCardProps = {
  habit: TodayHabit;
  language: Language;
  onIncrement: () => void;
  onFail: () => void;
  onUndo: () => void;
  onOpenDetail?: () => void;
};

export function HabitCard({ habit, language, onIncrement, onFail, onOpenDetail, onUndo }: HabitCardProps) {
  const isDone = habit.estado === 'completado';
  const isFailed = habit.estado === 'fallado';
  const isPending = !isDone && !isFailed;
  const ratio = habit.meta > 0 ? habit.cantidad / habit.meta : 0;
  const HabitIcon = getHabitIconComponent(habit.icono);
  const attributes = normalizeHabitAttributes(habit.atributos);
  const accent = isDone ? colors.state.completed : isFailed ? colors.state.failed : colors.brand.cyanCore;
  const xp = getCompletionXp(habit.importancia as HabitImportance, 0);
  const ActionIcon = habit.tipo === 'binario' ? Check : Plus;
  const stateLabel = isDone ? t(language, 'completed') : isFailed ? t(language, 'failed') : t(language, 'pending');

  // Micro-feedback: un destello sutil del color `completed` sobre la tarjeta justo en la transición
  // pendiente → completado, para que rematar un hábito se sienta. No bloquea toques (pointerEvents
  // none) y no se dispara en el primer render (solo cuando el estado realmente cambia).
  const flash = useSharedValue(0);
  const wasDone = useRef(isDone);
  useEffect(() => {
    if (isDone && !wasDone.current) {
      flash.value = withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) }),
      );
    }
    wasDone.current = isDone;
  }, [isDone, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value * 0.22 }));

  return (
    <View style={[styles.card, { borderColor: accent }, isDone && styles.doneCard, isFailed && styles.failedCard]}>
      <Animated.View pointerEvents="none" style={[styles.completeFlash, flashStyle]} />
      <View style={[styles.statusRail, { backgroundColor: accent }]} />
      <View style={styles.topRow}>
        <Pressable
          accessibilityLabel={habit.nombre}
          accessibilityRole="button"
          disabled={!onOpenDetail}
          onPress={onOpenDetail}
          style={[styles.iconTile, { borderColor: accent, backgroundColor: `${accent}10` }, isFailed && styles.failedIconTile]}
        >
          {isDone ? (
            <Check color={colors.state.completed} size={20} />
          ) : (
            <HabitIcon color={isFailed ? colors.state.pending : colors.brand.cyanCore} size={20} />
          )}
        </Pressable>

        <View style={styles.copy}>
          <Text style={[styles.title, isFailed && styles.failedTitle]} numberOfLines={2}>{habit.nombre}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.xpText}>+{xp} XP</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.importanceText}>◆ {habit.importancia}</Text>
            {attributes.length > 0 ? <Text style={styles.metaDot}>·</Text> : null}
            {attributes.map((attributeId) => {
              const attribute = getHabitAttribute(attributeId);
              return (
                <Text key={attribute.id} style={[styles.attributeCode, { color: attribute.color }]}>
                  {attribute.code}
                </Text>
              );
            })}
          </View>
        </View>

        <Text style={[styles.state, { borderColor: accent, color: accent }]} numberOfLines={1}>
          {stateLabel}
        </Text>
      </View>

      {habit.tipo === 'contable' ? (
        <View style={styles.progressBlock}>
          <Text style={styles.progressText}>{habit.cantidad}/{habit.meta}</Text>
          <ProgressBar ratio={ratio} color={accent} />
        </View>
      ) : null}

      {isPending ? (
        <View style={styles.pendingActions}>
          <Pressable accessibilityRole="button" onPress={onIncrement} style={styles.completeButton}>
            <ActionIcon color={colors.background.void} size={18} />
            <Text style={styles.completeButtonText}>{habit.tipo === 'binario' ? t(language, 'complete') : '+1'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={habit.cantidad > 0}
            onPress={onFail}
            style={[styles.failButton, habit.cantidad > 0 && styles.disabledFailButton]}
          >
            <X color={habit.cantidad > 0 ? colors.state.pending : colors.state.failed} size={22} />
          </Pressable>
        </View>
      ) : null}

      {(isDone || isFailed || habit.cantidad > 0) ? (
        <Pressable accessibilityRole="button" onPress={onUndo} style={styles.undoButton}>
          <RotateCcw color={colors.brand.boneMuted} size={13} />
          <Text style={styles.undoText}>{t(language, 'undo')}</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.cornerDots, { color: accent }]}>•••</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    padding: 14,
    paddingLeft: 18,
    paddingBottom: 18,
    position: 'relative',
  },
  doneCard: {
    backgroundColor: `${colors.background.card}F2`,
  },
  failedCard: {
    opacity: 0.78,
  },
  completeFlash: {
    backgroundColor: colors.state.completed,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  statusRail: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
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
    borderRadius: radii.md,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  failedIconTile: {
    borderColor: colors.background.border,
    backgroundColor: colors.background.surface,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodySemiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  failedTitle: {
    color: colors.state.pending,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 4,
  },
  xpText: {
    color: colors.rank.S,
    fontFamily: typography.font.displayBold,
    fontSize: 12,
  },
  metaDot: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 11,
  },
  importanceText: {
    color: colors.state.streak,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
  attributeCode: {
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  state: {
    borderRadius: radii.sm,
    borderWidth: 1,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    letterSpacing: 0,
    maxWidth: 112,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  progressBlock: {
    gap: 6,
    marginTop: -2,
  },
  progressText: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
  },
  pendingActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  completeButton: {
    alignItems: 'center',
    backgroundColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 46,
    justifyContent: 'center',
  },
  completeButtonText: {
    color: colors.background.void,
    fontFamily: typography.font.bodySemiBold,
    fontSize: 15,
  },
  failButton: {
    alignItems: 'center',
    borderColor: colors.state.failed,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    width: 50,
  },
  disabledFailButton: {
    borderColor: colors.background.borderBright,
    opacity: 0.45,
  },
  undoButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 5,
  },
  undoText: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.bodyRegular,
    fontSize: 13,
  },
  cornerDots: {
    bottom: 6,
    fontFamily: typography.font.displayBold,
    fontSize: 13,
    position: 'absolute',
    right: 10,
  },
});
