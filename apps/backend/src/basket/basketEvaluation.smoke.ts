import assert from 'node:assert/strict';

import { evaluateBasket } from './basketEvaluation.js';
import type { BasketEvaluateRequest } from './types.js';

const request: BasketEvaluateRequest = {
  items: [
    {
      type: 'product_group',
      productGroupKey: 'rice',
      label: 'Pirinç',
      quantity: { amount: 1, unit: 'kilogram' },
    },
  ],
  location: {
    lat: 36.8121,
    lng: 34.6415,
  },
};

const response = evaluateBasket(request);

assert.equal(response.ok, true);
assert.equal(response.basketProfile.itemCount, 1);
assert.equal(response.basketProfile.coverage, 'partial');
assert.equal(typeof response.basketProfile.basketRafSkoru, 'number');
assert.equal(response.basketProfile.perItem[0]?.productGroupKey, 'rice');
assert.equal(response.marketEvaluations.status, 'insufficient_data');
assert.deepEqual(response.marketEvaluations.markets, []);

console.log('BASKET_EVALUATION_SMOKE_OK');
