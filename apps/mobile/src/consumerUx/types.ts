/**
 * RafSkoru — Tüketici karar akışı V2 view-model tipleri (Aşama 8).
 * src/consumerUx/types.ts
 *
 * Salt projeksiyon tipleridir; hiçbiri risk/skor/alerjen KARARI üretmez, yalnız mevcut
 * sonuçları ekrana dönüştürülebilir bir şekle sokar. `riskEngine`, skor formülleri ve
 * alternatif filtresi buradan ASLA çağrılmaz — yalnız SONUÇLARI girdi olarak alınır.
 */

export type AllergenGateTone = 'declared' | 'trace' | 'not_listed' | 'unknown';

export interface AllergenGateLine {
  tone: AllergenGateTone;
  /** Görev metni birebir: "Beyana göre içerir: …" / "İçerebilir: …" / sabit iki metin. */
  text: string;
}

export interface CriticalAllergenNotice {
  code: string;
  title: string;
  message: string;
}

export interface AllergenGateView {
  /** Baskın ton — kart rengi/ikonu bundan türer; metin ile birlikte, renk tek başına değil. */
  tone: AllergenGateTone;
  lines: AllergenGateLine[];
  /** Kullanıcının profiliyle çakışan kritik uyarılar (declared veya trace); her zaman en üstte. */
  criticalNotices: CriticalAllergenNotice[];
  /** Ekran okuyucu için tek cümlelik özet. */
  a11ySummary: string;
}

export type DecisionTone = 'calm' | 'caution' | 'unknown';

export interface DecisionSummaryView {
  tone: DecisionTone;
  headline: string;
  supportingLine: string;
}

export type ConsumerProductDataStatus =
  | 'loading'
  | 'usable'
  | 'partial'
  | 'not_found'
  | 'locally_reviewed_candidate'
  | 'conflict';

export interface FieldConflictPreview {
  fieldLabel: string;
  offValue: string;
  packagingValue: string;
}

export interface DataTrustView {
  status: ConsumerProductDataStatus;
  sourceLabel: string;
  freshnessText: string | null;
  missingLabels: string[];
  /** `locally_reviewed_candidate` durumunda görünür; doğrulanmış ürün gibi SUNULMAZ. */
  isLocallyReviewedCandidate: boolean;
  conflict: FieldConflictPreview | null;
}

export type ScoreDimensionKey = 'raf' | 'price' | 'health' | 'content' | 'sustainability';

export interface ScoreDimensionView {
  key: ScoreDimensionKey;
  label: string;
  /** `null` → "Bu boyut için veri yetersiz" gösterilir; asla sıfır puan gösterilmez. */
  scoreText: string | null;
  statusText: string;
  confidenceText: string | null;
  isAvailable: boolean;
}

export interface MissingDataActionView {
  visible: boolean;
  headline: string;
  body: string;
}

export interface AlternativePreviewItemView {
  id: string;
  productName: string;
  reasonLabel: string;
  priceDeltaText: string | null;
  confidenceText: string;
  missingSignalsNote: string | null;
}

export interface AlternativesView {
  title: string;
  items: AlternativePreviewItemView[];
  emptyNotice: string | null;
}

export interface ProductIdentityView {
  name: string;
  barcode: string;
  imageUrl: string | null;
  isLoading: boolean;
}

export interface BasketActionView {
  ctaLabel: string;
}

/** Ekranın tepeden dibe TEK, zorunlu render sırasıyla eşleşen tam görünüm. */
export interface ConsumerDecisionView {
  identity: ProductIdentityView;
  allergenGate: AllergenGateView;
  decisionSummary: DecisionSummaryView;
  dataTrust: DataTrustView;
  scoreDimensions: ScoreDimensionView[];
  missingDataAction: MissingDataActionView;
  alternatives: AlternativesView;
  basket: BasketActionView;
  /** Yalnız geliştirme önizlemesi fixture'larında true; üretim ekranına asla sızmaz. */
  isDevPreview: boolean;
}
