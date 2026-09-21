/**
 * RafSkoru — Kısa Bilgi Mesajı (Toast)
 * src/ui/Toast.tsx
 *
 * Denetimli (controlled) basit bileşen: görünürlük ve otomatik kapanma
 * üst bileşende yönetilir; burada yalnızca sunum vardır.
 */

import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { radii, spacing, useTheme } from './theme';

export interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  durationMs?: number;
}

export function Toast({ message, visible, onHide, durationMs = 2200 }: ToastProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [visible, durationMs, onHide]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: spacing.xl,
        right: spacing.xl,
        bottom: spacing.xxxl,
        borderRadius: radii.lg,
        backgroundColor: colors.ink,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        alignItems: 'center',
      }}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 14 }}>{message}</Text>
    </View>
  );
}
