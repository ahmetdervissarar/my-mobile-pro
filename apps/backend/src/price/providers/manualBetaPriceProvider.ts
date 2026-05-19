import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import type {
  IPriceProvider,
  PriceQuery,
  PriceResult,
  PriceSource,
} from '../types.js';

export interface ManualBetaPriceEntry {
  barcode?: string;
  productName: string;
  marketName: string;
  price: number;
  currency?: string;
  updatedAt?: string;
}

interface ManualBetaOptions {
  seed?: ManualBetaPriceEntry[];
  enabled?: boolean;
  persistPath?: string;
}

export class ManualBetaPriceProvider implements IPriceProvider {
  public readonly name: PriceSource = 'manual_beta';

  private readonly enabled: boolean;
  private readonly persistPath: string | undefined;
  private readonly byBarcode = new Map<string, ManualBetaPriceEntry>();
  private readonly byName = new Map<string, ManualBetaPriceEntry>();

  constructor(opts: ManualBetaOptions = {}) {
    this.enabled = opts.enabled ?? true;
    this.persistPath = opts.persistPath;

    if (this.persistPath && existsSync(this.persistPath)) {
      try {
        const raw = readFileSync(this.persistPath, 'utf8');
        const parsed = JSON.parse(raw) as ManualBetaPriceEntry[];
        if (Array.isArray(parsed)) {
          for (const entry of parsed) this.indexEntry(entry);
        }
      } catch (err) {
        console.warn(
          '[ManualBetaPriceProvider] persist dosyası okunamadı:',
          (err as Error).message,
        );
      }
    }

    for (const entry of opts.seed ?? []) {
      this.upsert(entry);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  upsert(entry: ManualBetaPriceEntry): ManualBetaPriceEntry {
    if (!entry.barcode && !entry.productName) {
      throw new Error('upsert: barcode veya productName gereklidir.');
    }

    const normalized: ManualBetaPriceEntry = {
      ...entry,
      productName: entry.productName || 'Barkodlu ürün',
      updatedAt: entry.updatedAt ?? new Date().toISOString(),
    };

    this.indexEntry(normalized);
    this.persist();
    return normalized;
  }

  list(): ManualBetaPriceEntry[] {
    const seen = new Set<ManualBetaPriceEntry>();
    for (const entry of this.byBarcode.values()) seen.add(entry);
    for (const entry of this.byName.values()) seen.add(entry);
    return Array.from(seen);
  }

  async fetch(query: PriceQuery): Promise<PriceResult | null> {
    let hit: ManualBetaPriceEntry | undefined;

    if (query.barcode) {
      hit = this.byBarcode.get(query.barcode);
    }

    if (!hit && query.productName) {
      hit = this.byName.get(normalize(query.productName));
    }

    if (!hit) return null;

    return {
      productName: hit.productName || query.productName || 'Barkodlu ürün',
      barcode: hit.barcode ?? query.barcode,
      marketName: hit.marketName,
      price: hit.price,
      currency: hit.currency ?? 'TRY',
      source: 'manual_beta',
      status: 'manual_beta',
      updatedAt: hit.updatedAt ?? new Date().toISOString(),
      confidence: 0.6,
      note: 'Beta için manuel olarak girilmiş referans fiyat.',
    };
  }

  private indexEntry(entry: ManualBetaPriceEntry): void {
    if (entry.barcode) {
      this.byBarcode.set(entry.barcode, entry);
    }

    if (entry.productName) {
      this.byName.set(normalize(entry.productName), entry);
    }
  }

  private persist(): void {
    if (!this.persistPath) return;

    try {
      mkdirSync(dirname(this.persistPath), { recursive: true });
      writeFileSync(this.persistPath, JSON.stringify(this.list(), null, 2), 'utf8');
    } catch (err) {
      console.warn(
        '[ManualBetaPriceProvider] persist yazımı başarısız:',
        (err as Error).message,
      );
    }
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}