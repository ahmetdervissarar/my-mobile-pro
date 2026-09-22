/**
 * RafSkoru — Ürün Sonucu Yardımcı Fonksiyonları
 * src/features/productResult/helpers.ts
 *
 * app/product-result.tsx içinden mantık değiştirilmeden taşınmıştır.
 * Bu dosya saf hesaplama/biçimlendirme katmanıdır; risk motoruna dokunmaz.
 */

import type { CatalogAllergenData } from '../../api/catalogTypes';
import type { ProductSearchInput } from '../../services/productService';
import type {
  EnrichedMarketOffer,
  PriceResolveResponse,
  ProductFacts,
} from '../../price/types';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel } from '../../riskEngine/catalogAllergenChip';
import type { AllergenDisplayInfo } from '../../riskEngine/catalogAllergenChip';
import type { ProductResult, TrafficLightNutrition } from '../../types/product';
import type { RiskLevel, RiskWarning } from '../../riskEngine/riskEngine';
import { CRITICAL_ALLERGEN_CODES } from '../../riskEngine/criticalAllergenCodes';
import { allergenOptions } from '../../userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';
import type { AllergenBannerCriticalMatch, AllergenBannerStatus } from '../../ui/AllergenBanner';

const ALLERGEN_KEY_LABELS: Record<string, string> = Object.fromEntries(
  allergenOptions.map((option) => [option.key, option.label]),
);

export { CRITICAL_ALLERGEN_CODES };

export function formatOfferStoreLabel(offer: EnrichedMarketOffer): string {
  const branchName = offer.store?.branchName?.trim();

  if (
    branchName &&
    branchName.toLocaleLowerCase('tr-TR') !== offer.displayName.toLocaleLowerCase('tr-TR')
  ) {
    return `${offer.displayName} · ${branchName}`;
  }

  return offer.displayName;
}

export function formatOfferDistanceLabel(offer: EnrichedMarketOffer): string {
  return offer.distance?.distanceText ?? 'Mesafe bilgisi yok';
}

export function isSameOffer(first: EnrichedMarketOffer, second: EnrichedMarketOffer): boolean {
  return (
    first.chainCode === second.chainCode &&
    first.displayName === second.displayName &&
    first.price === second.price &&
    first.currency === second.currency &&
    first.store?.branchName === second.store?.branchName &&
    first.distance?.distanceText === second.distance?.distanceText
  );
}

function normalizeProductFactsTrafficLightLevel(
  level: 'low' | 'medium' | 'high' | null | undefined,
): 'low' | 'medium' | 'high' | 'unknown' {
  return level ?? 'unknown';
}

export function productFactsToRiskTrafficLight(
  productFacts: ProductFacts,
): TrafficLightNutrition | null {
  const trafficLight = productFacts.trafficLight;

  if (!trafficLight) {
    return null;
  }

  return {
    fat: { value: null, unit: null, level: normalizeProductFactsTrafficLightLevel(trafficLight.fat) },
    saturatedFat: {
      value: null,
      unit: null,
      level: normalizeProductFactsTrafficLightLevel(trafficLight.saturatedFat),
    },
    sugars: { value: null, unit: null, level: normalizeProductFactsTrafficLightLevel(trafficLight.sugar) },
    salt: { value: null, unit: null, level: normalizeProductFactsTrafficLightLevel(trafficLight.salt) },
  };
}

const productFactsMissingFieldLabels: Record<string, string> = {
  productName: 'ürün adı',
  imageUrl: 'ürün görseli',
  ingredientsText: 'içindekiler',
  allergens: 'alerjen bilgisi',
  nutrition: 'besin değerleri',
  nutriScoreGrade: 'Nutri-Score',
  novaGroup: 'NOVA grubu',
  trafficLight: 'Traffic Light',
};

export function getProductFactsConfidenceLabel(confidence: ProductFacts['confidence']): string {
  if (confidence === 'high') return 'Yüksek';
  if (confidence === 'medium') return 'Orta';
  return 'Düşük';
}

export function formatProductFactsMissingFields(productFacts: ProductFacts | null): string | null {
  const missingFields = productFacts?.missingFields ?? [];

  if (missingFields.length === 0) {
    return null;
  }

  const labels = missingFields.map((field) => productFactsMissingFieldLabels[field] ?? field);
  const visibleLabels = labels.slice(0, 4);
  const remainingCount = labels.length - visibleLabels.length;

  return remainingCount > 0
    ? visibleLabels.join(', ') + ' +' + remainingCount + ' alan'
    : visibleLabels.join(', ');
}

export function formatAllergenTagList(items: string[]): string {
  return items
    .map((item) => item.replace(/^en:/, '').replace(/-/g, ' '))
    .filter(Boolean)
    .join(', ');
}

export function createBarcodePendingResult(barcode: string | undefined): ProductResult {
  return {
    id: barcode ? `barcode-pending-${barcode}` : 'barcode-pending',
    name: '',
    barcode: barcode ?? '',
    searchSource: 'barcode',
    healthScore: 0,
    priceText: '',
    imageUrl: null,
    warnings: [],
    allergens: [],
    additives: [],
    ingredients: null,
    nutriScore: null,
    novaGroup: null,
    trafficLight: null,
    analysisStatus: 'ready',
    analysisMessage: null,
  };
}

export function createNeutralPendingResult(input: ProductSearchInput): ProductResult {
  const productName = input.productName?.trim();
  const photoSource = input.photoSource?.trim();

  return {
    id: productName ? `name-pending-${productName}` : 'photo-pending',
    name: productName || (photoSource ? 'Fotoğraftan ürün analizi bekleniyor' : 'Ürün analizi bekleniyor'),
    barcode: '',
    searchSource: photoSource ? 'photo' : 'name',
    healthScore: 0,
    priceText: '',
    imageUrl: photoSource && photoSource !== 'camera' ? photoSource : null,
    warnings: [],
    allergens: [],
    additives: [],
    ingredients: null,
    nutriScore: null,
    novaGroup: null,
    trafficLight: null,
    analysisStatus: 'not_found',
    analysisMessage: 'Ürün bilgileri doğrulanıyor. Sağlık ve alerjen yorumu için güvenilir ürün verisi bekleniyor.',
  };
}

export function getInitialResult(input: ProductSearchInput): ProductResult {
  const barcode = input.barcode?.trim();

  if (barcode) {
    return createBarcodePendingResult(barcode);
  }

  return createNeutralPendingResult(input);
}

export function getTransitionSafeProductGroupKey(input: {
  resolvedProductGroupKey?: string | null;
  productGroupKey?: string | null;
}): string | null {
  return input.resolvedProductGroupKey ?? input.productGroupKey ?? null;
}

export function isExplicitlyAlternativesIneligible(input: { alternativesEligible?: boolean }): boolean {
  return input.alternativesEligible === false;
}

export interface AllergenBannerData {
  status: AllergenBannerStatus;
  declaredList: string[];
  traceList: string[];
  criticalMatches: AllergenBannerCriticalMatch[];
  displayInfo: AllergenDisplayInfo | null;
}

/**
 * riskEngine ve productFacts çıktısından AllergenBanner'ın dört durumunu türetir.
 * Yeni bir alerjen kararı ÜRETMEZ — yalnız zaten hesaplanmış verinin sunum eşlemesidir.
 */
export function getAllergenBannerData(input: {
  productFacts: ProductFacts | null;
  riskWarnings: RiskWarning[];
}): AllergenBannerData {
  const criticalMatches: AllergenBannerCriticalMatch[] = input.riskWarnings
    .filter((warning) => CRITICAL_ALLERGEN_CODES.includes(warning.code))
    .map((warning) => ({ code: warning.code, title: warning.title, message: warning.message }));

  const allergenInfo = input.productFacts?.allergenInfo;

  if (allergenInfo && allergenInfo.dataStatus === 'present') {
    const declaredList = (allergenInfo.declaredAllergens ?? []).map((tag) =>
      formatAllergenTagList([tag]),
    );
    const traceList = (allergenInfo.traceAllergens ?? []).map((tag) => formatAllergenTagList([tag]));

    if (declaredList.length > 0) {
      return { status: 'declared_contains', declaredList, traceList, criticalMatches, displayInfo: null };
    }

    if (traceList.length > 0) {
      return { status: 'trace_may_contain', declaredList, traceList, criticalMatches, displayInfo: null };
    }

    return { status: 'not_listed_in_available_data', declaredList, traceList, criticalMatches, displayInfo: null };
  }

  return { status: 'unknown_or_unverified', declaredList: [], traceList: [], criticalMatches, displayInfo: null };
}

/**
 * PAYLAŞILAN ÇEKİRDEĞİ (evaluateCatalogAllergenDataForProfile) kullanır —
 * arama çipi ve sepet satırıyla AYNI birleştirme mantığı, AYNI en-ağır-sonuç
 * kuralı (bkz. catalogAllergenChip.ts). getCatalogAllergenChipStatus'u
 * DOĞRUDAN çağırmaz — çip'e özgü dar sonuç şekli yerine, banner'ın kendi
 * (declaredList/traceList) sunumuna evaluateCatalogAllergenDataForProfile'ın
 * perKey ayrıntısı üzerinden ulaşır. Yalnız productFacts.catalogAllergenData
 * DOLUYSA (ürün yerel OFF-TR katalogundan geldiyse) çağrılmalıdır.
 */
export function getAllergenBannerDataFromCatalog(input: {
  catalogAllergenData: CatalogAllergenData;
  userProfile: UserSensitivityProfile;
  riskWarnings: RiskWarning[];
}): AllergenBannerData {
  const criticalMatches: AllergenBannerCriticalMatch[] = input.riskWarnings
    .filter((warning) => CRITICAL_ALLERGEN_CODES.includes(warning.code))
    .map((warning) => ({ code: warning.code, title: warning.title, message: warning.message }));

  const evaluation = evaluateCatalogAllergenDataForProfile(input.catalogAllergenData, input.userProfile);
  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);

  if (input.userProfile.allergens.length === 0) {
    // Profil boş — genel ürün bilgisi: TÜM beyan/iz edilen alerjenler gösterilir (profille filtrelenmez).
    const declaredList = input.catalogAllergenData.declared.map((key) => ALLERGEN_KEY_LABELS[key] ?? key);
    const traceList = input.catalogAllergenData.traces.map((key) => ALLERGEN_KEY_LABELS[key] ?? key);
    return { status: evaluation.status, declaredList, traceList, criticalMatches, displayInfo };
  }

  const declaredList = evaluation.perKey
    .filter((keyResult) => keyResult.status === 'declared_contains')
    .map((keyResult) => ALLERGEN_KEY_LABELS[keyResult.key] ?? keyResult.key);
  const traceList = evaluation.perKey
    .filter((keyResult) => keyResult.status === 'trace_may_contain')
    .map((keyResult) => ALLERGEN_KEY_LABELS[keyResult.key] ?? keyResult.key);

  return { status: evaluation.status, declaredList, traceList, criticalMatches, displayInfo };
}

export function getPriceSourceLabel(source: PriceResolveResponse['result']['source']): string {
  if (source === 'manual_beta') return 'Beta manuel veri';
  if (source === 'beta_reference') return 'Beta referans veri';
  if (source === 'last_known') return 'Son bilinen fiyat';
  if (source === 'retailer_scraper') return 'Market kaynaklı veri';
  if (source === 'online_test_seed') return 'Beta fiyat verisi';
  return 'Fiyat kaynağı yok';
}

export function getDataConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
  if (confidence === 'high') return 'Yüksek';
  if (confidence === 'medium') return 'Orta';
  return 'Düşük';
}

export function getPriceSourceMetaText(priceResult: PriceResolveResponse['result']): string {
  const sourceText = `Fiyat kaynağı: ${getPriceSourceLabel(priceResult.source)}`;
  const confidenceText = priceResult.overallConfidence
    ? `Veri güveni: ${getDataConfidenceLabel(priceResult.overallConfidence.level)}`
    : null;

  return confidenceText ? `${sourceText} · ${confidenceText}` : sourceText;
}

export type PriceConfidenceBadgeTone = 'live' | 'recent' | 'beta' | 'missing';

export function formatObservedAtRelativeLabel(observedAt: string | null): string {
  if (!observedAt) {
    return 'son güncelleme bilinmiyor';
  }

  const observedDate = new Date(observedAt);

  if (Number.isNaN(observedDate.getTime())) {
    return 'son güncelleme bilinmiyor';
  }

  const now = new Date();
  const observedStart = new Date(observedDate.getFullYear(), observedDate.getMonth(), observedDate.getDate());
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.max(0, Math.floor((todayStart.getTime() - observedStart.getTime()) / 86_400_000));

  if (diffDays === 0) return 'bugün';
  if (diffDays === 1) return 'dün';
  return `${diffDays} gün önce`;
}

export function getPriceConfidenceBadge(
  priceResult: PriceResolveResponse['result'],
): { label: string; tone: PriceConfidenceBadgeTone } {
  const confidence = priceResult.priceConfidence;

  if (!confidence) {
    return priceResult.price === null
      ? { label: 'Fiyat bulunamadı', tone: 'missing' }
      : { label: 'Beta referans fiyat', tone: 'beta' };
  }

  if (confidence.status === 'live' && !confidence.isSynthetic) {
    return { label: 'Canlı fiyat', tone: 'live' };
  }

  if (confidence.status === 'recent') {
    return { label: `Son güncelleme: ${formatObservedAtRelativeLabel(confidence.observedAt)}`, tone: 'recent' };
  }

  if (confidence.status === 'not_found') {
    return { label: 'Fiyat bulunamadı', tone: 'missing' };
  }

  return { label: 'Beta referans fiyat', tone: 'beta' };
}

export function getSustainabilityConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
  if (confidence === 'high') return 'Yüksek';
  if (confidence === 'medium') return 'Orta';
  return 'Düşük';
}

export function getSustainabilityCategoryLabel(categoryKey: string): string {
  const labels: Record<string, string> = {
    plant_based: 'Bitkisel ürün',
    staple_food: 'Temel gıda',
    beverages: 'İçecek',
    breakfast: 'Kahvaltılık',
    baby_food: 'Bebek gıdası',
    dairy: 'Süt ürünü',
    sauces_condiments: 'Sos / çeşni',
    snacks: 'Atıştırmalık',
    sweets_chocolate: 'Tatlı / çikolata',
    frozen_ready: 'Dondurulmuş / hazır gıda',
    meat: 'Et ürünü',
    unknown: 'Bilinmeyen kategori',
  };

  return labels[categoryKey] ?? 'Bilinmeyen kategori';
}

export const riskLevelLabel: Record<RiskLevel, string> = {
  low: 'Düşük risk',
  medium: 'Orta risk',
  high: 'Yüksek risk',
  unknown: 'Bilinmiyor',
};
