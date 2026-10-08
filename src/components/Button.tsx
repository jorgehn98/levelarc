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
  // Acción en curso: no admite toques y se atenúa en cualquier variante hasta que termine.
  busy?: boolean;
  icon?: ComponentType<LucideProps>;
  style?: StyleProp<ViewStyle>;
  // Para lectores de pantalla: nombre completo cuando el texto visible es una sigla, opción elegida
  // dentro de un grupo y explicación de por qué el botón no responde.
  accessibilityLabel?: string;
  accessibilityHint?: string;
  // 'link' cuando el botón saca al usuario de la app (web, correo).
  accessibilityRole?: 'button' | 'link';
  selected?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  busy = false,
  icon: Icon,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  selected,
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const isPrimary = variant === 'primary';
  const isSelected = variant === 'selected';
  const isDanger = variant === 'danger';
  const textColor = disabled
    ? colors.brand.boneMuted
    : isPrimary
      ? colors.brand.bone
      : isSelected
        ? colors.brand.cyanCore
        : isDanger
          ? colors.state.failed
          : colors.brand.bone;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ busy, disabled: Boolean(disabled) || busy, selected }}
      disabled={disabled || busy}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[
        styles.button,
        styles[variant],
        style,
        // Un primario deshabilitado pierde el relleno cian y el brillo, sin atenuarse: debe verse
        // inerte pero seguir siendo legible.
        disabled && isPrimary && styles.disabledPrimary,
        (busy || (disabled && !isPrimary)) && styles.disabled,
        isPressed && !disabled && !busy && styles.pressed,
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
  disabledPrimary: {
    backgroundColor: colors.background.card,
    borderColor: colors.background.borderBright,
    elevation: 0,
    shadowOpacity: 0,
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
