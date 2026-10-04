/**
 * RafSkoru — Birincil / İkincil / Metin Buton
 * src/ui/PrimaryButton.tsx
 */

import { ActivityIndicator, Pressable, Text } from 'react-native';

import { getPrimaryButtonDisabledState } from './primaryButtonDisabledState';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from './theme';

export type PrimaryButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';

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
    // İş 3 (görev onayı): TEK eylem rengi — "Sepete ekle" dahil bu varyantı
    // kullanan her düğme accent/onAccent kullanır (eski 'citrus' sarı
    // tondu, uyarı sarısıyla karışıyordu).
    accent: { backgroundColor: colors.accent, borderWidth: 0, textColor: colors.onAccent },
    ghost: { backgroundColor: 'transparent', borderWidth: 0, textColor: colors.accent },
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
