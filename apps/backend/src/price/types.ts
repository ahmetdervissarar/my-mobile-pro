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
  'Bu fiyatlar kapal\u0131 beta test s\u00fcrecinde kullan\u0131lan referans fiyatlard\u0131r. ' +
  'Market, kampanya, konum ve stok durumuna g\u00f6re de\u011fi\u015febilir. ' +
  'Sat\u0131n alma \u00f6ncesinde g\u00fcncel market fiyat\u0131n\u0131 kontrol ediniz.';

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
    note: 'Fiyat bilgisi \u015fu anda bulunamad\u0131.',
  };
}