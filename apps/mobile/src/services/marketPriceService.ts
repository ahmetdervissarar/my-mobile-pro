export type MarketLocation = {
  /** locationService üzerinden gelen enlem değeri */
  latitude: number;
  /** locationService üzerinden gelen boylam değeri */
  longitude: number;
};

export interface MarketPriceQuery {
  productName?: string;
  barcode?: string;
}

export interface MarketPriceResult {
  prices: Array<{
    marketName: string;
    price: number;
    currency: string;
    updatedAt?: string;
  }>;
  meta: {
    queriedAt: string;
    hasLocation: boolean;
  };
}

export async function fetchMarketPrices(
  query: MarketPriceQuery,
  location?: MarketLocation,
): Promise<MarketPriceResult> {
  // TODO: Integrate with real market price provider API.
  // TODO: Use query.productName and query.barcode for product matching.
  // TODO: Use location to filter nearby markets when location is provided.
  // TODO: locationService üzerinden gelen konum market fiyatı sorgusunda kullanılacak.

  return {
    prices: [],
    meta: {
      queriedAt: new Date().toISOString(),
      hasLocation: Boolean(location),
    },
  };
}
