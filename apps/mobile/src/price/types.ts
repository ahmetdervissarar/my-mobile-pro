export type PriceSource =
  | 'manual_beta'
  | 'beta_reference'
  | 'last_known'
  | 'retailer_scraper'
  | 'online_test_seed';

export type PriceStatus =
  | 'live'
  | 'manual_beta'
  | 'beta_reference'
  | 'last_known'
  | 'internal_test'
  | 'unavailable';
export type PriceConfidenceStatus =
  | 'live'
  | 'recent'
  | 'beta_reference'
  | 'not_found';

export type PriceConfidenceSource =
  | 'live_api'
  | 'seed'
  | 'manual_beta'
  | 'last_known'
  | null;

export interface PriceConfidence {
  status: PriceConfidenceStatus;
  source: PriceConfidenceSource;
  observedAt: string | null;
  isSynthetic: boolean;
}

export type MarketChainCode =
  | 'BIM'
  | 'A101'
  | 'SOK'
  | 'MIGROS'
  | 'CARREFOURSA'
  | 'BIZIM_TOPTAN'
  | 'UNKNOWN';

export type PriceScoreStatus = 'ready' | 'partial' | 'unavailable';

export type PriceScoreConfidence = 'low' | 'medium' | 'high';

export interface PriceScoreResult {
  score: number | null;
  status: PriceScoreStatus;
  confidence: PriceScoreConfidence;
  label: string;
  explanations: string[];
  reference: {
    productPrice: number | null;
    referencePrice: number | null;
    lowestPrice: number | null;
    highestPrice: number | null;
    offerCount: number;
  };
  disclaimer: string;
}

export type HealthScoreStatus = 'ready' | 'partial' | 'unavailable';

export type HealthScoreConfidence = 'low' | 'medium' | 'high';

export type HealthScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface HealthScoreResult {
  score: number | null;
  status: HealthScoreStatus;
  confidence: HealthScoreConfidence;
  label: string;
  grade: HealthScoreGrade | null;
  factors: {
    nutriScore: number;
    nova: number;
    trafficLight: number;
    category: number;
  };
  explanations: string[];
  disclaimer: string;
}

export type ContentScoreStatus = 'ready' | 'partial' | 'unavailable';

export type ContentScoreConfidence = 'low' | 'medium' | 'high';

export interface ContentScoreResult {
  score: number | null;
  status: ContentScoreStatus;
  confidence: ContentScoreConfidence;
  label: string;
  factors: {
    ingredientClarity: number;
    additiveRisk: number;
    allergenTransparency: number;
    processingHint: number;
    palmOil: number;
  };
  explanations: string[];
  disclaimer: string;
}

export type SustainabilityCategoryKey =
  | 'plant_based'
  | 'staple_food'
  | 'beverages'
  | 'breakfast'
  | 'baby_food'
  | 'dairy'
  | 'sauces_condiments'
  | 'snacks'
  | 'sweets_chocolate'
  | 'frozen_ready'
  | 'meat'
  | 'unknown';

export type SustainabilityGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type SustainabilityConfidence = 'low' | 'medium' | 'high';

export interface SustainabilityResult {
  score: number;
  grade: SustainabilityGrade;
  label: string;
  confidence: SustainabilityConfidence;
  categoryKey: SustainabilityCategoryKey;
  categoryBaseScore: number;
  factors: {
    packaging: number;
    processing: number;
    origin: number;
    ecoScoreReference: number;
  };
  explanations: string[];
  disclaimer: string;
}

export type RafScoreComponentKey =
  | 'price'
  | 'health'
  | 'content'
  | 'sustainability';

export type RafScoreConfidence = 'low' | 'medium' | 'high';

export type RafScoreStatus = 'ready' | 'partial' | 'unavailable';

export type RafScoreReasonSeverity =
  | 'positive'
  | 'neutral'
  | 'warning'
  | 'negative';

export type RafScoreReasonCategory =
  | 'price'
  | 'health'
  | 'content'
  | 'allergen'
  | 'sustainability'
  | 'data_quality';

export interface RafScoreReason {
  code: string;
  category: RafScoreReasonCategory;
  severity: RafScoreReasonSeverity;
  params?: Record<string, string | number | boolean | null>;
  message?: string;
}

export interface RafScoreWeights {
  price: number;
  health: number;
  content: number;
  sustainability: number;
}

export interface RafScoreComponent {
  key: RafScoreComponentKey;
  label: string;
  score: number | null;
  weight: number;
  isAvailable: boolean;
}

export interface RafScoreResult {
  score: number | null;
  status: RafScoreStatus;
  confidence: RafScoreConfidence;
  weights: RafScoreWeights;
  components: RafScoreComponent[];
  explanations: string[];
  reasons?: RafScoreReason[];
  disclaimer: string;
}

export interface MarketPriceOption {
  id?: string;
  productName?: string;
  marketName: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  location?: string;
  sourceUrl?: string;
  updatedAt?: string;
}

export interface Store {
  chainCode: MarketChainCode;
  displayName: string;
  branchName?: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface StoreDistance {
  distanceMeters: number;
  distanceText: string;
}

export type PriceFreshnessLabel = 'live' | 'recent' | 'stale' | 'reference';

export type PriceAvailability = 'in_stock' | 'out_of_stock' | 'unknown';

export type PriceMatchType =
  | 'barcode'
  | 'provider_product_id'
  | 'exact_name'
  | 'fuzzy_name'
  | 'category_reference';

export interface EnrichedMarketOffer {
  source?: string;
  marketName?: string;
  chainCode: MarketChainCode;
  displayName: string;
  price: number;
  currency: string;
  unitPrice?: number;
  unit?: string;
  productName?: string;
  barcode?: string;
  productUrl?: string;
  imageUrl?: string | null;
  availability?: PriceAvailability;
  observedAt?: string;
  freshnessLabel?: PriceFreshnessLabel;
  store?: Store;
  distance?: StoreDistance;
  distanceMeters?: number;
  distanceText?: string;
  confidence?: number;
  matchType?: PriceMatchType;
  note?: string;
}

export type ProductFactsSource = 'off' | 'beta_inference';

export type ProductFactsNutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type ProductFactsNovaGroup = 1 | 2 | 3 | 4;

export type ProductFactsTrafficLightValue = 'low' | 'medium' | 'high';

export type ProductFactsMissingField =
  | 'productName'
  | 'imageUrl'
  | 'ingredientsText'
  | 'allergens'
  | 'nutrition'
  | 'nutriScoreGrade'
  | 'novaGroup'
  | 'trafficLight';

export type ProductFactsConfidence = 'low' | 'medium' | 'high';

export type ProductFactsAllergenDataStatus = 'present' | 'unknown';

export type ProductFactsAllergenInfoSource = 'off_structured' | 'none';

export interface ProductFactsAllergenInfo {
  dataStatus: ProductFactsAllergenDataStatus;
  declaredAllergens: string[];
  traceAllergens: string[];
  source: ProductFactsAllergenInfoSource;
}

export interface ProductFactsTrafficLight {
  sugar?: ProductFactsTrafficLightValue | null;
  salt?: ProductFactsTrafficLightValue | null;
  saturatedFat?: ProductFactsTrafficLightValue | null;
  fat?: ProductFactsTrafficLightValue | null;
}

export interface ProductFacts {
  barcode?: string | null;
  productName?: string | null;
  imageUrl?: string | null;
  nutriScoreGrade?: ProductFactsNutriScoreGrade | null;
  novaGroup?: ProductFactsNovaGroup | null;
  trafficLight?: ProductFactsTrafficLight | null;
  ingredientsText?: string | null;
  additives?: string[];
  allergens?: string[];
  traceAllergens?: string[];
  allergenInfo?: ProductFactsAllergenInfo;
  dataSource: ProductFactsSource;
  isComplete: boolean;
  missingFields?: ProductFactsMissingField[];
  verificationNeeded?: boolean;
  verificationReason?: string;
  confidence?: ProductFactsConfidence;
  sourceUrl?: string | null;
  observedAt?: string | null;
  verifiedAt?: string | null;
}

export type ProductPackageUnit = 'ml' | 'l' | 'g' | 'kg' | 'unit';

export type NormalizedPackageUnit = 'ml' | 'g' | 'unit';

export interface ProductPackageSize {
  value: number;
  unit: ProductPackageUnit;
  normalizedValue: number;
  normalizedUnit: NormalizedPackageUnit;
  text?: string;
}

export type ProductGroupConfidence = 'exact' | 'strong' | 'assisted' | 'unknown';

export type ProductGroupSource = 'barcode' | 'name_rule' | 'off_assisted' | 'provider_hint' | 'none';

export interface PriceResult {
  productName: string;
  barcode?: string;
  /**
   * Legacy alternative key. Keep semantics frozen during migration.
   * Examples: milk_1l, kefir_1l, chips_100g.
   */
  productGroupKey?: string;

  /**
   * Canonical product group metadata for the new resolver.
   * Examples: milk, kefir, chips.
   */
  resolvedProductGroupKey?: string | null;
  coarseGroup?: string | null;
  groupConfidence?: ProductGroupConfidence;
  groupSource?: ProductGroupSource;
  packageSize?: ProductPackageSize | null;
  alternativesEligible?: boolean;

  marketName: string;
  price: number | null;
  currency: string;
  imageUrl?: string | null;
  source: PriceSource | null;
  status: PriceStatus;
  updatedAt: string;
  confidence: number;
    priceConfidence?: PriceConfidence;
  overallConfidence?: DataConfidenceResult;
  note?: string;
  distanceText?: string;
  marketPrices?: MarketPriceOption[];
  offers?: EnrichedMarketOffer[];
  bestOffer?: EnrichedMarketOffer;
  priceScore?: PriceScoreResult;
  healthScore?: HealthScoreResult;
  contentScore?: ContentScoreResult;
  sustainability?: SustainabilityResult;
  rafScore?: RafScoreResult;
  productFacts?: ProductFacts;
}

export interface PriceResolveResponse {
  result: PriceResult;
  disclaimer: string;
  triedProviders: string[];
}

export interface PriceQuery {
  barcode?: string;
  productName?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
}




export type DataConfidenceLevel = 'low' | 'medium' | 'high';

export interface DataConfidenceResult {
  level: DataConfidenceLevel;
  reasons: string[];
}

export type AlternativeCategoryKey =
  | 'plant_based'
  | 'staple_food'
  | 'beverages'
  | 'breakfast'
  | 'baby_food'
  | 'dairy'
  | 'sauces_condiments'
  | 'snacks'
  | 'sweets_chocolate'
  | 'frozen_ready'
  | 'meat'
  | 'unknown';

export interface AlternativeCandidateScores {
  rafScore: number;
  priceScore: number;
  healthScore: number;
  contentScore: number;
  sustainabilityScore?: number;
}

export interface AlternativeCandidateSignals {
  allergens?: string[];
  /**
   * Eser / çapraz bulaşma ("içerebilir") alerjen listesi — `allergens` (declared, "içerir")
   * ile KARIŞTIRILMAZ; ayrı bir alandır (ADR-004). Yalnız alerjen güvenliği için eklendi;
   * fiyat kaynağı, hesaplama, ağırlık veya sağlayıcı davranışını etkilemez (proje sahibi
   * onayı, 2026-09-18 — üçüncü tur).
   */
  traceAllergens?: string[];
  additives?: string[];
  nutriScoreGrade?: 'A' | 'B' | 'C' | 'D' | 'E';
  novaGroup?: 1 | 2 | 3 | 4;
}

export interface AlternativeCandidate {
  id: string;
  barcode?: string;
  productName: string;
  categoryKey: AlternativeCategoryKey;
  categoryText?: string;
  productGroupKey: string;
  resolvedProductGroupKey?: string | null;
  packageSizeText?: string;
  packageSize?: ProductPackageSize | null;
  marketName: string;
  chainCode: string;
  price: number;
  currency: 'TRY';
  distanceMeters?: number;
  distanceText?: string;
  scores: AlternativeCandidateScores;
  signals?: AlternativeCandidateSignals;
  overallConfidence: DataConfidenceResult;
}

export interface AlternativeRecommendation {
  candidate: AlternativeCandidate;
  rankingScore: number;
  reasonLabel: string;
  rafScoreDelta: number | null;
  priceDelta: number | null;
  priceDeltaText?: string;
  distanceText?: string;
  reasons: string[];
  confidenceLevel: DataConfidenceLevel;
}

export interface AlternativeRecommendationsResponse {
  recommendations: AlternativeRecommendation[];
}

export interface AlternativeRecommendationsQuery {
  categoryKey: AlternativeCategoryKey;
  productGroupKey?: string;
  barcode?: string;
  productName?: string;
  price?: number | null;
  rafScore?: number | null;
  healthScore?: number | null;
  contentScore?: number | null;
  sustainabilityScore?: number | null;
  limit?: number;
}
