import type { ComponentType } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { LucideProps } from 'lucide-react-native';

import { colors, radii, shadows, typography } from '@/theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'selected' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ComponentType<LucideProps>;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, variant = 'primary', disabled, icon: Icon, style }: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const isPrimary = variant === 'primary';
  const isSelected = variant === 'selected';
  const isDanger = variant === 'danger';
  const textColor = disabled
    ? isPrimary
      ? colors.brand.bone
      : colors.brand.boneMuted
    : isPrimary
      ? colors.brand.bone
      : isSelected
        ? colors.brand.cyanCore
        : isDanger
          ? colors.state.failed
          : colors.brand.bone;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.button,
        disabled && isPrimary ? styles.primaryDisabled : styles[variant],
        style,
        disabled && !isPrimary && styles.disabled,
        isPressed && !disabled && styles.pressed,
      ]}
    >
      {Icon ? (
        <View style={styles.iconSlot}>
          <Icon color={textColor} size={18} />
        </View>
      ) : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  iconSlot: {
    marginRight: 8,
  },
  primary: {
    ...shadows.primaryGlow,
    backgroundColor: colors.brand.cyanDeep,
    borderColor: colors.brand.cyanCore,
  },
  secondary: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
  },
  selected: {
    backgroundColor: colors.background.card,
    borderColor: colors.brand.cyanCore,
    ...shadows.primaryGlow,
  },
  danger: {
    backgroundColor: colors.background.card,
    borderColor: colors.state.failed,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.background.border,
  },
  disabled: {
    opacity: 0.45,
  },
  primaryDisabled: {
    ...shadows.primaryGlow,
    backgroundColor: colors.brand.cyanDeep,
    borderColor: colors.brand.cyanCore,
    opacity: 1,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontFamily: typography.font.bodyMedium,
    fontSize: 14,
  },
});
