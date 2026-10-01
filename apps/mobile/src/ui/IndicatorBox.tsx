/**
 * RafSkoru — Küçük Gösterge Kutusu
 * src/ui/IndicatorBox.tsx
 *
 * Katmanlı sadeleştirme: ürün sayfasında RafSkoru/Nutri-Score/İşlenmişlik
 * (NOVA) artık üç küçük kutu olarak yan yana gösterilir. Karar/renk mantığı
 * src/features/productResult/indicatorTrio.ts'te (RN'siz, test edilebilir)
 * — bu bileşen yalnız `colorToken`'ı gerçek renge çevirip çizer.
 */
import { Text, View } from 'react-native';

import type { IndicatorColorToken, IndicatorConfig } from '../features/productResult/indicatorTrio';
import { radii, spacing, useTheme } from './theme';

export interface IndicatorBoxProps extends IndicatorConfig {}

export function IndicatorBox({ label, value, colorToken, statusText }: IndicatorBoxProps) {
  const { colors } = useTheme();
  const colorByToken: Record<IndicatorColorToken, string> = {
    leaf: colors.leaf,
    pine2: colors.pine2,
    warn: colors.warn,
    danger: colors.danger,
    muted: colors.muted,
  };

  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        gap: 2,
      }}
      accessibilityLabel={`${label}: ${statusText}`}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colorByToken[colorToken] }}>{value}</Text>
      <Text style={{ fontSize: 10.5, color: colors.muted, textAlign: 'center' }} numberOfLines={2}>
        {statusText}
      </Text>
    </View>
  );
}
