import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Target } from 'lucide-react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import type { HabitInput, HabitRecord, HabitType } from '@/db/repository';
import { getCompletionXp, type HabitImportance } from '@/core/xp';
import { t, type Language } from '@/i18n';
import { colors, radii, typography } from '@/theme/colors';

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
  const xpPreview = getCompletionXp(importance, 0);

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
      {onCancel ? <Button label={t(language, 'cancel')} onPress={onCancel} style={styles.actionButton} variant="secondary" /> : null}
      <Button
        disabled={!canSave}
        label={habit ? t(language, 'saveChanges') : t(language, 'createHabit')}
        onPress={handleSave}
        style={styles.primaryAction}
      />
    </View>
  );

  return (
    <View style={styles.form}>
      <View style={styles.preview}>
        <View style={styles.previewIcon}>
          <Target color={colors.brand.cyanCore} size={22} />
        </View>
        <View style={styles.previewCopy}>
          <Text style={styles.previewKicker}>{t(language, 'habitPreview')}</Text>
          <Text numberOfLines={1} style={[styles.previewName, !name.trim() && styles.previewPlaceholder]}>
            {name.trim() || t(language, 'namePlaceholder')}
          </Text>
          <Text style={styles.previewMeta}>
            +{xpPreview} XP · {type === 'binario' ? t(language, 'binary') : t(language, 'goal', { goal: normalizedGoal })}
          </Text>
        </View>
      </View>

      <Field label={t(language, 'name')}>
        <TextInput
          autoFocus
          cursorColor={colors.brand.cyanCore}
          onChangeText={setName}
          placeholder={t(language, 'namePlaceholder')}
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
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 12,
    letterSpacing: 0,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    color: colors.brand.bone,
    fontFamily: typography.font.bodyRegular,
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
  actionButton: {
    flex: 1,
  },
  primaryAction: {
    flex: 2,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  previewIcon: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  previewCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewKicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  previewName: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 15,
    marginTop: 4,
  },
  previewPlaceholder: {
    color: colors.state.pending,
  },
  previewMeta: {
    color: colors.rank.S,
    fontFamily: typography.font.displayMedium,
    fontSize: 11,
    marginTop: 3,
  },
});
