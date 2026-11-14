/**
 * RafSkoru — Kaynak sınıfı izin tablosu (ADR-009 §4, §5)
 * apps/backend/src/price/productFacts/sourcePolicy.ts
 *
 * Her ProductFactsSource için üç sorunun TEK cevabı burada durur:
 *   1. Bu kaynaktan gelen verinin güveni en fazla ne olabilir?
 *   2. Bu kaynak alerjen uyarısı ("beyana göre içerir" / "içerebilir") üretebilir mi?
 *   3. Bu kaynak olumlu bir uygunluk kararını destekleyebilir mi?
 *
 * Tablo product-data-provenance kurallarının koda dökülmüş hâlidir; yeni bir
 * karar içermez. Record<ProductFactsSource, …> olduğu için sözleşmeye yeni bir
 * kaynak eklenip buraya eklenmezse derleme başarısız olur.
 *
 * Bu modülü henüz hiçbir üretici çağırmaz; rafskoru_verified ve
 * label_unverified üreten bağdaştırıcılar (Faz 1, İş 1.3) burayı kullanacaktır.
 * Alerjen kapısı ve risk motoru bu dosyayla DEĞİŞMEZ.
 */
import type { ProductFactsConfidence, ProductFactsSource } from './types.js';

export type SuitabilityDecisionSupport = 'never' | 'only_with_complete_verification_record';

export interface ProductFactsSourcePolicy {
  /** Bu kaynaktan gelen verinin alabileceği en yüksek güven düzeyi. */
  confidenceCeiling: ProductFactsConfidence;
  /** Kaynak, beyan/iz verisi taşıyorsa alerjen UYARISI üretebilir mi? */
  mayProduceAllergenWarning: boolean;
  /**
   * Kaynak olumlu bir uygunluk kararını destekleyebilir mi? Hiçbir kaynak
   * tek başına "güvenli" sonucu üretmez; bu alan yalnız hangi kaynağın,
   * hangi koşulla böyle bir kararın GİRDİSİ olabileceğini söyler.
   */
  suitabilityDecisionSupport: SuitabilityDecisionSupport;
  /** Kayıt bir insan tarafından etiketle karşılaştırılıp onaylandı mı? */
  isHumanVerified: boolean;
}

export const PRODUCT_FACTS_SOURCE_POLICY: Record<ProductFactsSource, ProductFactsSourcePolicy> = {
  off: {
    confidenceCeiling: 'high',
    mayProduceAllergenWarning: true,
    suitabilityDecisionSupport: 'never',
    isHumanVerified: false,
  },
  rafskoru_verified: {
    confidenceCeiling: 'high',
    mayProduceAllergenWarning: true,
    suitabilityDecisionSupport: 'only_with_complete_verification_record',
    isHumanVerified: true,
  },
  label_unverified: {
    confidenceCeiling: 'low',
    mayProduceAllergenWarning: false,
    suitabilityDecisionSupport: 'never',
    isHumanVerified: false,
  },
  beta_inference: {
    confidenceCeiling: 'low',
    mayProduceAllergenWarning: false,
    suitabilityDecisionSupport: 'never',
    isHumanVerified: false,
  },
};

const CONFIDENCE_RANK: Record<ProductFactsConfidence, number> = { low: 0, medium: 1, high: 2 };

export function getProductFactsSourcePolicy(source: ProductFactsSource): ProductFactsSourcePolicy {
  return PRODUCT_FACTS_SOURCE_POLICY[source];
}

/** Güveni kaynağın tavanına indirir; asla yükseltmez. */
export function clampConfidenceToSource(
  source: ProductFactsSource,
  confidence: ProductFactsConfidence,
): ProductFactsConfidence {
  const ceiling = PRODUCT_FACTS_SOURCE_POLICY[source].confidenceCeiling;
  return CONFIDENCE_RANK[confidence] > CONFIDENCE_RANK[ceiling] ? ceiling : confidence;
}
