/**
 * RafSkoru — Katlanır Bölüm Özetleri (saf mantık)
 * src/features/productResult/sectionSummaries.ts
 *
 * Katmanlı sadeleştirme (onaylı plan, madde 4): her katlanır bölüm
 * başlığında sağda gösterilen kısa, gri durum özeti. Yeni bir karar
 * ÜRETMEZ — yalnız zaten var olan verinin "var/yok/sayı" özetidir.
 */

export function getIngredientsSummary(ingredients: string | null | undefined): string | null {
  return ingredients?.trim() ? null : 'Veri yok';
}

export function getNutritionSummary(hasAnyKnownTrafficLightLevel: boolean): string | null {
  return hasAnyKnownTrafficLightLevel ? null : 'Veri yok';
}

/** D2/D5 uyumlu: "Dikkat edilecekler" uyarılar + olumlu yönleri + katkı maddelerini birlikte taşır. */
export function getAttentionSummary(warningCount: number, positiveCount: number, additiveCount = 0): string {
  if (warningCount === 0 && positiveCount === 0 && additiveCount === 0) return 'Yok';
  if (warningCount > 0) return `${warningCount} uyarı`;
  if (positiveCount > 0) return 'Olumlu';
  return 'Katkı maddesi';
}

export function getDataSourceSummary(
  confidenceLabel: string | null,
  hasMissingFields: boolean,
): string | null {
  if (hasMissingFields) return 'Eksik';
  return confidenceLabel;
}

export function getPriceSummary(hasPrice: boolean, isLoading: boolean): string | null {
  if (isLoading && !hasPrice) return 'Yükleniyor';
  return hasPrice ? null : 'Veri yok';
}

export function getAlternativesSummary(hasTopRecommendation: boolean): string | null {
  return hasTopRecommendation ? null : 'Yok';
}
