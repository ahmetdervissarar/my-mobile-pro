/**
 * RafSkoru — Alerjen Çipi
 * src/ui/AllergenChip.tsx
 *
 * Liste satırlarında (arama, sepet) alerjen durumunun kısa özeti.
 * AllergenBanner ile aynı dört durumu kullanır; ayrı bir anlam üretmez.
 */

import { Text, View } from 'react-native';

import type { AllergenBannerStatus } from './AllergenBanner';
import { radii, spacing, useTheme } from './theme';

export interface AllergenChipProps {
  status: AllergenBannerStatus;
}

const LABELS: Record<AllergenBannerStatus, string> = {
  declared_contains: 'İçerir',
  trace_may_contain: 'İçerebilir',
  not_listed_in_available_data: 'Belirtilmemiş',
  unknown_or_unverified: 'Veri yok',
};

export function AllergenChip({ status }: AllergenChipProps) {
  const { colors } = useTheme();

  const tones: Record<AllergenBannerStatus, { bg: string; fg: string }> = {
    declared_contains: { bg: colors.dangerBg, fg: colors.danger },
    trace_may_contain: { bg: colors.warnBg, fg: colors.warn },
    not_listed_in_available_data: { bg: colors.soft, fg: colors.muted },
    unknown_or_unverified: { bg: colors.infoBg, fg: colors.info },
  };
  const tone = tones[status];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radii.sm,
        paddingVertical: 3,
        paddingHorizontal: spacing.sm,
        backgroundColor: tone.bg,
      }}
      accessibilityLabel={`Alerjen durumu: ${LABELS[status]}`}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: tone.fg }}>{LABELS[status]}</Text>
    </View>
  );
}
