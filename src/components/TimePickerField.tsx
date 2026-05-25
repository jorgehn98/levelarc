import { Clock3, X } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { formatClockTime, parseClockTime } from '@/lib/time';
import { colors, radii, typography } from '@/theme/colors';

type TimePickerFieldProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  title: string;
  cancelLabel: string;
  clearLabel: string;
  confirmLabel: string;
  systemLabel: string;
  help?: string;
};

const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = Array.from({ length: 60 }, (_, index) => index);

export function TimePickerField({
  cancelLabel,
  clearLabel,
  confirmLabel,
  help,
  onChange,
  placeholder,
  systemLabel,
  title,
  value,
}: TimePickerFieldProps) {
  const parsedValue = useMemo(() => parseClockTime(value), [value]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState(parsedValue?.hour ?? 21);
  const [selectedMinute, setSelectedMinute] = useState(parsedValue?.minute ?? 30);
  const displayValue = parsedValue ? formatClockTime(parsedValue) : placeholder;

  function openPicker() {
    setSelectedHour(parsedValue?.hour ?? 21);
    setSelectedMinute(parsedValue?.minute ?? 30);
    setIsOpen(true);
  }

  function confirmTime() {
    onChange(formatClockTime({ hour: selectedHour, minute: selectedMinute }));
    setIsOpen(false);
  }

  function clearTime() {
    onChange(null);
    setIsOpen(false);
  }

  return (
    <>
      <View style={styles.controlRow}>
        <Pressable onPress={openPicker} style={styles.valueButton}>
          <Clock3 color={colors.brand.cyanCore} size={18} />
          <Text style={[styles.valueText, !parsedValue && styles.placeholderText]}>{displayValue}</Text>
        </Pressable>
        {parsedValue ? (
          <Pressable accessibilityLabel={clearLabel} onPress={() => onChange(null)} style={styles.clearButton}>
            <X color={colors.state.pending} size={18} />
          </Pressable>
        ) : null}
      </View>
      {help ? <Text style={styles.help}>{help}</Text> : null}

      <Modal animationType="fade" onRequestClose={() => setIsOpen(false)} transparent visible={isOpen}>
        <View style={styles.backdrop}>
          <View style={styles.panel}>
            <Text style={styles.kicker}>◆ {systemLabel}</Text>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.columns}>
              <TimeColumn items={hours} selected={selectedHour} onSelect={setSelectedHour} />
              <Text style={styles.separator}>:</Text>
              <TimeColumn items={minutes} selected={selectedMinute} onSelect={setSelectedMinute} />
            </View>
            <View style={styles.preview}>
              <Text style={styles.previewText}>{formatClockTime({ hour: selectedHour, minute: selectedMinute })}</Text>
            </View>
            <View style={styles.actions}>
              <Button label={cancelLabel} onPress={() => setIsOpen(false)} variant="secondary" />
              <Button label={clearLabel} onPress={clearTime} variant="ghost" />
              <Button label={confirmLabel} onPress={confirmTime} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function TimeColumn({ items, onSelect, selected }: { items: number[]; onSelect: (value: number) => void; selected: number }) {
  const renderItem = useCallback(
    ({ item }: { item: number }) => (
      <TimeOption
        isSelected={item === selected}
        onSelect={onSelect}
        value={item}
      />
    ),
    [onSelect, selected],
  );

  return (
    <FlatList
      contentContainerStyle={styles.columnContent}
      data={items}
      keyExtractor={(item) => String(item)}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      style={styles.column}
    />
  );
}

const TimeOption = memo(function TimeOption({
  isSelected,
  onSelect,
  value,
}: {
  isSelected: boolean;
  onSelect: (value: number) => void;
  value: number;
}) {
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);

  return (
    <Pressable onPress={handlePress} style={[styles.timeOption, isSelected && styles.selectedTimeOption]}>
      <Text style={[styles.timeOptionText, isSelected && styles.selectedTimeOptionText]}>{String(value).padStart(2, '0')}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  valueButton: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  valueText: {
    color: colors.brand.bone,
    fontFamily: typography.font.bodyMedium,
    fontSize: 16,
  },
  placeholderText: {
    color: colors.state.pending,
  },
  clearButton: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  help: {
    color: colors.state.pending,
    fontFamily: typography.font.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(5, 5, 9, 0.78)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    backgroundColor: colors.background.surface,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    maxHeight: '86%',
    padding: 16,
    width: '100%',
  },
  kicker: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayMedium,
    fontSize: 10,
  },
  title: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayBold,
    fontSize: 20,
    marginTop: 4,
  },
  columns: {
    flexDirection: 'row',
    gap: 10,
    height: 280,
    marginTop: 16,
  },
  column: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
  },
  columnContent: {
    gap: 6,
    padding: 8,
  },
  separator: {
    alignSelf: 'center',
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayBold,
    fontSize: 24,
  },
  timeOption: {
    alignItems: 'center',
    borderColor: colors.background.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  selectedTimeOption: {
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
  },
  timeOptionText: {
    color: colors.brand.bone,
    fontFamily: typography.font.displayMedium,
    fontSize: 15,
  },
  selectedTimeOptionText: {
    color: colors.background.void,
  },
  preview: {
    alignItems: 'center',
    borderColor: colors.brand.cyanCore,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 10,
  },
  previewText: {
    color: colors.brand.cyanCore,
    fontFamily: typography.font.displayBold,
    fontSize: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 14,
  },
});
