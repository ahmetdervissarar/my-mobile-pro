import { Text, View } from 'react-native';

import type { ProductFacts } from '../../price/types';
import { radii, spacing, useTheme } from '../../ui/theme';
import { formatProductFactsMissingFields, getProductFactsConfidenceLabel } from './helpers';

export interface DataQualityNoticeProps {
  productFacts: ProductFacts | null;
}

export function DataQualityNotice({ productFacts }: DataQualityNoticeProps) {
  const { colors } = useTheme();
  const missingText = formatProductFactsMissingFields(productFacts);
  const shouldShow = Boolean(productFacts && (productFacts.verificationNeeded || missingText));

  if (!shouldShow || !productFacts) {
    return null;
  }

  const reason =
    productFacts.verificationReason?.trim() ||
    'Bu ürün için ürün analiz verisi eksik. Skorlar kısmi veriyle yorumlanmalıdır.';

  return (
    <View
      style={{
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Ürün verisi eksik</Text>
      <Text style={{ fontSize: 12.5, color: colors.muted }}>{reason}</Text>

      {missingText ? (
        <Text style={{ fontSize: 12, color: colors.muted }}>Eksik alanlar: {missingText}</Text>
      ) : null}

      {productFacts.confidence ? (
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Veri güveni: {getProductFactsConfidenceLabel(productFacts.confidence)}
        </Text>
      ) : null}
    </View>
  );
}
