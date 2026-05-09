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

const PRICE_API_URL = process.env.EXPO_PUBLIC_PRICE_API_URL?.trim();

function createEmptyResult(location?: MarketLocation): MarketPriceResult {
  return {
    prices: [],
    meta: {
      queriedAt: new Date().toISOString(),
      hasLocation: Boolean(location),
    },
  };
}

export async function fetchMarketPrices(
  query: MarketPriceQuery,
  location?: MarketLocation,
): Promise<MarketPriceResult> {
  // Env yoksa mevcut davranış korunur: boş fiyat listesi döndür.
  if (!PRICE_API_URL) {
    return createEmptyResult(location);
  }

  // TODO(backend/proxy):
  // - PRICE_API_URL değerini backend/proxy base URL olarak kullan.
  // - query.productName, query.barcode ve location bilgilerini backend'e gönder.
  // - Doğrudan market sağlayıcısına gitmek yerine yalnızca backend/proxy endpoint'ini çağır.
  // - Hata/timeout durumlarında uygulamanın çökmesini engelleyip boş sonuç döndür.
  // NOTE:
  // Şimdilik bilinçli olarak gerçek fetch çağrısı yapılmıyor.
  // Gelecekte kullanılacak güvenli yapı örneği:
  // const controller = new AbortController();
  // const timeout = setTimeout(() => controller.abort(), 5000);
  // try {
  //   const response = await fetch(`${PRICE_API_URL}/market-prices`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ query, location }),
  //     signal: controller.signal,
  //   });
  //   // response kontrol/parsing
  // } finally {
  //   clearTimeout(timeout);
  // }

  void query;

  return createEmptyResult(location);
}
