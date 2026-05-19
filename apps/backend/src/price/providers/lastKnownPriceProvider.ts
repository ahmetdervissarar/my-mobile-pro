import type {
  IPriceProvider,
  PriceQuery,
  PriceResult,
  PriceSource,
} from '../types.js';

interface LastKnownOptions {
  ttlMs?: number;
  enabled?: boolean;
}

interface CacheRow {
  result: PriceResult;
  cachedAt: number;
}

export class LastKnownPriceProvider implements IPriceProvider {
  public readonly name: PriceSource = 'last_known';

  private readonly ttlMs: number;
  private readonly enabled: boolean;
  private readonly store = new Map<string, CacheRow>();

  constructor(opts: LastKnownOptions = {}) {
    this.ttlMs = opts.ttlMs ?? 1000 * 60 * 60 * 24 * 30;
    this.enabled = opts.enabled ?? true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  remember(query: PriceQuery, result: PriceResult): void {
    if (result.price === null) return;
    if (result.status !== 'live' && result.status !== 'manual_beta') return;

    const key = makeKey(query);
    if (!key) return;

    this.store.set(key, {
      result,
      cachedAt: Date.now(),
    });
  }

  async fetch(query: PriceQuery): Promise<PriceResult | null> {
    const key = makeKey(query);
    if (!key) return null;

    const row = this.store.get(key);
    if (!row) return null;

    if (Date.now() - row.cachedAt > this.ttlMs) {
      this.store.delete(key);
      return null;
    }

    return {
      ...row.result,
      status: 'last_known',
      source: 'last_known',
      confidence: Math.min(row.result.confidence, 0.4),
      note: 'Son bilinen fiyat. Güncel olmayabilir.',
    };
  }
}

function makeKey(query: PriceQuery): string | null {
  if (query.barcode) return `b:${query.barcode}`;
  if (query.productName) {
    return `n:${query.productName.trim().toLocaleLowerCase('tr-TR')}`;
  }
  return null;
}
