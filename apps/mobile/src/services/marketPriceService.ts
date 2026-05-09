export interface MarketPriceQuery {
  productName?: string;
  barcode?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
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
): Promise<MarketPriceResult> {
  // TODO: Integrate with real market price provider API.
  // TODO: Use query.productName and query.barcode for product matching.
  // TODO: Use query.location to filter nearby markets when location is provided.

  return {
    prices: [],
    meta: {
      queriedAt: new Date().toISOString(),
      hasLocation: Boolean(query.location),
    },
  };
}
