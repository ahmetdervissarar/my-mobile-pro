import assert from 'node:assert/strict';

import { buildBasketProfile } from './basketScoring.js';
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
};

const profile = buildBasketProfile(request);

assert.equal(profile.itemCount, 1);
assert.equal(profile.coverage, 'insufficient_data');
assert.equal(profile.basketRafSkoru, null);
assert.equal(profile.perItem[0]?.type, 'product_group');
assert.equal(profile.perItem[0]?.productGroupKey, 'rice');
assert.equal(profile.perItem[0]?.label, 'Pirinç');
assert.deepEqual(profile.perItem[0]?.riskFlags, []);

console.log('BASKET_SCORING_SMOKE_OK');
