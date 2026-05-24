import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import type { HabitInput, HabitRecord, HabitType } from '@/db/repository';
import type { HabitImportance } from '@/core/xp';
import { t, type Language } from '@/i18n';
import { colors } from '@/theme/colors';

const weekDays = [
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'X' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
  { id: 7, label: 'D' },
];

type HabitFormProps = {
  habit?: HabitRecord | null;
  language: Language;
  onSave: (input: HabitInput) => void;
  onArchive?: () => void;
  onCancel?: () => void;
};

export function HabitForm({ habit, language, onSave, onArchive, onCancel }: HabitFormProps) {
  const [name, setName] = useState(habit?.nombre ?? '');
  const [importance, setImportance] = useState<HabitImportance>(habit?.importancia ?? 3);
  const [type, setType] = useState<HabitType>(habit?.tipo ?? 'binario');
  const [goal, setGoal] = useState(String(habit?.meta ?? 1));
  const [days, setDays] = useState<number[]>(
    habit?.diasSemana ? habit.diasSemana.split(',').map(Number) : [],
  );
  const [reminder, setReminder] = useState(habit?.horaRecordatorio ?? '');

  const canSave = name.trim().length > 0 && days.length > 0;
  const normalizedGoal = useMemo(() => Math.max(1, Number.parseInt(goal, 10) || 1), [goal]);

  function toggleDay(dayId: number) {
    setDays((current) =>
      current.includes(dayId) ? current.filter((day) => day !== dayId) : [...current, dayId].sort((a, b) => a - b),
    );
  }

  function handleSave() {
    onSave({
      nombre: name,
      importancia: importance,
      tipo: type,
      meta: type === 'binario' ? 1 : normalizedGoal,
      diasSemana: days.join(','),
      horaRecordatorio: reminder.trim() || null,
    });
  }

  const actions = (
    <View style={styles.actions}>
      {onCancel ? <Button label={t(language, 'cancel')} onPress={onCancel} variant="secondary" /> : null}
      <Button
        disabled={!canSave}
        label={habit ? t(language, 'saveChanges') : t(language, 'createHabit')}
        onPress={handleSave}
      />
    </View>
  );

  return (
    <View style={styles.form}>
      {actions}

      <Field label={t(language, 'name')}>
        <TextInput
          autoFocus
          cursorColor={colors.brand.cyanCore}
          onChangeText={setName}
          placeholder="Ej: Leer 20 minutos"
          placeholderTextColor={colors.state.pending}
          selectionColor={colors.brand.cyanShadow}
          style={styles.input}
          value={name}
        />
      </Field>

      <Field label={t(language, 'importance')}>
        <View style={styles.segmentRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Button
              key={value}
              label={String(value)}
              onPress={() => setImportance(value as HabitImportance)}
              variant={importance === value ? 'selected' : 'secondary'}
            />
          ))}
        </View>
      </Field>

      <Field label={t(language, 'type')}>
        <View style={styles.twoCols}>
          <Button label={t(language, 'binary')} onPress={() => setType('binario')} variant={type === 'binario' ? 'selected' : 'secondary'} />
          <Button label={t(language, 'countable')} onPress={() => setType('contable')} variant={type === 'contable' ? 'selected' : 'secondary'} />
        </View>
      </Field>

      {type === 'contable' ? (
        <Field label={t(language, 'dailyGoal')}>
          <TextInput
            cursorColor={colors.brand.cyanCore}
            keyboardType="number-pad"
            onChangeText={setGoal}
            placeholder="4"
            placeholderTextColor={colors.state.pending}
            selectionColor={colors.brand.cyanShadow}
            style={styles.input}
            value={goal}
          />
        </Field>
      ) : null}

      <Field label={t(language, 'days')}>
        <View style={styles.segmentRow}>
          {weekDays.map((day) => (
            <Button
              key={day.id}
              label={day.label}
              onPress={() => toggleDay(day.id)}
              variant={days.includes(day.id) ? 'selected' : 'secondary'}
            />
          ))}
        </View>
      </Field>

      <Field label={t(language, 'reminder')}>
        <TextInput
          cursorColor={colors.brand.cyanCore}
          onChangeText={setReminder}
          placeholder="08:30"
          placeholderTextColor={colors.state.pending}
          selectionColor={colors.brand.cyanShadow}
          style={styles.input}
          value={reminder}
        />
      </Field>

      {actions}

      {onArchive ? <Button label={t(language, 'archiveHabit')} onPress={onArchive} variant="danger" /> : null}
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 18,
  },
  label: {
    color: colors.brand.cyanCore,
    fontFamily: 'Orbitron_500Medium',
    fontSize: 12,
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.brand.bone,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  twoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
