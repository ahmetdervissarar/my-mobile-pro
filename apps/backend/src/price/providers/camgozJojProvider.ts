import type {
  IPriceProvider,
  PriceQuery,
  PriceResult,
  PriceSource,
} from '../types.js';

const DEFAULT_ENDPOINT = 'https://camgoz.jojapi.net/api/external/search';
const DEFAULT_TIMEOUT_MS = 8000;

interface CamgozJojOptions {
  apiKey?: string;
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface JoJRawItem {
  productName?: string;
  product_name?: string;
  name?: string;
  barcode?: string;
  marketName?: string;
  market?: string;
  price?: number | string;
  currency?: string;
  updatedAt?: string;
  updated_at?: string;
  distance?: string;
}

interface JoJRawResponse {
  results?: JoJRawItem[];
  data?: JoJRawItem[];
  items?: JoJRawItem[];
}

export class CamgozJojProvider implements IPriceProvider {
  public readonly name: PriceSource = 'camgoz_joj';

  private readonly apiKey: string | undefined;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: CamgozJojOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.JOJ_API_KEY;
    this.endpoint = opts.endpoint ?? process.env.JOJ_API_ENDPOINT ?? DEFAULT_ENDPOINT;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  isEnabled(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.length > 0;
  }

  async fetch(query: PriceQuery): Promise<PriceResult | null> {
    if (!this.isEnabled()) return null;
    if (!query.barcode && !query.productName) return null;

    const params = new URLSearchParams();
    if (query.barcode) params.set('barcode', query.barcode);
    if (query.productName) params.set('q', query.productName);

    const url = `${this.endpoint}?${params.toString()}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          'X-JoJAPI-Key': this.apiKey as string,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn('[CamgozJojProvider] HTTP', res.status, query);
        return null;
      }

      const json = (await res.json()) as JoJRawResponse;
      const list = json.results ?? json.data ?? json.items ?? [];
      if (list.length === 0) return null;

      const top = list[0];
      const priceNum = parseNumber(top.price);
      if (priceNum === null) return null;

      const productName =
        top.productName ?? top.product_name ?? top.name ?? query.productName ?? '';
      const marketName = top.marketName ?? top.market ?? 'Bilinmeyen Market';
      const updatedAt = top.updatedAt ?? top.updated_at ?? new Date().toISOString();

      return {
        productName,
        barcode: top.barcode ?? query.barcode,
        marketName,
        price: priceNum,
        currency: top.currency ?? 'TRY',
        source: 'camgoz_joj',
        status: 'live',
        updatedAt,
        confidence: 0.9,
        distanceText: top.distance,
        raw: top,
      };
    } catch (err) {
      console.warn('[CamgozJojProvider] fetch failed:', (err as Error).message);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
