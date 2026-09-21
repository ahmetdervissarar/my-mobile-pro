/**
 * RafSkoru — Boş / Veri Yok Durumu
 * src/ui/EmptyState.tsx
 */

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { spacing, useTheme } from './theme';

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.sm }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>{title}</Text>
      {message ? (
        <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 }}>{message}</Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.sm }}>{action}</View> : null}
    </View>
  );
}
