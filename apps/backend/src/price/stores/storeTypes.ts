export type MarketChainCode =
  | 'BIM'
  | 'A101'
  | 'SOK'
  | 'MIGROS'
  | 'CARREFOURSA'
  | 'BIZIM_TOPTAN'
  | 'UNKNOWN';

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
  currency: 'TRY';
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

