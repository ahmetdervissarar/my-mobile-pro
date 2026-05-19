import type {
  PriceQuery,
  PriceResolveResponse,
  PriceResult,
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

export class PriceClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: PriceClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = opts.timeoutMs ?? 8000;
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
      const message = (err as Error)?.message ?? 'Bilinmeyen a\u011f hatas\u0131';
      return this.unavailable(query, message);
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
      note: `Fiyat al\u0131namad\u0131: ${reason}`,
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