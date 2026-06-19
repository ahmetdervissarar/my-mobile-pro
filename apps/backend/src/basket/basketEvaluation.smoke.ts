import assert from 'node:assert/strict';

import { evaluateBasket } from './basketEvaluation.js';
import type { BasketEvaluateRequest } from './types.js';

process.env.USE_ONLINE_TEST_PRICE_SEED = '1';

const request: BasketEvaluateRequest = {
  items: [
    {
      type: 'product_group',
      productGroupKey: 'rice',
      label: 'Pirinç',
      quantity: { amount: 1, unit: 'kilogram' },
    },
    {
      type: 'product_group',
      productGroupKey: 'milk',
      label: 'Süt',
      quantity: { amount: 1, unit: 'liter' },
    },
  ],
  location: {
    lat: 36.8121,
    lng: 34.6415,
  },
};

const response = await evaluateBasket(request);

assert.equal(response.ok, true);
assert.equal(response.basketProfile.itemCount, 2);
assert.equal(response.basketProfile.coverage, 'partial');
assert.equal(typeof response.basketProfile.basketRafSkoru, 'number');
assert.equal(response.basketProfile.perItem[0]?.productGroupKey, 'rice');

assert.equal(response.marketEvaluations.status, 'demo');
assert.ok(response.marketEvaluations.markets.length > 0);
assert.ok(response.marketEvaluations.cheapestMarketId);
assert.ok(response.marketEvaluations.bestRafScoreMarketId);

const cheapestMarket = response.marketEvaluations.markets.find(
  (market) => market.marketId === response.marketEvaluations.cheapestMarketId,
);

assert.ok(cheapestMarket);
assert.equal(cheapestMarket.availability.available, request.items.length);
assert.equal(cheapestMarket.availability.missing.length, 0);
assert.ok(cheapestMarket.priceEstimate);
assert.equal(cheapestMarket.priceEstimate?.coversItemCount, request.items.length);

const insufficientRequest: BasketEvaluateRequest = {
  items: [
    request.items[0]!,
    {
      type: 'product_group',
      productGroupKey: 'unknown_seed_group',
      label: 'Bilinmeyen ürün',
      quantity: { amount: 1, unit: 'piece' },
    },
  ],
};

const insufficientResponse = await evaluateBasket(insufficientRequest);

assert.equal(insufficientResponse.marketEvaluations.status, 'insufficient_data');
assert.equal(insufficientResponse.marketEvaluations.cheapestMarketId, null);
assert.equal(insufficientResponse.marketEvaluations.bestRafScoreMarketId, null);
assert.ok(insufficientResponse.marketEvaluations.insufficientDataReason);

for (const market of insufficientResponse.marketEvaluations.markets) {
  assert.equal(market.priceEstimate, undefined);
}

console.log('BASKET_EVALUATION_SMOKE_OK');