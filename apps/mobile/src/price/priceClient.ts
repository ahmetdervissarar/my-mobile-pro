import type {
  PriceQuery,
  PriceResolveResponse,
  PriceResult,
  AlternativeRecommendationsQuery,
  AlternativeRecommendationsResponse,
} from './types';

export interface PriceClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const FALLBACK_DISCLAIMER =
  'Bu fiyatlar kapal\u0131 beta test s\u00fcrecinde kullan\u0131lan referans fiyatlard\u0131r. ' +
  'Market, kampanya, konum ve stok durumuna g\u00f6re de\u011fi\u015febilir. ' +
  'Sat\u0131n alma \u00f6ncesinde g\u00fcncel market fiyat\u0131n\u0131 kontrol ediniz.';

function createUnavailablePriceScore(reason: string): NonNullable<PriceResult['priceScore']> {
  return {
    score: null,
    status: 'unavailable',
    confidence: 'low',
    label: 'Fiyat bulunamadı',
    explanations: ['Fiyat verisi alınamadı: ' + reason],
    reference: {
      productPrice: null,
      referencePrice: null,
      lowestPrice: null,
      highestPrice: null,
      offerCount: 0,
    },
    disclaimer: FALLBACK_DISCLAIMER,
  };
}

function createUnavailableHealthScore(): NonNullable<PriceResult['healthScore']> {
  return {
    score: null,
    status: 'unavailable',
    confidence: 'low',
    label: 'Sağlık skoru hesaplanamadı',
    grade: null,
    factors: {
      nutriScore: 0,
      nova: 0,
      trafficLight: 0,
      category: 0,
    },
    explanations: ['Sağlık skoru için yeterli ürün verisi alınamadı.'],
    disclaimer: 'Sağlık skoru karar destek amaçlıdır; veri bulunamadığında ürün etiketi kontrol edilmelidir.',
  };
}

function createUnavailableContentScore(): NonNullable<PriceResult['contentScore']> {
  return {
    score: null,
    status: 'unavailable',
    confidence: 'low',
    label: 'İçerik/Alerjen skoru hesaplanamadı',
    factors: {
      ingredientClarity: 0,
      additiveRisk: 0,
      allergenTransparency: 0,
      processingHint: 0,
      palmOil: 0,
    },
    explanations: ['İçerik, katkı veya alerjen verisi alınamadı.'],
    disclaimer: 'İçerik/Alerjen skoru kritik alerjen uyarılarının yerine geçmez; ürün etiketi kontrol edilmelidir.',
  };
}

function createUnavailableRafScore(): NonNullable<PriceResult['rafScore']> {
  return {
    score: null,
    status: 'unavailable',
    confidence: 'low',
    weights: {
      price: 35,
      health: 30,
      content: 20,
      sustainability: 15,
    },
    components: [
      { key: 'price', label: 'Fiyat', score: null, weight: 35, isAvailable: false },
      { key: 'health', label: 'Sağlık', score: null, weight: 30, isAvailable: false },
      { key: 'content', label: 'İçerik/Alerjen', score: null, weight: 20, isAvailable: false },
      { key: 'sustainability', label: 'Sürdürülebilirlik', score: null, weight: 15, isAvailable: false },
    ],
    explanations: ['RafSkoru için gerekli veriler alınamadı.'],
    disclaimer: 'RafSkoru karar destek amaçlı tahmini bir göstergedir.',
  };
}

function normalizePriceResolveError(err: unknown): string {
  const errorName = (err as Error)?.name ?? '';
  const message = (err as Error)?.message ?? '';

  if (errorName === 'AbortError' || message.toLowerCase().includes('abort')) {
    return 'Fiyat servisine zamanında ulaşılamadı.';
  }

  if (
    message.toLowerCase().includes('network request failed') ||
    message.toLowerCase().includes('failed to fetch') ||
    message.toLowerCase().includes('networkerror')
  ) {
    return 'Fiyat servisine ulaşılamadı.';
  }

  return message || 'Bilinmeyen ağ hatası';
}

export class PriceClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: PriceClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 4000;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async resolve(query: PriceQuery): Promise<PriceResolveResponse> {
    if (!query.barcode && !query.productName) {
      return this.unavailable(query, 'Sorgu bo\u015f.');
    }

    const params = new URLSearchParams();

    if (query.barcode) {
      params.set('barcode', query.barcode);
    }

    if (query.productName) {
      params.set('q', query.productName);
    }


    if (query.location) {
      params.set('lat', String(query.location.latitude));
      params.set('lng', String(query.location.longitude));
    }

    const url = `${this.baseUrl}/api/price/resolve?${params.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        return this.unavailable(query, `Sunucu hatas\u0131 (${res.status}).`);
      }

      const data = (await res.json()) as PriceResolveResponse;

      if (!data || typeof data !== 'object' || !data.result) {
        return this.unavailable(query, 'Ge\u00e7ersiz sunucu yan\u0131t\u0131.');
      }

      if (typeof data.disclaimer !== 'string' || data.disclaimer.length === 0) {
        data.disclaimer = FALLBACK_DISCLAIMER;
      }

      return data;
    } catch (err) {
      return this.unavailable(query, normalizePriceResolveError(err));
    } finally {
      clearTimeout(timer);
    }
  }


  async fetchAlternatives(
    query: AlternativeRecommendationsQuery,
  ): Promise<AlternativeRecommendationsResponse> {
    if (!query.categoryKey || query.categoryKey === 'unknown' || !query.productGroupKey) {
      return { recommendations: [] };
    }

    const params = new URLSearchParams();
    params.set('categoryKey', query.categoryKey);

    const setOptionalParam = (key: string, value: string | number | null | undefined): void => {
      if (value !== undefined && value !== null && String(value).length > 0) {
        params.set(key, String(value));
      }
    };

    setOptionalParam('productGroupKey', query.productGroupKey);
    setOptionalParam('barcode', query.barcode);
    setOptionalParam('productName', query.productName);
    setOptionalParam('price', query.price);
    setOptionalParam('rafScore', query.rafScore);
    setOptionalParam('healthScore', query.healthScore);
    setOptionalParam('contentScore', query.contentScore);
    setOptionalParam('sustainabilityScore', query.sustainabilityScore);
    setOptionalParam('limit', query.limit);

    const url = `${this.baseUrl}/api/price/alternatives?${params.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        return { recommendations: [] };
      }

      const data = (await res.json()) as AlternativeRecommendationsResponse;

      if (!data || !Array.isArray(data.recommendations)) {
        return { recommendations: [] };
      }

      return data;
    } catch {
      return { recommendations: [] };
    } finally {
      clearTimeout(timer);
    }
  }

  private unavailable(query: PriceQuery, reason: string): PriceResolveResponse {
    const result: PriceResult = {
      productName: query.productName ?? '',
      barcode: query.barcode,
      marketName: '-',
      price: null,
      currency: 'TRY',
      source: null,
      status: 'unavailable',
      updatedAt: new Date().toISOString(),
      confidence: 0,
      note: `Fiyat alınamadı: ${reason}`,
      priceScore: createUnavailablePriceScore(reason),
      healthScore: createUnavailableHealthScore(),
      contentScore: createUnavailableContentScore(),
      rafScore: createUnavailableRafScore(),
    };

    return {
      result,
      disclaimer: FALLBACK_DISCLAIMER,
      triedProviders: [],
    };
  }
}

export function priceStatusLabel(status: PriceResult['status']): string {
  switch (status) {
    case 'live':
      return 'Canl\u0131';
    case 'manual_beta':
      return 'Beta';
    case 'beta_reference':
      return 'Beta Referans';
    case 'last_known':
      return 'Son Bilinen';
    case 'unavailable':
      return 'Bulunamad\u0131';
  }
}

export function formatPriceForDisplay(price: number | null, currency: string): string {
  if (price === null) {
    return 'Fiyat bulunamad\u0131';
  }

  const formatted = price.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currency === 'TRY') {
    return `${formatted} TL`;
  }

  return `${formatted} ${currency}`;
}
