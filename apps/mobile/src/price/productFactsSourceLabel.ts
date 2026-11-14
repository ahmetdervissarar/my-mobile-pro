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
import type { ProductFactsSource } from './types';

const PRODUCT_FACTS_SOURCE_LABELS: Record<ProductFactsSource, string> = {
  off: 'Open Food Facts (ODbL)',
  rafskoru_verified: 'RafSkoru etiket kaydı (insan onaylı)',
  label_unverified: 'Etiketten okundu, doğrulanmadı',
  beta_inference: 'Beta çıkarım',
};

export const UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL = 'Kaynak belirtilmemiş';

export function getProductFactsSourceLabel(source: ProductFactsSource | string | null | undefined): string {
  if (typeof source === 'string' && Object.prototype.hasOwnProperty.call(PRODUCT_FACTS_SOURCE_LABELS, source)) {
    return PRODUCT_FACTS_SOURCE_LABELS[source as ProductFactsSource];
  }
  return UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL;
}
