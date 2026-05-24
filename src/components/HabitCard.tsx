import { Check, RotateCcw, Skull, Plus } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import type { TodayHabit } from '@/db/repository';
import { t, type Language } from '@/i18n';
import { colors } from '@/theme/colors';

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

  return (
    <View style={[styles.card, isDone && styles.doneCard, isFailed && styles.failedCard]}>
      <View style={styles.topRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>{habit.nombre}</Text>
          <Text style={styles.meta}>
            {t(language, 'importance')} {habit.importancia} · {habit.tipo === 'binario' ? t(language, 'binary') : `${habit.cantidad}/${habit.meta}`}
          </Text>
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
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  doneCard: {
    borderColor: colors.state.completed,
  },
  failedCard: {
    borderColor: colors.state.failed,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: 'Inter_500Medium',
    fontSize: 17,
  },
  meta: {
    color: colors.state.pending,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  state: {
    color: colors.state.pending,
    fontFamily: 'Orbitron_500Medium',
    fontSize: 10,
    letterSpacing: 0,
  },
  doneText: {
    color: colors.state.completed,
  },
  failedText: {
    color: colors.state.failed,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
