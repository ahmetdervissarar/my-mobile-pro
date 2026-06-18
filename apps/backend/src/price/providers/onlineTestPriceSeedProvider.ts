import { readFileSync } from 'node:fs';

import type {
  IPriceProvider,
  MarketPriceOption,
  PriceQuery,
  PriceResult,
  PriceSource,
} from '../types.js';

interface SeedProduct {
  productId: string;
  barcode: string;
  brand: string;
  productName: string;
  categoryId: string;
  productGroupKey: string;
  productGroupDisplayName: string;
  packageSizeValue: number | null;
  packageSizeUnit: string;
  packageSizeText: string;
  isFood: boolean;
  scorePolicy: string;
  baseScoreSeed: number | null;
}

interface SeedMarketPrice {
  price: number;
  url: string | null;
}

interface SeedPrice {
  productId: string;
  observedAt: string;
  priceSourceType: string;
  currency: string;
  isFakeTestPrice: boolean;
  marketPrices: {
    migros: SeedMarketPrice | null;
    carrefoursa: SeedMarketPrice | null;
    a101: SeedMarketPrice | null;
    sok: SeedMarketPrice | null;
    bim: SeedMarketPrice | null;
  };
}

interface OnlineTestSeedData {
  generatedAt: string;
  sourceFile: string;
  priceScope: 'online_chain_price';
  warning: string;
  products: SeedProduct[];
  prices: SeedPrice[];
}

const SEED_FILE_URL = new URL('./onlineTestPriceSeed.generated.json', import.meta.url);

const MARKET_NAMES: Record<keyof SeedPrice['marketPrices'], string> = {
  migros: 'Migros',
  carrefoursa: 'CarrefourSA',
  a101: 'A101',
  sok: 'ŞOK',
  bim: 'BİM',
};

function normalizeText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR');
}

function assertOnlineTestSeedAllowed(): void {
  if (process.env.USE_ONLINE_TEST_PRICE_SEED !== '1') {
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'USE_ONLINE_TEST_PRICE_SEED cannot be enabled when NODE_ENV=production.',
    );
  }
}

function loadSeed(): OnlineTestSeedData {
  const raw = readFileSync(SEED_FILE_URL, 'utf8');
  const parsed = JSON.parse(raw) as OnlineTestSeedData;

  if (!Array.isArray(parsed.products) || !Array.isArray(parsed.prices)) {
    throw new Error('Invalid online test price seed shape.');
  }

  return parsed;
}

function buildIndexes(seed: OnlineTestSeedData) {
  const productsByBarcode = new Map<string, SeedProduct>();
  const productsByProductId = new Map<string, SeedProduct>();
  const productsByProductGroupKey = new Map<string, SeedProduct[]>();
  const productsByExactName = new Map<string, SeedProduct>();
  const pricesByProductId = new Map<string, SeedPrice>();

  for (const product of seed.products) {
    if (product.barcode) {
      productsByBarcode.set(product.barcode, product);
    }

    productsByProductId.set(product.productId, product);

    const existingGroupProducts =
      productsByProductGroupKey.get(product.productGroupKey) ?? [];

    existingGroupProducts.push(product);
    productsByProductGroupKey.set(product.productGroupKey, existingGroupProducts);

    const normalizedName = normalizeText(product.productName);

    if (!productsByExactName.has(normalizedName)) {
      productsByExactName.set(normalizedName, product);
    }
  }

  for (const price of seed.prices) {
    pricesByProductId.set(price.productId, price);
  }

  return {
    productsByBarcode,
    productsByProductId,
    productsByProductGroupKey,
    productsByExactName,
    pricesByProductId,
  };
}

function findProduct(
  query: PriceQuery,
  indexes: ReturnType<typeof buildIndexes>,
): SeedProduct | null {
  const rawQuery = query as PriceQuery & {
    productId?: string;
    productGroupKey?: string;
  };

  const barcode = query.barcode?.trim();

  if (barcode) {
    return indexes.productsByBarcode.get(barcode) ?? null;
  }

  const productId = rawQuery.productId?.trim();

  if (productId) {
    return indexes.productsByProductId.get(productId) ?? null;
  }

  const productGroupKey = rawQuery.productGroupKey?.trim();

  if (productGroupKey) {
    const groupProducts = indexes.productsByProductGroupKey.get(productGroupKey);

    return groupProducts?.[0] ?? null;
  }

  const productName = query.productName?.trim();

  if (!productName) {
    return null;
  }

  return indexes.productsByExactName.get(normalizeText(productName)) ?? null;
}

function buildMarketPrices(product: SeedProduct, price: SeedPrice): MarketPriceOption[] {
  return (Object.entries(price.marketPrices) as Array<
    [keyof SeedPrice['marketPrices'], SeedMarketPrice | null]
  >)
    .filter((entry): entry is [keyof SeedPrice['marketPrices'], SeedMarketPrice] =>
      Boolean(entry[1] && Number.isFinite(entry[1].price) && entry[1].price > 0),
    )
    .map(([marketId, marketPrice]) => ({
      id: `online-test-seed:${marketId}:${product.productId}`,
      productName: product.productName,
      marketName: MARKET_NAMES[marketId],
      price: marketPrice.price,
      currency: price.currency || 'TRY',
      sourceUrl: marketPrice.url ?? undefined,
      updatedAt: price.observedAt,
      location: 'Online zincir fiyatı',
    }));
}

function pickBestMarketPrice(marketPrices: MarketPriceOption[]): MarketPriceOption | null {
  if (marketPrices.length === 0) {
    return null;
  }

  return [...marketPrices].sort((a, b) => a.price - b.price)[0] ?? null;
}

export class OnlineTestPriceSeedProvider implements IPriceProvider {
  public readonly name: PriceSource = 'online_test_seed';

  private seed: OnlineTestSeedData | null = null;
  private indexes: ReturnType<typeof buildIndexes> | null = null;

  isEnabled(): boolean {
    assertOnlineTestSeedAllowed();

    return process.env.USE_ONLINE_TEST_PRICE_SEED === '1';
  }

  async fetch(query: PriceQuery): Promise<PriceResult | null> {
    if (!this.isEnabled()) {
      return null;
    }

    if (!this.seed || !this.indexes) {
      this.seed = loadSeed();
      this.indexes = buildIndexes(this.seed);
    }

    const product = findProduct(query, this.indexes);

    if (!product) {
      return null;
    }

    const price = this.indexes.pricesByProductId.get(product.productId);

    if (!price) {
      return null;
    }

    const marketPrices = buildMarketPrices(product, price);
    const bestMarketPrice = pickBestMarketPrice(marketPrices);

    if (!bestMarketPrice) {
      return null;
    }

    return {
      productName: product.productName,
      barcode: product.barcode || query.barcode,
      productGroupKey: product.productGroupKey,
      marketName: bestMarketPrice.marketName,
      price: bestMarketPrice.price,
      currency: bestMarketPrice.currency,
      imageUrl: null,
      source: 'online_test_seed',
      status: 'internal_test',
      updatedAt: price.observedAt,
      confidence: 0.72,
      note:
        'İç geliştirme testi için sahte online zincir market fiyatı. Gerçek fiyat değildir.',
      marketPrices,
      raw: {
        productId: product.productId,
        brand: product.brand,
        productGroupKey: product.productGroupKey,
        productGroupDisplayName: product.productGroupDisplayName,
        packageSizeText: product.packageSizeText,
        priceSourceType: price.priceSourceType,
        isFakeTestPrice: price.isFakeTestPrice,
        priceScope: 'online_chain_price',
      },
    };
  }
}
