import type { ReactNode } from 'react';
import { useMemo, useReducer } from 'react';
import { Archive, BarChart3, Check, ChevronDown, ChevronRight, Plus, X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { TimePickerField } from '@/components/TimePickerField';
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
  // Guardado en curso: el botón no admite otro toque hasta que termine.
  isSaving?: boolean;
  onArchive?: () => void;
  onCancel?: () => void;
};

type HabitFormState = {
  name: string;
  icon: HabitIconId;
  attributes: AttributeId[];
  isIconPickerOpen: boolean;
  isAttributePickerOpen: boolean;
  importance: HabitImportance;
  type: HabitType;
  goal: string;
  days: number[];
  reminder: string | null;
};

type HabitFormAction =
  | { type: 'setName'; name: string }
  | { type: 'setIcon'; icon: HabitIconId }
  | { type: 'toggleIconPicker' }
  | { type: 'toggleAttributePicker' }
  | { type: 'closeAttributePicker' }
  | { type: 'toggleAttribute'; attributeId: AttributeId }
  | { type: 'setImportance'; importance: HabitImportance }
  | { type: 'setType'; habitType: HabitType }
  | { type: 'setGoal'; goal: string }
  | { type: 'toggleDay'; dayId: number }
  | { type: 'selectEveryDay' }
  | { type: 'setReminder'; reminder: string | null };

function createHabitFormState(habit?: HabitRecord | null): HabitFormState {
  return {
    name: habit?.nombre ?? '',
    icon: normalizeHabitIcon(habit?.icono ?? defaultHabitIcon),
    attributes: normalizeHabitAttributes(habit?.atributos),
    isIconPickerOpen: true,
    isAttributePickerOpen: false,
    importance: habit?.importancia ?? 3,
    type: habit?.tipo ?? 'binario',
    goal: String(habit?.meta ?? 1),
    days: habit?.diasSemana ? habit.diasSemana.split(',').map(Number) : [],
    reminder: habit?.horaRecordatorio ?? null,
  };
}

function habitFormReducer(state: HabitFormState, action: HabitFormAction): HabitFormState {
  switch (action.type) {
    case 'setName':
      return { ...state, name: action.name };
    case 'setIcon':
      return { ...state, icon: action.icon, isIconPickerOpen: false, isAttributePickerOpen: true };
    case 'toggleIconPicker': {
      const isIconPickerOpen = !state.isIconPickerOpen;
      return {
        ...state,
        isIconPickerOpen,
        isAttributePickerOpen: isIconPickerOpen ? false : state.isAttributePickerOpen,
      };
    }
    case 'toggleAttributePicker': {
      const isAttributePickerOpen = !state.isAttributePickerOpen;
      return {
        ...state,
        isAttributePickerOpen,
        isIconPickerOpen: isAttributePickerOpen ? false : state.isIconPickerOpen,
      };
    }
    case 'closeAttributePicker':
      return { ...state, isAttributePickerOpen: false };
    case 'toggleAttribute':
      return {
        ...state,
        attributes: state.attributes.includes(action.attributeId)
          ? state.attributes.filter((id) => id !== action.attributeId)
          : state.attributes.length >= maxHabitAttributes
            ? state.attributes
            : [...state.attributes, action.attributeId],
      };
    case 'setImportance':
      return { ...state, importance: action.importance, isAttributePickerOpen: false };
    case 'setType':
      return { ...state, type: action.habitType, isAttributePickerOpen: false };
    case 'setGoal':
      return { ...state, goal: action.goal };
    case 'toggleDay':
      return {
        ...state,
        isAttributePickerOpen: false,
        days: state.days.includes(action.dayId)
          ? state.days.filter((day) => day !== action.dayId)
          : [...state.days, action.dayId].sort((a, b) => a - b),
      };
    case 'selectEveryDay':
      return { ...state, isAttributePickerOpen: false, days: weekDays.map((day) => day.id) };
    case 'setReminder':
      return { ...state, reminder: action.reminder };
  }
}

export function HabitForm({ habit, language, onSave, isSaving = false, onArchive, onCancel }: HabitFormProps) {
  const [state, dispatch] = useReducer(habitFormReducer, habit, createHabitFormState);
  const {
    attributes,
    days,
    goal,
    icon,
    importance,
    isAttributePickerOpen,
    isIconPickerOpen,
    name,
    reminder,
    type,
  } = state;

  const canSave = name.trim().length > 0 && days.length > 0 && attributes.length > 0;
  const normalizedGoal = useMemo(() => Math.max(1, Number.parseInt(goal, 10) || 1), [goal]);
  const xpPreview = getCompletionXp(importance, 0);
  const selectedIcon = habitIcons.find((item) => item.id === icon) ?? habitIcons[0];
  const SelectedIcon = selectedIcon.icon;
  const selectedAttributes = habitAttributes.filter((item) => attributes.includes(item.id));

  function toggleDay(dayId: number) {
    dispatch({ type: 'toggleDay', dayId });
  }

  function selectEveryDay() {
    dispatch({ type: 'selectEveryDay' });
  }

  function toggleAttribute(attributeId: AttributeId) {
    dispatch({ type: 'toggleAttribute', attributeId });
  }

  function selectIcon(iconId: HabitIconId) {
    dispatch({ type: 'setIcon', icon: iconId });
  }

  function closeAttributePicker() {
    dispatch({ type: 'closeAttributePicker' });
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
      horaRecordatorio: reminder,
    });
  }

  const actions = (
    <View style={styles.actions}>
      <View style={styles.actionDivider} />
      <View style={styles.actionRow}>
        {onCancel ? <Button icon={X} label={t(language, 'cancel')} onPress={onCancel} style={styles.cancelAction} variant="secondary" /> : null}
        <Button
          busy={isSaving}
          disabled={!canSave}
          icon={habit ? Check : Plus}
          label={isSaving ? t(language, 'saving') : habit ? t(language, 'saveChanges') : t(language, 'createHabit')}
          onPress={handleSave}
          style={styles.primaryAction}
        />
      </View>
      {onArchive ? (
        <Button
          icon={Archive}
          busy={isSaving}
          label={habit?.archivado ? t(language, 'unarchiveHabit') : t(language, 'archiveHabit')}
          onPress={onArchive}
          style={styles.archiveAction}
          variant={habit?.archivado ? 'secondary' : 'danger'}
        />
      ) : null}
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

      <CollapsibleField
        isOpen={isIconPickerOpen}
        label={t(language, 'pickIcon')}
        onToggle={() => dispatch({ type: 'toggleIconPicker' })}
        summary={(
          <View style={styles.iconSummary}>
            <View style={styles.summaryIconTile}>
              <SelectedIcon color={colors.brand.cyanCore} size={17} />
            </View>
            <Text style={styles.summaryText}>{selectedIcon.label}</Text>
          </View>
        )}
      >
        <View style={styles.iconGrid}>
          {habitIcons.map((item) => {
            const Icon = item.icon;
            const isSelected = icon === item.id;

            return (
              <Pressable
                key={item.id}
                onPress={() => selectIcon(item.id)}
                style={[styles.iconOption, isSelected && styles.selectedIconOption]}
              >
                <Icon color={isSelected ? colors.background.void : colors.brand.bone} size={20} />
                <Text numberOfLines={1} style={[styles.iconOptionText, isSelected && styles.selectedIconOptionText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </CollapsibleField>

      <CollapsibleField
        isOpen={isAttributePickerOpen}
        label={t(language, 'attributes')}
        onToggle={() => dispatch({ type: 'toggleAttributePicker' })}
        summary={(
          <View style={styles.selectedAttributeSummary}>
            {selectedAttributes.map((item) => (
              <View key={item.id} style={[styles.attributePill, { borderColor: item.color, backgroundColor: `${item.color}14` }]}>
                <Text style={[styles.attributePillText, { color: item.color }]}>{item.code}</Text>
              </View>
            ))}
          </View>
        )}
        trailing={<Text style={styles.attributeCount}>{attributes.length}/{maxHabitAttributes}</Text>}
      >
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
      </CollapsibleField>

      <Field label={t(language, 'name')}>
        <TextInput
          cursorColor={colors.brand.cyanCore}
          onChangeText={(value) => dispatch({ type: 'setName', name: value })}
          onFocus={closeAttributePicker}
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
              onPress={() => {
                closeAttributePicker();
                dispatch({ type: 'setImportance', importance: value as HabitImportance });
              }}
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
            onPress={() => {
              closeAttributePicker();
              dispatch({ type: 'setType', habitType: 'binario' });
            }}
          />
          <TypeCard
            active={type === 'contable'}
            description={t(language, 'countableHelp')}
            icon={<BarChart3 color={type === 'contable' ? colors.brand.cyanCore : colors.state.pending} size={18} />}
            label={t(language, 'countable')}
            onPress={() => {
              closeAttributePicker();
              dispatch({ type: 'setType', habitType: 'contable' });
            }}
          />
        </View>
      </Field>

      {type === 'contable' ? (
        <Field label={t(language, 'dailyGoal')}>
          <TextInput
            cursorColor={colors.brand.cyanCore}
            keyboardType="number-pad"
            onChangeText={(value) => dispatch({ type: 'setGoal', goal: value })}
            onFocus={closeAttributePicker}
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
        <TimePickerField
          cancelLabel={t(language, 'cancel')}
          clearLabel={t(language, 'clearTime')}
          confirmLabel={t(language, 'useTime')}
          help={t(language, 'optionalReminder')}
          onChange={(value) => dispatch({ type: 'setReminder', reminder: value })}
          placeholder={t(language, 'noReminder')}
          systemLabel={t(language, 'systemLabel')}
          title={t(language, 'selectTime')}
          value={reminder}
        />
      </Field>

      {actions}
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

function CollapsibleField({
  children,
  isOpen,
  label,
  onToggle,
  summary,
  trailing,
}: {
  children: ReactNode;
  isOpen: boolean;
  label: string;
  onToggle: () => void;
  summary: ReactNode;
  trailing?: ReactNode;
}) {
  const Chevron = isOpen ? ChevronDown : ChevronRight;

  return (
    <View style={styles.field}>
      <Pressable onPress={onToggle} style={styles.collapsibleHeader}>
        <View style={styles.collapsibleTitle}>
          <Text style={[styles.label, styles.collapsibleLabel, !isOpen && styles.collapsibleLabelClosed]}>{label}</Text>
          {isOpen ? null : summary}
        </View>
        <View style={styles.collapsibleActions}>
          {trailing}
          <Chevron color={colors.brand.boneMuted} size={18} />
        </View>
      </Pressable>
      {isOpen ? <View style={styles.collapsibleBody}>{children}</View> : null}
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
  collapsibleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 36,
  },
  collapsibleTitle: {
    flex: 1,
    minWidth: 0,
  },
  collapsibleLabel: {
    marginBottom: 0,
  },
  collapsibleLabelClosed: {
    marginBottom: 6,
  },
  collapsibleActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  collapsibleBody: {
    marginTop: 8,
  },
  iconSummary: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  summaryIconTile: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  summaryText: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 13,
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
  selectedAttributeSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  attributeCount: {
    color: colors.rank.S,
    fontFamily: typography.font.displayBold,
    fontSize: 11,
  },
  attributePill: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  attributePillText: {
    fontFamily: typography.font.displayBold,
    fontSize: 8,
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
    backgroundColor: colors.background.surface,
    borderColor: colors.background.borderBright,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 2,
    overflow: 'hidden',
    padding: 10,
    position: 'relative',
  },
  actionRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    width: '100%',
  },
  actionDivider: {
    backgroundColor: colors.brand.cyanCore,
    bottom: 0,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    top: 0,
    width: 3,
  },
  cancelAction: {
    borderColor: colors.background.borderBright,
    flex: 1,
    marginRight: 8,
  },
  primaryAction: {
    flex: 1.6,
    minHeight: 50,
  },
  archiveAction: {
    marginTop: 8,
    minHeight: 46,
    width: '100%',
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
