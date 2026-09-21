import { Text, View } from 'react-native';

import { formatPriceForDisplay } from '../../price/priceClient';
import type { AlternativeRecommendation, DataConfidenceLevel } from '../../price/types';
import { EmptyState } from '../../ui/EmptyState';
import { radii, spacing, useTheme } from '../../ui/theme';
import { getDataConfidenceLabel } from './helpers';

export interface AlternativesSectionProps {
  topRecommendation: AlternativeRecommendation | null;
  shouldShowUnavailableNotice: boolean;
}

/** "Daha yüksek puanlı seçenekler" — yalnızca profille çakışmayan, aynı ürün grubundaki aday. */
export function AlternativesSection({
  topRecommendation,
  shouldShowUnavailableNotice,
}: AlternativesSectionProps) {
  const { colors } = useTheme();

  if (!topRecommendation) {
    if (!shouldShowUnavailableNotice) {
      return null;
    }

    return (
      <EmptyState
        title="Alternatif önerisi yok"
        message="Bu ürün grubunda güvenle karşılaştırılabilen daha iyi bir alternatif bulunamadı. Yanlış yönlendirmemek için alternatif önerisi gösterilmiyor."
      />
    );
  }

  const confidenceLabel = getDataConfidenceLabel(
    topRecommendation.confidenceLevel as DataConfidenceLevel,
  );

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 2,
        borderColor: colors.citrus,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.pine2 }}>
        {topRecommendation.reasonLabel}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
        {topRecommendation.candidate.productName}
      </Text>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
        {formatPriceForDisplay(topRecommendation.candidate.price, topRecommendation.candidate.currency)}
        {' · '}
        {topRecommendation.candidate.marketName}
      </Text>

      {topRecommendation.reasons.slice(0, 4).map((reason) => (
        <Text key={reason} style={{ fontSize: 12.5, color: colors.muted }}>
          • {reason}
        </Text>
      ))}

      <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: 4 }}>
        Veri güveni: {confidenceLabel}
      </Text>
    </View>
  );
}
