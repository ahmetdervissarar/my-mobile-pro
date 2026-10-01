import { Text, View } from 'react-native';

import type { HealthScoreResult, ProductFacts, RafScoreResult, SustainabilityResult } from '../../price/types';
import { getRafScoreComponentBreakdownText } from '../../price/rafScoreExplanation';
import { spacing, useTheme } from '../../ui/theme';
import { formatProductFactsMissingFields, getProductFactsConfidenceLabel } from './helpers';
import { MoreDetailsSection } from './MoreDetailsSection';

export interface DataSourceSectionProps {
  productFacts: ProductFacts | null;
  explanationItems: string[];
  rafScore: RafScoreResult | null;
  healthScore: HealthScoreResult | null;
  sustainability: SustainabilityResult | null;
  productName: string;
  barcode: string;
  searchSourceLabel: string;
}

/**
 * "Veri kaynağı ve güven" — eski DataQualityNotice + ScoreSection'ın
 * "Nasıl hesaplandı?" açıklaması + MoreDetailsSection burada birleşir.
 * Yeni bir skor/güven değeri ÜRETMEZ — yalnız zaten hesaplanmış verinin
 * tek bir katlanır bölümde toplanmış sunumudur.
 */
export function DataSourceSection({
  productFacts,
  explanationItems,
  rafScore,
  healthScore,
  sustainability,
  productName,
  barcode,
  searchSourceLabel,
}: DataSourceSectionProps) {
  const { colors } = useTheme();
  const missingText = formatProductFactsMissingFields(productFacts);
  const componentBreakdownText = getRafScoreComponentBreakdownText(rafScore);
  const reason =
    productFacts?.verificationReason?.trim() ||
    (productFacts?.verificationNeeded || missingText
      ? 'Bu ürün için ürün analiz verisi eksik. Skorlar kısmi veriyle yorumlanmalıdır.'
      : null);

  return (
    <View style={{ gap: spacing.md }}>
      {reason || missingText || productFacts?.confidence ? (
        <View style={{ gap: 4 }}>
          {reason ? <Text style={{ fontSize: 13, color: colors.ink }}>{reason}</Text> : null}
          {missingText ? (
            <Text style={{ fontSize: 12.5, color: colors.muted }}>Eksik alanlar: {missingText}</Text>
          ) : null}
          {productFacts?.confidence ? (
            <Text style={{ fontSize: 12.5, color: colors.muted }}>
              Veri güveni: {getProductFactsConfidenceLabel(productFacts.confidence)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {componentBreakdownText || explanationItems.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>PUAN NASIL HESAPLANDI</Text>
          {componentBreakdownText ? (
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink, lineHeight: 18 }}>
              {componentBreakdownText}
            </Text>
          ) : null}
          {explanationItems.map((item) => (
            <Text key={item} style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      <MoreDetailsSection
        healthScore={healthScore}
        sustainability={sustainability}
        productName={productName}
        barcode={barcode}
        searchSourceLabel={searchSourceLabel}
      />
    </View>
  );
}
