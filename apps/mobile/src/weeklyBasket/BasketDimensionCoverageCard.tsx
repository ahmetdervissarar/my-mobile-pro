/**
 * RafSkoru — Haftalık sepet: 4) Veri kapsamı ve boyut kartları. src/weeklyBasket/BasketDimensionCoverageCard.tsx
 *
 * Yeni skor formülü/ağırlık YOK — yalnız zaten hesaplanmış satır puanlarının ortalaması + kapsam
 * sayımı. Kullanılamayan boyut SIFIR PUAN göstermez; "Bu boyut için veri yetersiz" yazar (aynı
 * ilke `ScoreDimensionCard.tsx` ile). Eksik ürünler ortalamaya sıfır olarak katılmaz — sayılır.
 */

import { StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from '../consumerUx/tokens';
import type { BasketDimensionCoverageView } from './basketViewModel';

export function BasketDimensionCoverageCard({ view }: { view: BasketDimensionCoverageView }) {
  return (
    <View
      style={[styles.card, !view.isAvailable ? styles.cardUnavailable : null]}
      accessible
      accessibilityLabel={`${view.label}: ${view.averageText ?? 'Bu boyut için veri yetersiz'}. ${view.coveredCountText}. ${view.missingCountText}.`}
    >
      <Text style={styles.label} allowFontScaling>
        {view.label}
      </Text>
      {view.isAvailable && view.averageText ? (
        <Text style={styles.value} allowFontScaling>
          {view.averageText}
        </Text>
      ) : (
        <Text style={styles.unavailableText} allowFontScaling>
          Bu boyut için veri yetersiz
        </Text>
      )}
      <Text style={styles.countText} allowFontScaling>
        {view.coveredCountText}
      </Text>
      <Text style={styles.countText} allowFontScaling>
        {view.missingCountText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 150,
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  cardUnavailable: { backgroundColor: color.surfaceMuted, borderStyle: 'dashed' },
  label: { ...typography.captionStrong, color: color.inkMuted, textTransform: 'uppercase', fontSize: 11 },
  value: { ...typography.title, color: color.ink },
  unavailableText: { ...typography.bodyStrong, color: color.inkFaint },
  countText: { ...typography.caption, color: color.inkMuted },
});
