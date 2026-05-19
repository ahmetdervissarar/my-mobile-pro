import type {
  IPriceProvider,
  PriceQuery,
  PriceResult,
  PriceSource,
} from '../types.js';

interface BetaReferenceOptions {
  enabled?: boolean;
}

const CATEGORY_HINTS: Array<{ keywords: string[]; price: number; label: string }> = [
  { keywords: ['zeytinyagi'], price: 320, label: 'Zeytinya\u011f\u0131' },
  { keywords: ['aycicek'], price: 180, label: 'Ay\u00e7i\u00e7ek ya\u011f\u0131' },
  { keywords: ['sut'], price: 45, label: 'S\u00fct' },
  { keywords: ['yumurta'], price: 95, label: 'Yumurta' },
  { keywords: ['ekmek'], price: 15, label: 'Ekmek' },
  { keywords: ['peynir'], price: 180, label: 'Peynir' },
  { keywords: ['yogurt'], price: 60, label: 'Yo\u011furt' },
  { keywords: ['makarna'], price: 25, label: 'Makarna' },
  { keywords: ['pirinc'], price: 80, label: 'Pirin\u00e7' },
  { keywords: ['seker'], price: 55, label: '\u015eeker' },
  { keywords: ['cay'], price: 120, label: '\u00c7ay' },
  { keywords: ['kahve'], price: 220, label: 'Kahve' },
  { keywords: ['cikolata'], price: 65, label: '\u00c7ikolata' },
  { keywords: ['cips', 'chips'], price: 35, label: 'Cips' },
  { keywords: ['kola', 'cola', 'gazoz'], price: 35, label: '\u0130\u00e7ecek' },
  { keywords: ['su'], price: 10, label: 'Su' },
];

export class BetaReferencePriceProvider implements IPriceProvider {
  public readonly name: PriceSource = 'beta_reference';

  private readonly enabled: boolean;

  constructor(opts: BetaReferenceOptions = {}) {
    this.enabled = opts.enabled ?? true;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async fetch(query: PriceQuery): Promise<PriceResult | null> {
    const name = normalizeTurkish(query.productName ?? '');
    if (!name) return null;

    const match = CATEGORY_HINTS.find((category) =>
      category.keywords.some((keyword) => name.includes(keyword)),
    );

    if (!match) return null;

    return {
      productName: query.productName ?? match.label,
      barcode: query.barcode,
      marketName: 'Demo Market',
      price: match.price,
      currency: 'TRY',
      source: 'beta_reference',
      status: 'beta_reference',
      updatedAt: new Date().toISOString(),
      confidence: 0.2,
      note: 'Demo ama\u00e7l\u0131 kategori bazl\u0131 referans fiyat. Resmi fiyat de\u011fildir.',
    };
  }
}

function normalizeTurkish(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('\u00e7', 'c')
    .replaceAll('\u011f', 'g')
    .replaceAll('\u0131', 'i')
    .replaceAll('i\u0307', 'i')
    .replaceAll('\u00f6', 'o')
    .replaceAll('\u015f', 's')
    .replaceAll('\u00fc', 'u');
}