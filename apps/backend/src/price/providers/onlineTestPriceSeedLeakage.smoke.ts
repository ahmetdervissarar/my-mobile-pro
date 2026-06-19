import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

import { PriceProviderService } from '../priceProviderService.js';
import { OnlineTestPriceSeedProvider } from './onlineTestPriceSeedProvider.js';

interface SeedProduct {
  productId: string;
  barcode: string;
  productName: string;
  productGroupKey: string;
}

interface SeedPrice {
  productId: string;
}

interface OnlineTestSeedData {
  products: SeedProduct[];
  prices: SeedPrice[];
}

const seed = JSON.parse(
  readFileSync(new URL('./onlineTestPriceSeed.generated.json', import.meta.url), 'utf8'),
) as OnlineTestSeedData;

const pricedProductIds = new Set(seed.prices.map((price) => price.productId));
const seededProduct = seed.products.find(
  (product) => pricedProductIds.has(product.productId) && product.productName,
);

assert.ok(seededProduct, 'Expected at least one priced seed product.');

const originalFetch = globalThis.fetch;
const originalUseSeed = process.env.USE_ONLINE_TEST_PRICE_SEED;
const originalNodeEnv = process.env.NODE_ENV;

globalThis.fetch = (async () =>
  new Response(
    JSON.stringify({
      status: 0,
      status_verbose: 'product not found',
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    },
  )) as typeof fetch;

try {
  delete process.env.USE_ONLINE_TEST_PRICE_SEED;
  delete process.env.NODE_ENV;

  const disabledProvider = new OnlineTestPriceSeedProvider();

  assert.equal(disabledProvider.isEnabled(), false);
  assert.equal(await disabledProvider.fetch({ productName: seededProduct.productName }), null);

  const disabledService = new PriceProviderService();
  const disabledResponse = await disabledService.resolve({
    productName: seededProduct.productName,
  });

  assert.notEqual(disabledResponse.result.source, 'online_test_seed');
  assert.notEqual(disabledResponse.result.status, 'internal_test');
  const leakedSeedMarketPrice =
    disabledResponse.result.marketPrices?.some(
      (marketPrice) =>
        typeof marketPrice.id === 'string' &&
        marketPrice.id.startsWith('online-test-seed:'),
    ) ?? false;

  assert.equal(leakedSeedMarketPrice, false);

  process.env.USE_ONLINE_TEST_PRICE_SEED = '1';
  process.env.NODE_ENV = 'production';

  const productionProvider = new OnlineTestPriceSeedProvider();

  assert.throws(
    () => productionProvider.isEnabled(),
    /USE_ONLINE_TEST_PRICE_SEED cannot be enabled/,
  );

  assert.throws(
    () => new PriceProviderService(),
    /USE_ONLINE_TEST_PRICE_SEED cannot be enabled/,
  );
} finally {
  globalThis.fetch = originalFetch;

  if (originalUseSeed === undefined) {
    delete process.env.USE_ONLINE_TEST_PRICE_SEED;
  } else {
    process.env.USE_ONLINE_TEST_PRICE_SEED = originalUseSeed;
  }

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
}

console.log('ONLINE_TEST_PRICE_SEED_LEAKAGE_SMOKE_OK');