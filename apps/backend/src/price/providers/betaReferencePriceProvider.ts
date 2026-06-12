import type {
  IPriceProvider,
  MarketPriceOption,
  PriceQuery,
  PriceResult,
  PriceSource,
} from '../types.js';

interface BetaReferenceOptions {
  enabled?: boolean;
}

interface CategoryHint {
  keywords: string[];
  price: number;
  label: string;
}

const CATEGORY_HINTS: CategoryHint[] = [
  { keywords: ['zeytinyagi'], price: 320, label: 'Zeytinyagi' },
  { keywords: ['aycicek'], price: 180, label: 'Aycicek yagi' },
  { keywords: ['sut'], price: 45, label: 'Sut' },
  { keywords: ['yumurta'], price: 95, label: 'Yumurta' },
  { keywords: ['ekmek'], price: 15, label: 'Ekmek' },
  { keywords: ['peynir'], price: 180, label: 'Peynir' },
  { keywords: ['yogurt'], price: 60, label: 'Yogurt' },
  { keywords: ['makarna'], price: 25, label: 'Makarna' },
  { keywords: ['pirinc'], price: 80, label: 'Pirinc' },
  { keywords: ['seker'], price: 55, label: 'Seker' },
  { keywords: ['cay'], price: 120, label: 'Cay' },
  { keywords: ['kahve'], price: 220, label: 'Kahve' },
  { keywords: ['cikolata'], price: 65, label: 'Cikolata' },
  { keywords: ['cips', 'chips'], price: 35, label: 'Cips' },
  { keywords: ['kola', 'cola', 'gazoz'], price: 35, label: 'Icecek' },
  { keywords: ['su'], price: 10, label: 'Su' },
];

function buildDemoMarketPrices(match: CategoryHint): MarketPriceOption[] {
  const basePrice = match.price;

  return [
    {
      id: `${match.label}-demo-a`,
      productName: match.label,
      marketName: 'Demo Market',
      price: basePrice,
      currency: 'TRY',
      updatedAt: new Date().toISOString(),
    },
    {
      id: `${match.label}-demo-b`,
      productName: match.label,
      marketName: 'Demo Uygun Market',
      price: Math.max(1, Math.round(basePrice * 0.92)),
      currency: 'TRY',
      updatedAt: new Date().toISOString(),
    },
    {
      id: `${match.label}-demo-c`,
      productName: match.label,
      marketName: 'Demo Premium Market',
      price: Math.max(1, Math.round(basePrice * 1.12)),
      currency: 'TRY',
      updatedAt: new Date().toISOString(),
    },
  ];
}

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

    const marketPrices = buildDemoMarketPrices(match);
    const bestMarketPrice = marketPrices.reduce((best, current) =>
      current.price < best.price ? current : best,
    );

    return {
      productName: query.productName ?? match.label,
      barcode: query.barcode,
      marketName: bestMarketPrice.marketName,
      price: bestMarketPrice.price,
      currency: 'TRY',
      source: 'beta_reference',
      status: 'beta_reference',
      updatedAt: new Date().toISOString(),
      confidence: 0.2,
      note: 'Demo amacli kategori bazli referans fiyat. Resmi fiyat degildir.',
      marketPrices,
    };
  }
}

function normalizeTurkish(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('i̇', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u');
}