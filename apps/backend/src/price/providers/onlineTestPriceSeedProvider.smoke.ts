import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

delete process.env.USE_ONLINE_TEST_PRICE_SEED;
delete process.env.NODE_ENV;

const disabledProvider = new OnlineTestPriceSeedProvider();

assert.equal(disabledProvider.isEnabled(), false);
assert.equal(await disabledProvider.fetch({ productName: seededProduct.productName }), null);

process.env.USE_ONLINE_TEST_PRICE_SEED = '1';

const provider = new OnlineTestPriceSeedProvider();

assert.equal(provider.isEnabled(), true);

const byName = await provider.fetch({ productName: seededProduct.productName });

assert.ok(byName);
assert.equal(byName.source, 'online_test_seed');
assert.equal(byName.status, 'internal_test');
assert.equal(byName.currency, 'TRY');
assert.ok(byName.price !== null && byName.price > 0);
assert.ok((byName.marketPrices?.length ?? 0) >= 5);
assert.ok(byName.note?.includes('Gerçek fiyat değildir'));

if (seededProduct.barcode) {
  const byBarcode = await provider.fetch({ barcode: seededProduct.barcode });

  assert.ok(byBarcode);
  assert.equal(byBarcode.barcode, seededProduct.barcode);
}

const byProductGroup = await provider.fetch({
  productGroupKey: seededProduct.productGroupKey,
} as never);

assert.ok(byProductGroup);
assert.equal(byProductGroup.source, 'online_test_seed');

const partialName = seededProduct.productName.slice(0, Math.max(1, seededProduct.productName.length - 1));

if (partialName !== seededProduct.productName) {
  const ambiguousContains = await provider.fetch({ productName: partialName });

  assert.equal(ambiguousContains, null);
}

process.env.NODE_ENV = 'production';

assert.throws(
  () => provider.isEnabled(),
  /USE_ONLINE_TEST_PRICE_SEED cannot be enabled/,
);

delete process.env.USE_ONLINE_TEST_PRICE_SEED;
delete process.env.NODE_ENV;

console.log('ONLINE_TEST_PRICE_SEED_PROVIDER_SMOKE_OK');
