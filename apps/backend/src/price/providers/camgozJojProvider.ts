import type {
  IPriceProvider,
  MarketPriceOption,
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

interface JoJMarketItem {
  id?: string;
  name?: string;
  price?: number | string;
  priceModified?: string;
  market?: string;
  sourceUrl?: string;
  location?: string;
}

interface JoJRawItem {
  productName?: string;
  product_name?: string;
  name?: string;
  barcode?: string;
  brand?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  marketName?: string;
  market?: string;
  marketCount?: number | null;
  markets?: JoJMarketItem[] | null;
  price?: number | string;
  total?: number | string;
  currency?: string;
  salesUnit?: string;
  updatedAt?: string;
  updated_at?: string;
  distance?: string;
}

type JoJRawResponse =
  | JoJRawItem[]
  | {
      results?: JoJRawItem[];
      data?: JoJRawItem[];
      items?: JoJRawItem[];
    };

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

    const searchTerm = query.productName ?? query.barcode;
    if (!searchTerm) return null;

    const params = new URLSearchParams();
    params.set('query', searchTerm);
    params.set('marketPrices', 'true');

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
      const list = extractList(json);
      if (list.length === 0) return null;

      const top = list[0];
      const productName =
        top.productName ?? top.product_name ?? top.name ?? query.productName ?? '';
      const currency = normalizeCurrency(top.currency ?? top.salesUnit);
      const marketPrices = extractMarketPrices(top, currency);

      if (marketPrices.length > 0) {
        const best = marketPrices[0];

        return {
          productName,
          barcode: top.barcode ?? query.barcode,
          marketName: best.marketName,
          price: best.price,
          currency: best.currency,
          source: 'camgoz_joj',
          status: 'live',
          updatedAt: best.updatedAt ?? top.updatedAt ?? top.updated_at ?? new Date().toISOString(),
          confidence: 0.9,
          marketPrices,
          raw: top,
        };
      }

      const priceNum = parseNumber(top.total ?? top.price);
      if (priceNum === null) return null;

      return {
        productName,
        barcode: top.barcode ?? query.barcode,
        marketName: top.marketName ?? top.market ?? 'Fiyat kaynağı',
        price: priceNum,
        currency,
        source: 'camgoz_joj',
        status: 'live',
        updatedAt: top.updatedAt ?? top.updated_at ?? new Date().toISOString(),
        confidence: 0.75,
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

function extractList(response: JoJRawResponse): JoJRawItem[] {
  if (Array.isArray(response)) return response;
  return response.results ?? response.data ?? response.items ?? [];
}

function extractMarketPrices(item: JoJRawItem, currency: string): MarketPriceOption[] {
  if (!Array.isArray(item.markets)) return [];

  return item.markets
    .map((marketItem): MarketPriceOption | null => {
      const price = parseNumber(marketItem.price);
      const marketName = cleanText(marketItem.market);

      if (price === null || !marketName) return null;

      return {
        id: marketItem.id,
        productName: cleanText(marketItem.name),
        marketName,
        price,
        currency,
        location: cleanText(marketItem.location),
        sourceUrl: cleanText(marketItem.sourceUrl),
        updatedAt: cleanText(marketItem.priceModified),
      };
    })
    .filter((value): value is MarketPriceOption => value !== null)
    .sort((a, b) => a.price - b.price);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const normalized = trimmed.includes(',')
      ? trimmed.replace(/\./g, '').replace(',', '.')
      : trimmed;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

function normalizeCurrency(value: unknown): string {
  if (typeof value !== 'string') return 'TRY';

  const normalized = value.trim().toUpperCase();
  if (normalized === 'TL' || normalized === 'TRY') return 'TRY';

  return normalized || 'TRY';
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
