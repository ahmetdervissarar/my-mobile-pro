import { Text, View } from 'react-native';

import type { HealthScoreResult, ProductFacts, SustainabilityResult } from '../../price/types';
import { spacing, useTheme } from '../../ui/theme';
import { formatProductFactsMissingFields, getProductFactsConfidenceLabel } from './helpers';
import { MoreDetailsSection } from './MoreDetailsSection';

export interface DataSourceSectionProps {
  productFacts: ProductFacts | null;
  explanationItems: string[];
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
  healthScore,
  sustainability,
  productName,
  barcode,
  searchSourceLabel,
}: DataSourceSectionProps) {
  const { colors } = useTheme();
  const missingText = formatProductFactsMissingFields(productFacts);
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

      {explanationItems.length > 0 ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>PUAN NASIL HESAPLANDI</Text>
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
