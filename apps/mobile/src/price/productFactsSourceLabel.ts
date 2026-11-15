/**
 * RafSkoru — Ürün verisi kaynağının kullanıcıya görünen adı (ADR-009 §4)
 * src/price/productFactsSourceLabel.ts
 *
 * Record<ProductFactsSource, string> olduğu için sözleşmeye yeni bir kaynak
 * eklenip buraya eklenmezse derleme başarısız olur. Önceki ikili ifade
 * ("OFF değilse Beta çıkarım") yeni kaynakları yanlış etiketlerdi.
 *
 * Tanınmayan bir değer (ör. daha yeni bir backend sürümünden) hiçbir bilinen
 * kaynağın adıyla gösterilmez; "Kaynak belirtilmemiş" yazılır.
 */
import type { ProductFacts, ProductFactsFieldKey, ProductFactsSource } from './types';

const PRODUCT_FACTS_SOURCE_LABELS: Record<ProductFactsSource, string> = {
  off: 'Open Food Facts (ODbL)',
  rafskoru_verified: 'RafSkoru etiket kaydı (insan onaylı)',
  label_unverified: 'Etiketten okundu, doğrulanmadı',
  beta_inference: 'Beta çıkarım',
};

export const UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL = 'Kaynak belirtilmemiş';

const FIELD_LABELS: Record<ProductFactsFieldKey, string> = {
  productName: 'ürün adı',
  imageUrl: 'görsel',
  ingredientsText: 'içindekiler',
  allergens: 'alerjen beyanı',
  nutriScoreGrade: 'Nutri-Score',
  novaGroup: 'NOVA',
};

// Yanıtta bu sırayla anılır (nesne anahtar sırasına bağlı kalmamak için).
const FIELD_ORDER: ProductFactsFieldKey[] = [
  'productName',
  'ingredientsText',
  'allergens',
  'nutriScoreGrade',
  'novaGroup',
  'imageUrl',
];

/**
 * Kaynak satırının metni. Bütün alanlar tek kaynaktan geliyorsa yalnız o
 * kaynağın adıdır; karışık kaynakta (fieldSources) farklı kaynaktan gelen her
 * alan ayrıca anılır — ör. "Open Food Facts (ODbL) · içindekiler: RafSkoru
 * etiket kaydı (insan onaylı)". Nutri-Score onaylı etiketten geliyorsa notun
 * etikette yazmadığı, etiket değerlerinden HESAPLANDIĞI açıkça söylenir.
 */
export function getProductFactsSourceText(facts: Pick<ProductFacts, 'dataSource' | 'fieldSources'>): string {
  const parts = [getProductFactsSourceLabel(facts.dataSource)];
  const fieldSources = facts.fieldSources ?? {};

  for (const field of FIELD_ORDER) {
    const entry = fieldSources[field];
    if (!entry || entry.source === facts.dataSource) continue;

    parts.push(
      field === 'nutriScoreGrade' && entry.source === 'rafskoru_verified'
        ? `${FIELD_LABELS[field]}: onaylı etiket değerlerinden hesaplandı`
        : `${FIELD_LABELS[field]}: ${getProductFactsSourceLabel(entry.source)}`,
    );
  }

  return parts.join(' · ');
}

export function getProductFactsSourceLabel(source: ProductFactsSource | string | null | undefined): string {
  if (typeof source === 'string' && Object.prototype.hasOwnProperty.call(PRODUCT_FACTS_SOURCE_LABELS, source)) {
    return PRODUCT_FACTS_SOURCE_LABELS[source as ProductFactsSource];
  }
  return UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL;
}
