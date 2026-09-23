import type { CatalogAllergenData, CatalogNova, CatalogNutriScore } from '../catalog/catalog.js';

export type Score0To100 = number;

export type BasketItem = ProductGroupBasketItem | ProductBasketItem;

export interface BasketItemQuantity {
  amount: number;
  unit: 'piece' | 'gram' | 'kilogram' | 'milliliter' | 'liter';
}

export interface ProductGroupBasketItem {
  type: 'product_group';
  productGroupKey: string;
  label: string;
  quantity: BasketItemQuantity;
}

export interface ProductBasketItem {
  type: 'product';
  productId: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: {
    amount: number;
    unit: string;
  };
  quantity: BasketItemQuantity;
}

export interface BasketLocation {
  lat: number;
  lng: number;
}

export interface BasketEvaluateRequest {
  items: BasketItem[];
  location?: BasketLocation;
}

export type BasketCoverage = 'full' | 'partial' | 'insufficient_data';

export interface BasketProfileSubScores {
  health: Score0To100 | null;
  content: Score0To100 | null;
  additives: Score0To100 | null;
  sustainability: Score0To100 | null;
}

/**
 * Bu görevin puanı hangi kaynaktan geldiğini gösterir; puanlama mantığını
 * değiştirmez, yalnız etiketler. 'product' bu görevde henüz üretilmiyor
 * (ürün düzeyinde gerçek skor hesaplama ayrı bir görev) — tip ileriye
 * dönük olarak tanımlıdır.
 */
export type BasketItemScoreSource = 'product' | 'group_estimate' | 'none';

export interface BasketProfileItem {
  type: BasketItem['type'];
  label: string;
  productGroupKey: string;
  quantity: BasketItemQuantity;
  score: Score0To100 | null;
  subScores: BasketProfileSubScores;
  riskFlags: string[];
  scoreSource: BasketItemScoreSource;
  /** Aşağıdakiler yalnız productId katalogda bulunduğunda doludur. */
  brand?: string;
  imageUrl?: string | null;
  nutriScore?: CatalogNutriScore;
  nova?: CatalogNova;
  allergenData?: CatalogAllergenData;
  /** Katalogda bulunamayan (veya product_group tipi) her öğede bunun yerine bu alan set edilir. */
  allergenDataStatus?: 'unknown_or_unverified';
}

export interface BasketProfile {
  itemCount: number;
  coverage: BasketCoverage;
  basketRafSkoru: Score0To100 | null;
  subScores: BasketProfileSubScores;
  perItem: BasketProfileItem[];
}

export type MarketEvaluationStatus = 'real' | 'demo' | 'insufficient_data';

export interface BasketMarketAvailability {
  available: number;
  total: number;
  missing: string[];
}

export interface BasketMarketPriceEstimate {
  amount: number;
  currency: 'TRY';
  coversItemCount: number;
}

export interface BasketMarketEvaluation {
  marketId: string;
  name: string;
  distanceKm: number | null;
  availability: BasketMarketAvailability;
  priceEstimate?: BasketMarketPriceEstimate;
  basketPriceScore?: Score0To100;
  basketAvailabilityScore?: Score0To100;
  basketDistanceScore?: Score0To100;
  marketBasketRafSkoru?: Score0To100;
}

export interface BasketMarketEvaluations {
  status: MarketEvaluationStatus;
  markets: BasketMarketEvaluation[];
  cheapestMarketId?: string | null;
  bestRafScoreMarketId?: string | null;
  insufficientDataReason?: string;
}

export interface BasketEvaluateResponse {
  ok: true;
  basketProfile: BasketProfile;
  marketEvaluations: BasketMarketEvaluations;
}
