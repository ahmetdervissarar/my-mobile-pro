import type { ProductGroupConfidence, ProductGroupSource, ProductPackageSize } from './productGroups/index.js';

import type { EnrichedMarketOffer } from './stores/storeTypes.js';
import type { SustainabilityResult } from './sustainability/index.js';
import type { RafScoreResult } from './rafScore/index.js';
import type { PriceScoreResult } from './priceScore/index.js';
import type { HealthScoreResult } from './healthScore/index.js';
import type { ContentScoreResult } from './contentScore/index.js';
import type { ProductFacts } from './productFacts/index.js';
import type { DataConfidenceResult } from './confidence/types.js';

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
  raw?: unknown;
}

export interface PriceQuery {
  barcode?: string;
  productName?: string;
  productGroupKey?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface IPriceProvider {
  readonly name: PriceSource;
  isEnabled(): boolean;
  fetch(query: PriceQuery): Promise<PriceResult | null>;
}

export const BETA_DISCLAIMER =
  'Bu fiyat bilgileri kapalı beta sürecinde sağlayıcı kaynaklardan alınır. ' +
  'Market, kampanya, konum ve stok durumuna göre değişebilir. ' +
  'Satın alma öncesinde güncel market fiyatını kontrol ediniz.';

export function makeUnavailableResult(query: PriceQuery): PriceResult {
  return {
    productName: query.productName ?? '',
    barcode: query.barcode,
    marketName: '-',
    price: null,
    currency: 'TRY',
    source: null,
    status: 'unavailable',
    updatedAt: new Date().toISOString(),
    confidence: 0,
        priceConfidence: {
      status: 'not_found',
      source: null,
      observedAt: null,
      isSynthetic: false,
    },
    note: 'Fiyat bilgisi şu anda bulunamadı.',
  };
}
