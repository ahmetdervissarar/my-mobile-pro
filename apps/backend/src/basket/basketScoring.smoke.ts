import assert from 'node:assert/strict';

import { buildBasketProfile } from './basketScoring.js';
import type { BasketEvaluateRequest } from './types.js';

const knownRequest: BasketEvaluateRequest = {
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
};

const knownProfile = buildBasketProfile(knownRequest);

assert.equal(knownProfile.itemCount, 2);
assert.equal(knownProfile.coverage, 'partial');
assert.equal(typeof knownProfile.basketRafSkoru, 'number');
assert.equal(typeof knownProfile.subScores.health, 'number');
assert.equal(knownProfile.perItem[0]?.type, 'product_group');
assert.equal(knownProfile.perItem[0]?.productGroupKey, 'rice');
assert.equal(typeof knownProfile.perItem[0]?.score, 'number');
assert.deepEqual(knownProfile.perItem[0]?.riskFlags, []);

const unknownRequest: BasketEvaluateRequest = {
  items: [
    {
      type: 'product_group',
      productGroupKey: 'unknown_group',
      label: 'Bilinmeyen ürün grubu',
      quantity: { amount: 1, unit: 'piece' },
    },
  ],
};

const unknownProfile = buildBasketProfile(unknownRequest);

assert.equal(unknownProfile.itemCount, 1);
assert.equal(unknownProfile.coverage, 'insufficient_data');
assert.equal(unknownProfile.basketRafSkoru, null);
assert.equal(unknownProfile.perItem[0]?.score, null);

console.log('BASKET_SCORING_SMOKE_OK');
