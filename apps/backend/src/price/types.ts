import type { EnrichedMarketOffer } from './stores/storeTypes.js';
import type { SustainabilityResult } from './sustainability/index.js';

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
  raw?: unknown;
}

export interface PriceQuery {
  barcode?: string;
  productName?: string;
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
  'Bu fiyatlar kapalı beta test sürecinde kullanılan referans fiyatlardır. ' +
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
    note: 'Fiyat bilgisi şu anda bulunamadı.',
  };
}
