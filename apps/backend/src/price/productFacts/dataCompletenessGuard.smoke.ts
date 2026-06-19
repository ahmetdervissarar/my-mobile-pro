import assert from 'node:assert/strict';

import type { PriceResult } from '../types.js';
import { calculateContentScore } from '../contentScore/index.js';
import { calculateHealthScore } from '../healthScore/index.js';
import { calculateRafScore } from '../rafScore/index.js';
import { resolveDataConfidence } from '../confidence/resolveConfidence.js';
import {
  productFactsToContentScoreInput,
  productFactsToHealthScoreInput,
} from './adapters.js';
import { openFoodFactsInfoToProductFacts } from './openFoodFactsAdapter.js';

const incompleteFacts = openFoodFactsInfoToProductFacts({
  barcode: '8690000000099',
  productName: 'Closed Beta Missing Facts Product',
  imageUrl: 'https://example.com/missing-facts.jpg',
  sourceUrl: 'https://world.openfoodfacts.org/product/8690000000099',
});

assert.equal(incompleteFacts.dataSource, 'off');
assert.equal(incompleteFacts.isComplete, false);
assert.equal(incompleteFacts.verificationNeeded, true);
assert.equal(incompleteFacts.confidence, 'low');
assert.ok(incompleteFacts.missingFields?.includes('ingredientsText'));
assert.ok(incompleteFacts.missingFields?.includes('nutrition'));
assert.ok(incompleteFacts.missingFields?.includes('allergens'));

const healthInput = productFactsToHealthScoreInput(incompleteFacts);
const healthScore = calculateHealthScore(healthInput);

assert.equal(healthScore.status, 'unavailable');
assert.equal(healthScore.score, null);

const contentInput = productFactsToContentScoreInput(incompleteFacts);
const contentScore = calculateContentScore(contentInput);

assert.notEqual(contentScore.status, 'ready');
assert.notEqual(contentScore.confidence, 'high');

const rafScore = calculateRafScore({
  priceScore: 90,
  healthScore: healthScore.score,
  contentScore: contentScore.score,
  sustainabilityScore: null,
});

assert.notEqual(rafScore.status, 'ready');
assert.equal(rafScore.score, null);

const resultWithIncompleteFacts: PriceResult = {
  productName: 'Closed Beta Missing Facts Product',
  barcode: '8690000000099',
  marketName: 'Beta Market',
  price: 50,
  currency: 'TRY',
  source: 'beta_reference',
  status: 'beta_reference',
  updatedAt: '2026-01-01T00:00:00.000Z',
  confidence: 0.4,
  marketPrices: [
    {
      marketName: 'Beta Market',
      price: 50,
      currency: 'TRY',
    },
  ],
  productFacts: incompleteFacts,
  healthScore,
  contentScore,
  rafScore,
};

const confidence = resolveDataConfidence(resultWithIncompleteFacts);

assert.equal(confidence.level, 'low');

console.log('PRODUCT_FACTS_DATA_COMPLETENESS_GUARD_SMOKE_OK');