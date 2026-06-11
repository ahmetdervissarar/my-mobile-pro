export type PriceSource =
  | 'camgoz_joj'
  | 'manual_beta'
  | 'beta_reference'
  | 'last_known'
  | 'marketfiyati'
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

export interface EnrichedMarketOffer {
  chainCode: MarketChainCode;
  displayName: string;
  price: number;
  currency: string;
  store?: Store;
  distance?: StoreDistance;
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
  sustainability?: SustainabilityResult;
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
