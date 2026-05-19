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
  source: PriceSource | null;
  status: PriceStatus;
  updatedAt: string;
  confidence: number;
  note?: string;
  distanceText?: string;
  marketPrices?: MarketPriceOption[];
}

export interface PriceResolveResponse {
  result: PriceResult;
  disclaimer: string;
  triedProviders: string[];
}

export interface PriceQuery {
  barcode?: string;
  productName?: string;
}
