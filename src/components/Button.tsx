import type { ComponentType } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { LucideProps } from 'lucide-react-native';

import { colors } from '@/theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ComponentType<LucideProps>;
};

export function Button({ label, onPress, variant = 'primary', disabled, icon: Icon }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const textColor = isPrimary ? colors.background.void : isDanger ? colors.state.failed : colors.brand.bone;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {Icon ? <Icon color={textColor} size={18} /> : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  primary: {
    backgroundColor: colors.brand.cyanCore,
    borderColor: colors.brand.cyanCore,
  },
  secondary: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.border,
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
  pressed: {
    opacity: 0.78,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
});
