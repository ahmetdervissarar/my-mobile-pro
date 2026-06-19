import assert from 'node:assert/strict';

import { evaluateBasket } from './basketEvaluation.js';
import type { BasketEvaluateRequest } from './types.js';

const originalUseSeed = process.env.USE_ONLINE_TEST_PRICE_SEED;
const originalNodeEnv = process.env.NODE_ENV;

try {
  process.env.USE_ONLINE_TEST_PRICE_SEED = '1';
  delete process.env.NODE_ENV;

  const fullCoverageRequest: BasketEvaluateRequest = {
    items: [
      {
        type: 'product_group',
        productGroupKey: 'rice',
        label: 'Pirinc',
        quantity: { amount: 1, unit: 'kilogram' },
      },
      {
        type: 'product_group',
        productGroupKey: 'milk',
        label: 'Sut',
        quantity: { amount: 1, unit: 'liter' },
      },
    ],
  };

  const fullCoverageResponse = await evaluateBasket(fullCoverageRequest);

  assert.equal(fullCoverageResponse.ok, true);
  assert.equal(fullCoverageResponse.marketEvaluations.status, 'demo');
  assert.ok(fullCoverageResponse.marketEvaluations.cheapestMarketId);
  assert.ok(fullCoverageResponse.marketEvaluations.bestRafScoreMarketId);

  const cheapestFullCoverageMarket = fullCoverageResponse.marketEvaluations.markets.find(
    (market) => market.marketId === fullCoverageResponse.marketEvaluations.cheapestMarketId,
  );

  assert.ok(cheapestFullCoverageMarket);
  assert.equal(
    cheapestFullCoverageMarket.availability.available,
    fullCoverageRequest.items.length,
  );
  assert.equal(cheapestFullCoverageMarket.availability.missing.length, 0);
  assert.equal(
    cheapestFullCoverageMarket.priceEstimate?.coversItemCount,
    fullCoverageRequest.items.length,
  );

  const partialCoverageRequest: BasketEvaluateRequest = {
    items: [
      fullCoverageRequest.items[0]!,
      {
        type: 'product_group',
        productGroupKey: 'unknown_seed_group',
        label: 'Bilinmeyen urun',
        quantity: { amount: 1, unit: 'piece' },
      },
    ],
  };

  const partialCoverageResponse = await evaluateBasket(partialCoverageRequest);

  assert.equal(partialCoverageResponse.ok, true);
  assert.equal(partialCoverageResponse.marketEvaluations.status, 'insufficient_data');
  assert.equal(partialCoverageResponse.marketEvaluations.cheapestMarketId, null);
  assert.equal(partialCoverageResponse.marketEvaluations.bestRafScoreMarketId, null);
  assert.ok(partialCoverageResponse.marketEvaluations.insufficientDataReason);

  assert.ok(
    partialCoverageResponse.marketEvaluations.markets.some(
      (market) =>
        market.availability.available > 0 &&
        market.availability.available < market.availability.total,
    ),
    'Expected at least one partial-coverage market.',
  );

  for (const market of partialCoverageResponse.marketEvaluations.markets) {
    assert.notEqual(
      market.availability.available,
      market.availability.total,
      'Partial coverage scenario should not have a full-coverage market.',
    );
    assert.equal(
      market.priceEstimate,
      undefined,
      'Partial-coverage markets must not expose a basket price estimate.',
    );
    assert.equal(
      market.marketBasketRafSkoru,
      undefined,
      'Partial-coverage markets must not expose a market basket RafSkoru.',
    );
  }
} finally {
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

console.log('BASKET_COVERAGE_GUARD_SMOKE_OK');