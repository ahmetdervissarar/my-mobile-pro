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

/**
 * Cihaz testi 1 Ekim, madde 7: özet "Olumlu" yazıyordu — anlamsızdı
 * ("Dikkat edilecekler" başlığı altında olumlu bir şey vurgulamak kafa
 * karıştırıcı). Artık yalnız uyarı sayısını (veya uyarı yoksa "Yok")
 * gösterir; bölümün İÇİNDE olumlu yönler/katkı maddeleri yine listelenir,
 * yalnız başlık özeti sadeleşti.
 */
export function getAttentionSummary(warningCount: number): string {
  return warningCount > 0 ? `${warningCount} uyarı` : 'Yok';
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

/**
 * Görev onayı (alternatif önerisi, madde 4): öneri varsa sayı ("3 seçenek"),
 * yoksa bölüm zaten çağıran tarafta (product-result.tsx) hiç render
 * edilmiyor — bu fonksiyon o durumda hiç çağrılmaz.
 */
export function getAlternativesSummary(totalCount: number): string | null {
  return totalCount > 0 ? `${totalCount} seçenek` : null;
}
