/**
 * RafSkoru — Alerjen Çipi
 * src/ui/AllergenChip.tsx
 *
 * Liste satırlarında (arama, sepet) alerjen durumunun kısa özeti.
 * AllergenBanner ile aynı dört durumu kullanır; ayrı bir anlam üretmez.
 */

import { Text, View } from 'react-native';

import type { AllergenBannerStatus, AllergenDisplayLevel } from './AllergenBanner';
import { radii, spacing, useTheme } from './theme';

export interface AllergenChipDisplayInfo {
  level: AllergenDisplayLevel;
  text: string;
}

export interface AllergenChipProps {
  status: AllergenBannerStatus;
  /** Profil doluyken paylaşılan çekirdekten (getAllergenDisplayLevel) gelen, alerjen adını içeren gösterim. */
  displayInfo?: AllergenChipDisplayInfo | null;
}

const LABELS: Record<AllergenBannerStatus, string> = {
  declared_contains: 'İçerir',
  trace_may_contain: 'İçerebilir',
  not_listed_in_available_data: 'Belirtilmemiş',
  unknown_or_unverified: 'Veri yok',
};

const TONES_BY_LEVEL: Record<AllergenDisplayLevel, (colors: ReturnType<typeof useTheme>['colors']) => { bg: string; fg: string }> = {
  declared: (colors) => ({ bg: colors.dangerBg, fg: colors.danger }),
  ingredients: (colors) => ({ bg: colors.dangerBg, fg: colors.danger }),
  trace: (colors) => ({ bg: colors.warnBg, fg: colors.warn }),
  no_data: (colors) => ({ bg: colors.cautionBg, fg: colors.caution }),
  not_listed: (colors) => ({ bg: colors.soft, fg: colors.muted }),
};

export function AllergenChip({ status, displayInfo }: AllergenChipProps) {
  const { colors } = useTheme();

  const tone = displayInfo
    ? TONES_BY_LEVEL[displayInfo.level](colors)
    : (
        {
          declared_contains: { bg: colors.dangerBg, fg: colors.danger },
          trace_may_contain: { bg: colors.warnBg, fg: colors.warn },
          not_listed_in_available_data: { bg: colors.soft, fg: colors.muted },
          unknown_or_unverified: { bg: colors.infoBg, fg: colors.info },
        } satisfies Record<AllergenBannerStatus, { bg: string; fg: string }>
      )[status];

  const label = displayInfo ? displayInfo.text : LABELS[status];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radii.sm,
        paddingVertical: 3,
        paddingHorizontal: spacing.sm,
        backgroundColor: tone.bg,
      }}
      accessibilityLabel={`Alerjen: ${label}`}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: tone.fg }}>Alerjen: {label}</Text>
    </View>
  );
}
