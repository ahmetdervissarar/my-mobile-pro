/**
 * RafSkoru — Tüketici karar akışı V2 view-model (Aşama 8).
 * src/consumerUx/decisionViewModel.ts
 *
 * SALT PROJEKSİYON, I/O YOK. `riskEngine`, skor formülleri, alternatif filtresi ve alerjen
 * eşleştirme kodları burada ÇAĞRILMAZ — yalnız `product-result.tsx`'in ZATEN hesapladığı
 * sonuçlar (riskResult, priceResult, productDataView, alternatifler, incelenmiş kayıt) girdi
 * olarak alınır ve ekrana uygun, sabit ekran hiyerarşisiyle eşleşen bir şekle dönüştürülür.
 * Yeni bir güvenlik/skor kararı ÜRETMEZ; yalnız var olan kararları görünür kılar.
 */

import type { AllergenDeclaration } from '../contracts/generated';
import { getContentScoreConfidenceText, getContentScoreDisplayValue, getContentScoreStatusText } from '../price/contentScoreDisplay';
import { getHealthScoreConfidenceText, getHealthScoreDisplayValue, getHealthScoreStatusText } from '../price/healthScoreDisplay';
import { getPriceScoreConfidenceText, getPriceScoreDisplayValue, getPriceScoreStatusText } from '../price/priceScoreDisplay';
import { getRafScoreConfidenceText, getRafScoreDisplayValue, getRafScoreStatusText } from '../price/rafScoreDisplay';
import type {
  AlternativeRecommendation,
  ContentScoreResult,
  HealthScoreResult,
  PriceScoreResult,
  RafScoreResult,
  SustainabilityResult,
} from '../price/types';
import type { ProductDataView } from '../localProduct/types';
import type { HumanFieldCheck, LocallyReviewedRecord } from '../localProduct/resolution/types';
import type { ProductRiskResult, RiskWarning } from '../riskEngine/riskEngine';
import type {
  AllergenGateLine,
  AllergenGateTone,
  AllergenGateView,
  AlternativePreviewItemView,
  AlternativesView,
  ConsumerDecisionView,
  ConsumerProductDataStatus,
  DataTrustView,
  DecisionSummaryView,
  FieldConflictPreview,
  ProductIdentityView,
  ScoreDimensionView,
} from './types';

// ── Alerjen kapısı ────────────────────────────────────────────────────────────
// Görev metni birebir (Aşama 8 zorunlu ifadeler); belirleme mantığı yalnız `AllergenDeclaration`
// alanlarını okur (`riskEngine`/eşleştirme koduna dokunmaz).

const NOT_LISTED_TEXT =
  'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.';
const UNKNOWN_TEXT = 'Alerjen verisi yok veya doğrulanmamış. Güncel ambalaj etiketini kontrol edin.';

function buildAllergenGateLines(declaration: AllergenDeclaration): { tone: AllergenGateTone; lines: AllergenGateLine[] } {
  if (declaration.status !== 'readable') {
    return { tone: 'unknown', lines: [{ tone: 'unknown', text: UNKNOWN_TEXT }] };
  }
  const lines: AllergenGateLine[] = [];
  if (declaration.declaredTags.length > 0) {
    lines.push({ tone: 'declared', text: `Beyana göre içerir: ${declaration.declaredTags.join(', ')}` });
  }
  if (declaration.traceTags.length > 0) {
    lines.push({ tone: 'trace', text: `İçerebilir: ${declaration.traceTags.join(', ')}` });
  }
  if (lines.length === 0) {
    return { tone: 'not_listed', lines: [{ tone: 'not_listed', text: NOT_LISTED_TEXT }] };
  }
  return { tone: lines[0].tone, lines };
}

export function buildAllergenGateView(
  declaration: AllergenDeclaration,
  criticalWarnings: readonly RiskWarning[],
): AllergenGateView {
  const { tone, lines } = buildAllergenGateLines(declaration);
  const criticalNotices = criticalWarnings.map((w) => ({ code: w.code, title: w.title, message: w.message }));
  const a11ySummary = [...criticalNotices.map((n) => `${n.title}. ${n.message}`), ...lines.map((l) => l.text)].join(' ');
  return { tone, lines, criticalNotices, a11ySummary };
}

// ── Kısa karar özeti ──────────────────────────────────────────────────────────
// Yeni bir karar ÜRETMEZ: yalnız zaten hesaplanmış riskResult/allergenGate/productDataView'in
// ÖZETİNİ tek cümleye indirger. Olumlu güvenlik iddiası (P5) hiçbir dalda üretilmez.

export function buildDecisionSummaryView(input: {
  allergenGate: AllergenGateView;
  riskResult: ProductRiskResult;
  dataStatus: ConsumerProductDataStatus;
}): DecisionSummaryView {
  const { allergenGate, riskResult, dataStatus } = input;

  if (allergenGate.criticalNotices.length > 0) {
    return {
      tone: 'caution',
      headline: 'Profilinizle çakışan kritik alerjen uyarısı var',
      supportingLine: 'Aşağıdaki alerjen kapısını mutlaka okuyun; bu uyarı hiçbir skorla dengelenmez.',
    };
  }
  if (allergenGate.tone === 'declared') {
    return {
      tone: 'caution',
      headline: 'Beyan edilen alerjenleri kontrol edin',
      supportingLine: 'Bu üründe beyan edilmiş alerjen var. Kararınızı vermeden önce alerjen kapısını okuyun.',
    };
  }
  if (dataStatus === 'not_found' || dataStatus === 'loading') {
    return {
      tone: 'unknown',
      headline: dataStatus === 'loading' ? 'Ürün değerlendiriliyor' : 'Bu ürün için yeterli veri yok',
      supportingLine:
        dataStatus === 'loading'
          ? 'Kayıt sorgulanıyor; kararı desteklemek için veriler yükleniyor.'
          : 'Karar desteği için ürün verisi eksik. Paket bilgisini ekleyerek katkı sağlayabilirsiniz.',
    };
  }
  if (allergenGate.tone === 'trace' || allergenGate.tone === 'not_listed' || allergenGate.tone === 'unknown') {
    return {
      tone: 'unknown',
      headline: 'Alerjen durumu belirsiz — etiketi kontrol edin',
      supportingLine: riskResult.isEvaluated
        ? 'Diğer değerlendirmeler aşağıda; alerjen kararı hiçbirinden bağımsızdır.'
        : 'Gıda analizi tam yapılamadı; mevcut bilgiler aşağıda gösteriliyor.',
    };
  }
  return {
    tone: 'calm',
    headline: 'Alerjen kapısında kritik çakışma bulunamadı',
    supportingLine: 'Bu, ürünün güvenli olduğu anlamına gelmez — yalnız profilinizle bilinen bir çakışma tespit edilmedi. Etiketi kontrol edin.',
  };
}

// ── Veri kaynağı / güncellik / eksiklik şeridi ────────────────────────────────

function findProductNameConflict(
  reviewedRecord: LocallyReviewedRecord | null,
  offProductName: string | null,
): FieldConflictPreview | null {
  if (!reviewedRecord || !offProductName) return null;
  const check: HumanFieldCheck | undefined = reviewedRecord.checks.find((c) => c.field === 'productName');
  if (!check || check.decision === 'unreadable' || !check.reviewedText) return null;
  const a = offProductName.trim().toLocaleLowerCase('tr-TR');
  const b = check.reviewedText.trim().toLocaleLowerCase('tr-TR');
  if (!a || !b || a === b) return null;
  return { fieldLabel: 'Ürün adı', offValue: offProductName, packagingValue: check.reviewedText };
}

export function buildDataTrustView(input: {
  isLoading: boolean;
  productDataView: ProductDataView | null;
  reviewedRecord: LocallyReviewedRecord | null;
  offProductName: string | null;
}): DataTrustView {
  const { isLoading, productDataView, reviewedRecord, offProductName } = input;

  if (isLoading) {
    return { status: 'loading', sourceLabel: 'Ürün verisi alınıyor', freshnessText: null, missingLabels: [], isLocallyReviewedCandidate: false, conflict: null };
  }

  const conflict = findProductNameConflict(reviewedRecord, offProductName);
  if (conflict) {
    return {
      status: 'conflict',
      sourceLabel: 'Open Food Facts + ambalaj (çatışmalı)',
      freshnessText: null,
      missingLabels: productDataView?.missingLabels ?? [],
      isLocallyReviewedCandidate: true,
      conflict,
    };
  }

  if (reviewedRecord) {
    return {
      status: 'locally_reviewed_candidate',
      sourceLabel: 'Yerel aday kayıt (cihazda incelendi)',
      freshnessText: `İnceleme: ${formatDateLabel(reviewedRecord.createdAt)}`,
      missingLabels: productDataView?.missingLabels ?? [],
      isLocallyReviewedCandidate: true,
      conflict: null,
    };
  }

  if (!productDataView) {
    return { status: 'not_found', sourceLabel: 'Kayıt yok', freshnessText: null, missingLabels: [], isLocallyReviewedCandidate: false, conflict: null };
  }

  const status: ConsumerProductDataStatus =
    productDataView.state === 'usable' ? 'usable' : productDataView.state === 'partial' ? 'partial' : productDataView.state === 'not_found' ? 'not_found' : 'loading';

  return {
    status,
    sourceLabel: productDataView.sourceLabel,
    freshnessText: null,
    missingLabels: productDataView.missingLabels,
    isLocallyReviewedCandidate: false,
    conflict: null,
  };
}

function formatDateLabel(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

// ── Skor boyutları — sıfır puan ASLA gösterilmez; kullanılamıyorsa "veri yetersiz" ────

function sustainabilityConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
  if (confidence === 'high') return 'Güven düzeyi: Yüksek';
  if (confidence === 'medium') return 'Güven düzeyi: Orta';
  return 'Güven düzeyi: Düşük';
}

export function buildScoreDimensionViews(input: {
  rafScore: RafScoreResult | null;
  priceScore: PriceScoreResult | null;
  healthScore: HealthScoreResult | null;
  contentScore: ContentScoreResult | null;
  sustainability: SustainabilityResult | null;
}): ScoreDimensionView[] {
  const { rafScore, priceScore, healthScore, contentScore, sustainability } = input;

  const rafAvailable = Boolean(rafScore && rafScore.status !== 'unavailable' && rafScore.score !== null);
  const priceAvailable = Boolean(priceScore && priceScore.status !== 'unavailable' && priceScore.score !== null);
  const healthAvailable = Boolean(healthScore && healthScore.status !== 'unavailable' && healthScore.score !== null);
  const contentAvailable = Boolean(contentScore && contentScore.status !== 'unavailable' && contentScore.score !== null);
  const sustainabilityAvailable = Boolean(sustainability);

  return [
    {
      key: 'raf',
      label: 'RafSkoru',
      scoreText: rafAvailable ? getRafScoreDisplayValue(rafScore) : null,
      statusText: getRafScoreStatusText(rafScore),
      confidenceText: rafScore ? getRafScoreConfidenceText(rafScore) : null,
      isAvailable: rafAvailable,
    },
    {
      key: 'price',
      label: 'Fiyat',
      scoreText: priceAvailable ? getPriceScoreDisplayValue(priceScore) : null,
      statusText: getPriceScoreStatusText(priceScore),
      confidenceText: priceScore ? getPriceScoreConfidenceText(priceScore) : null,
      isAvailable: priceAvailable,
    },
    {
      key: 'health',
      label: 'Sağlık',
      scoreText: healthAvailable ? getHealthScoreDisplayValue(healthScore) : null,
      statusText: getHealthScoreStatusText(healthScore),
      confidenceText: healthScore ? getHealthScoreConfidenceText(healthScore) : null,
      isAvailable: healthAvailable,
    },
    {
      key: 'content',
      label: 'İçerik / alerjen şeffaflığı',
      scoreText: contentAvailable ? getContentScoreDisplayValue(contentScore) : null,
      confidenceText: contentScore ? getContentScoreConfidenceText(contentScore) : null,
      statusText: getContentScoreStatusText(contentScore),
      isAvailable: contentAvailable,
    },
    {
      key: 'sustainability',
      label: 'Sürdürülebilirlik',
      scoreText: sustainabilityAvailable && sustainability ? `${sustainability.score}/100` : null,
      statusText: sustainabilityAvailable && sustainability ? sustainability.label : 'Bu boyut için veri yetersiz.',
      confidenceText: sustainabilityAvailable && sustainability ? sustainabilityConfidenceLabel(sustainability.confidence) : null,
      isAvailable: sustainabilityAvailable,
    },
  ];
}

// ── Aynı gruptan seçenekler (mevcut, zaten fail-closed filtrelenmiş liste) ────

export function buildAlternativesView(recommendations: readonly AlternativeRecommendation[]): AlternativesView {
  const items: AlternativePreviewItemView[] = recommendations.slice(0, 3).map((rec) => ({
    id: rec.candidate.id,
    productName: rec.candidate.productName,
    reasonLabel: rec.reasonLabel,
    priceDeltaText: rec.priceDeltaText ?? null,
    confidenceText:
      rec.confidenceLevel === 'high' ? 'Veri güveni: Yüksek' : rec.confidenceLevel === 'medium' ? 'Veri güveni: Orta' : 'Veri güveni: Düşük',
    missingSignalsNote:
      rec.candidate.signals?.allergens === undefined || rec.candidate.signals?.traceAllergens === undefined
        ? 'Alerjen kanıtı eksik/doğrulanmamış.'
        : null,
  }));
  return {
    title: 'Aynı gruptan seçenekler',
    items,
    emptyNotice: items.length === 0 ? 'Bu ürün grubu için şu anda gösterilecek seçenek yok.' : null,
  };
}

// ── Bütün görünümü birleştirir ────────────────────────────────────────────────

export interface ProjectConsumerDecisionViewModelInput {
  isLoading: boolean;
  identity: ProductIdentityView;
  allergenDeclaration: AllergenDeclaration;
  riskResult: ProductRiskResult;
  criticalProfileWarnings: readonly RiskWarning[];
  productDataView: ProductDataView | null;
  reviewedRecord: LocallyReviewedRecord | null;
  offProductName: string | null;
  rafScore: RafScoreResult | null;
  priceScore: PriceScoreResult | null;
  healthScore: HealthScoreResult | null;
  contentScore: ContentScoreResult | null;
  sustainability: SustainabilityResult | null;
  visibleAlternatives: readonly AlternativeRecommendation[];
}

export function projectConsumerDecisionViewModel(input: ProjectConsumerDecisionViewModelInput): ConsumerDecisionView {
  const allergenGate = buildAllergenGateView(input.allergenDeclaration, input.criticalProfileWarnings);
  const dataTrust = buildDataTrustView({
    isLoading: input.isLoading,
    productDataView: input.productDataView,
    reviewedRecord: input.reviewedRecord,
    offProductName: input.offProductName,
  });
  const decisionSummary = buildDecisionSummaryView({ allergenGate, riskResult: input.riskResult, dataStatus: dataTrust.status });
  const scoreDimensions = buildScoreDimensionViews({
    rafScore: input.rafScore,
    priceScore: input.priceScore,
    healthScore: input.healthScore,
    contentScore: input.contentScore,
    sustainability: input.sustainability,
  });
  const missingDataVisible = dataTrust.status === 'partial' || dataTrust.status === 'not_found';

  return {
    identity: input.identity,
    allergenGate,
    decisionSummary,
    dataTrust,
    scoreDimensions,
    missingDataAction: {
      visible: missingDataVisible,
      headline: dataTrust.status === 'not_found' ? 'Ürün verisi bulunamadı' : 'Bazı alanlar eksik',
      body:
        dataTrust.status === 'not_found'
          ? 'Ad veya kategoriden tahmin yapılmaz. Paket fotoğrafıyla katkı sağlarsanız aday kayıt oluşur (doğrulanmış ürün olmaz).'
          : `Eksik alanlar: ${dataTrust.missingLabels.join(', ') || 'belirtilmedi'}. Bu alanlar tahminle doldurulmaz.`,
    },
    alternatives: buildAlternativesView(input.visibleAlternatives),
    basket: { addLabel: 'Sepete ekle', openLabel: 'Sepete git' },
    isDevPreview: false,
  };
}
