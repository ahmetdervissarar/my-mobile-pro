/**
 * RafSkoru — Kısa Bilgi Mesajı (Toast)
 * src/ui/Toast.tsx
 *
 * Denetimli (controlled) basit bileşen: görünürlük ve otomatik kapanma
 * üst bileşende yönetilir; burada yalnızca sunum vardır.
 */

import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { radii, spacing, useTheme } from './theme';

export interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  durationMs?: number;
  /** Doluysa toast dokunulabilir olur (ör. "Sepete git") ve dokununca hem bu hem onHide çağrılır. */
  onPress?: () => void;
}

export function Toast({ message, visible, onHide, durationMs = 2200, onPress }: ToastProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(onHide, durationMs);
    return () => clearTimeout(timer);
  }, [visible, durationMs, onHide]);

  if (!visible) return null;

  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={
        onPress
          ? () => {
              onHide();
              onPress();
            }
          : undefined
      }
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
      accessibilityRole={onPress ? 'button' : 'alert'}
      accessibilityLiveRegion="polite"
    >
      <Text style={{ color: colors.bg, fontWeight: '700', fontSize: 14 }}>{message}</Text>
    </Container>
  );
}
