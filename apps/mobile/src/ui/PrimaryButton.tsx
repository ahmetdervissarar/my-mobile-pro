/**
 * RafSkoru — Birincil / İkincil / Metin Buton
 * src/ui/PrimaryButton.tsx
 */

import { ActivityIndicator, Pressable, Text } from 'react-native';

import { getPrimaryButtonDisabledState } from './primaryButtonDisabledState';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from './theme';

export type PrimaryButtonVariant = 'primary' | 'secondary' | 'citrus' | 'ghost';

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: PrimaryButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityLabel,
}: PrimaryButtonProps) {
  const { colors } = useTheme();

  const variantStyle = {
    primary: { backgroundColor: colors.pine, borderWidth: 0, textColor: '#fff' },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, textColor: colors.ink },
    citrus: { backgroundColor: colors.citrus, borderWidth: 0, textColor: '#1B1B1B' },
    ghost: { backgroundColor: 'transparent', borderWidth: 0, textColor: colors.pine2 },
  }[variant];

  const { isPressDisabled, showMutedStyle } = getPrimaryButtonDisabledState(disabled, loading);
  const backgroundColor = showMutedStyle ? colors.soft : variantStyle.backgroundColor;
  const textColor = showMutedStyle ? colors.muted : variantStyle.textColor;

  return (
    <Pressable
      onPress={onPress}
      disabled={isPressDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isPressDisabled, busy: Boolean(loading) }}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        borderRadius: radii.lg,
        borderWidth: variantStyle.borderWidth,
        borderColor: colors.line,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        opacity: isPressDisabled ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ fontSize: 16, fontWeight: '800', color: textColor }}>{label}</Text>
      )}
    </Pressable>
  );
}
