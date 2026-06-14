export type PriceSource =
  | 'manual_beta'
  | 'beta_reference'
  | 'last_known'
  | 'retailer_scraper';

export type PriceStatus =
  | 'live'
  | 'manual_beta'
  | 'beta_reference'
  | 'last_known'
  | 'unavailable';

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

export interface PriceResult {
  productName: string;
  barcode?: string;
  marketName: string;
  price: number | null;
  currency: string;
  imageUrl?: string | null;
  source: PriceSource | null;
  status: PriceStatus;
  updatedAt: string;
  confidence: number;
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



