import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { BarChart3, Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import type { HabitInput, HabitRecord, HabitType } from '@/db/repository';
import { maxHabitAttributes, normalizeHabitAttributes, type AttributeId } from '@/core/attributes';
import { getCompletionXp, type HabitImportance } from '@/core/xp';
import { t, type Language } from '@/i18n';
import { habitAttributes } from '@/lib/habitAttributes';
import { defaultHabitIcon, getHabitIconComponent, habitIcons, normalizeHabitIcon, type HabitIconId } from '@/lib/habitIcons';
import { weekDays } from '@/lib/weekdays';
import { colors, radii, typography } from '@/theme/colors';

type HabitFormProps = {
  habit?: HabitRecord | null;
  language: Language;
  onSave: (input: HabitInput) => void;
  onArchive?: () => void;
  onCancel?: () => void;
};

export function HabitForm({ habit, language, onSave, onArchive, onCancel }: HabitFormProps) {
  const [name, setName] = useState(habit?.nombre ?? '');
  const [icon, setIcon] = useState<HabitIconId>(normalizeHabitIcon(habit?.icono ?? defaultHabitIcon));
  const [attributes, setAttributes] = useState<AttributeId[]>(normalizeHabitAttributes(habit?.atributos));
  const [importance, setImportance] = useState<HabitImportance>(habit?.importancia ?? 3);
  const [type, setType] = useState<HabitType>(habit?.tipo ?? 'binario');
  const [goal, setGoal] = useState(String(habit?.meta ?? 1));
  const [days, setDays] = useState<number[]>(
    habit?.diasSemana ? habit.diasSemana.split(',').map(Number) : [],
  );
  const [reminder, setReminder] = useState(habit?.horaRecordatorio ?? '');

  const canSave = name.trim().length > 0 && days.length > 0 && attributes.length > 0;
  const normalizedGoal = useMemo(() => Math.max(1, Number.parseInt(goal, 10) || 1), [goal]);
  const xpPreview = getCompletionXp(importance, 0);

  function toggleDay(dayId: number) {
    setDays((current) =>
      current.includes(dayId) ? current.filter((day) => day !== dayId) : [...current, dayId].sort((a, b) => a - b),
    );
  }

  function selectEveryDay() {
    setDays(weekDays.map((day) => day.id));
  }

  function toggleAttribute(attributeId: AttributeId) {
    setAttributes((current) => {
      if (current.includes(attributeId)) return current.filter((id) => id !== attributeId);
      if (current.length >= maxHabitAttributes) return current;
      return [...current, attributeId];
    });
  }

  function handleSave() {
    onSave({
      nombre: name,
      icono: icon,
      atributos: attributes.join(','),
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
  const PreviewIcon = getHabitIconComponent(icon);

  return (
    <View style={styles.form}>
      <View style={styles.preview}>
        <View style={styles.previewIcon}>
          <PreviewIcon color={colors.brand.cyanCore} size={22} />
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

      <Field label={t(language, 'pickIcon')}>
        <View style={styles.iconGrid}>
          {habitIcons.map((item) => {
            const Icon = item.icon;
            const isSelected = icon === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => setIcon(item.id)}
                style={[styles.iconOption, isSelected && styles.selectedIconOption]}
              >
                <Icon color={isSelected ? colors.background.void : colors.brand.bone} size={20} />
                <Text numberOfLines={1} style={[styles.iconOptionText, isSelected && styles.selectedIconOptionText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label={t(language, 'attributes')}>
        <View style={styles.attributeHeader}>
          <Text style={styles.attributeHelp}>{t(language, 'attributesHelp')}</Text>
          <Text style={styles.attributeCount}>{attributes.length}/{maxHabitAttributes}</Text>
        </View>
        <View style={styles.attributeGrid}>
          {habitAttributes.map((item) => {
            const Icon = item.icon;
            const isSelected = attributes.includes(item.id);
            const isDisabled = !isSelected && attributes.length >= maxHabitAttributes;

            return (
              <Pressable
                key={item.id}
                onPress={() => toggleAttribute(item.id)}
                style={[
                  styles.attributeCard,
                  { borderColor: isSelected ? item.color : colors.background.border },
                  isSelected && { backgroundColor: `${item.color}1F` },
                  isDisabled && styles.disabledAttributeCard,
                ]}
              >
                <View style={styles.attributeTitleRow}>
                  <View style={[styles.attributeIcon, { borderColor: item.color, backgroundColor: `${item.color}1A` }]}>
                    <Icon color={item.color} size={17} />
                  </View>
                  <View style={styles.attributeTitleCopy}>
                    <Text style={[styles.attributeCode, { color: item.color }]}>{item.code}</Text>
                    <Text style={styles.attributeName}>{item.label}</Text>
                  </View>
                </View>
                <Text style={styles.attributeDescription}>{item.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

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
        <View style={styles.importanceGrid}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Pressable
              key={value}
              onPress={() => setImportance(value as HabitImportance)}
              style={[styles.importanceCard, importance === value && styles.selectedCard]}
            >
              <Text style={[styles.importanceValue, importance === value && styles.selectedText]}>{value}</Text>
              <Text style={styles.importanceXp}>+{getCompletionXp(value as HabitImportance, 0)}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label={t(language, 'type')}>
        <View style={styles.typeGrid}>
          <TypeCard
            active={type === 'binario'}
            description={t(language, 'binaryHelp')}
            icon={<Check color={type === 'binario' ? colors.brand.cyanCore : colors.state.pending} size={18} />}
            label={t(language, 'binary')}
            onPress={() => setType('binario')}
          />
          <TypeCard
            active={type === 'contable'}
            description={t(language, 'countableHelp')}
            icon={<BarChart3 color={type === 'contable' ? colors.brand.cyanCore : colors.state.pending} size={18} />}
            label={t(language, 'countable')}
            onPress={() => setType('contable')}
          />
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
        <View style={styles.daysToolbar}>
          <Pressable
            onPress={selectEveryDay}
            style={[styles.quickDayButton, days.length === weekDays.length && styles.selectedQuickDayButton]}
          >
            <Text style={[styles.quickDayText, days.length === weekDays.length && styles.selectedQuickDayText]}>{t(language, 'everyDay')}</Text>
          </Pressable>
        </View>
        <View style={styles.daysGrid}>
          {weekDays.map((day) => (
            <Pressable
              key={day.id}
              onPress={() => toggleDay(day.id)}
              style={[styles.dayButton, days.includes(day.id) && styles.selectedDayButton]}
            >
              <Text style={[styles.dayText, days.includes(day.id) && styles.selectedDayText]}>{day.label}</Text>
            </Pressable>
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

function TypeCard({
  active,
  description,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.typeCard, active && styles.selectedCard]}>
      {icon}
      <Text style={[styles.typeTitle, active && styles.selectedText]}>{label}</Text>
      <Text style={styles.typeDescription}>{description}</Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    width: '100%',
  },
  field: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    padding: 14,
    width: '100%',
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
  importanceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  importanceCard: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
  },
  selectedCard: {
    backgroundColor: `${colors.brand.cyanCore}1A`,
    borderColor: colors.brand.cyanCore,
  },
  importanceValue: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 17,
  },
  selectedText: {
    color: colors.brand.cyanCore,
  },
  importanceXp: {
    color: colors.state.pending,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    marginTop: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    gap: 5,
    minHeight: 64,
    minWidth: 78,
    justifyContent: 'center',
    padding: 8,
  },
  selectedIconOption: {
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
  },
  iconOptionText: {
    color: colors.brand.boneMuted,
    fontFamily: typography.font.displayMedium,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  selectedIconOptionText: {
    color: colors.background.void,
  },
  attributeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  attributeHelp: {
    color: colors.brand.boneMuted,
    flex: 1,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  attributeCount: {
    color: colors.rank.S,
    fontFamily: typography.font.displayBold,
    fontSize: 11,
  },
  attributeGrid: {
    gap: 8,
  },
  attributeCard: {
    backgroundColor: colors.background.card,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 8,
    minHeight: 94,
    padding: 12,
  },
  disabledAttributeCard: {
    opacity: 0.42,
  },
  attributeTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  attributeIcon: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  attributeTitleCopy: {
    flex: 1,
    minWidth: 0,
  },
  attributeCode: {
    fontFamily: typography.font.displayBold,
    fontSize: 10,
  },
  attributeName: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
    marginTop: 2,
  },
  attributeDescription: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  typeCard: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 112,
    padding: 12,
  },
  typeTitle: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  typeDescription: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
  },
  daysGrid: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  daysToolbar: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  quickDayButton: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  selectedQuickDayButton: {
    backgroundColor: `${colors.brand.cyanCore}1A`,
    borderColor: colors.brand.cyanCore,
  },
  quickDayText: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  selectedQuickDayText: {
    color: colors.brand.cyanCore,
  },
  dayButton: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  selectedDayButton: {
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
  },
  dayText: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 12,
  },
  selectedDayText: {
    color: colors.background.void,
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
