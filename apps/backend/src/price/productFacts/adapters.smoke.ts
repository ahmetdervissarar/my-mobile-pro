import assert from 'node:assert/strict';

import {
  productFactsToContentScoreInput,
  productFactsToHealthScoreInput,
  productFactsToSustainabilityInput,
} from './adapters.js';
import { calculateContentScore } from '../contentScore/index.js';
import { calculateHealthScore } from '../healthScore/index.js';
import { calculateRafScore } from '../rafScore/index.js';
import { openFoodFactsInfoToProductFacts } from './openFoodFactsAdapter.js';
import type { ProductFacts } from './types.js';

const facts: ProductFacts = {
  barcode: '1234567890123',
  productName: 'Adapter Smoke Product',
  imageUrl: 'https://example.com/product.jpg',
  nutriScoreGrade: 'B',
  novaGroup: 4,
  trafficLight: {
    sugar: 'low',
    salt: 'medium',
    saturatedFat: 'high',
    fat: 'low',
  },
  ingredientsText: 'Milk, palm oil, E330, E407, E202',
  additives: ['E330', 'E407', 'E202'],
  allergens: ['milk'],
  dataSource: 'off',
  isComplete: true,
};

const healthInput = productFactsToHealthScoreInput(facts);
assert.equal(healthInput.productName, 'Adapter Smoke Product');
assert.equal(healthInput.nutriScoreGrade, 'B');
assert.equal(healthInput.novaGroup, 4);
assert.equal(healthInput.trafficLight?.salt, 'medium');

const contentInput = productFactsToContentScoreInput(facts);
assert.equal(contentInput.productName, 'Adapter Smoke Product');
assert.equal(contentInput.additiveRiskLevel, 'medium');
assert.equal(contentInput.allergenDataStatus, 'contains_allergen');
assert.equal(contentInput.hasPalmOil, true);
assert.equal(contentInput.isUltraProcessedHint, true);

const sustainabilityInput = productFactsToSustainabilityInput(facts);
assert.equal(sustainabilityInput.productName, 'Adapter Smoke Product');
assert.equal(sustainabilityInput.categoryText, 'Adapter Smoke Product');
assert.equal(sustainabilityInput.ingredientsText, facts.ingredientsText);
assert.equal(sustainabilityInput.processing, 'nova_4');

const incompleteFacts = openFoodFactsInfoToProductFacts({
  barcode: '8690000000001',
  productName: 'Eksik Veri Ürünü',
  imageUrl: 'https://example.com/missing.jpg',
  sourceUrl: 'https://world.openfoodfacts.org/product/8690000000001',
});

assert.equal(incompleteFacts.dataSource, 'off');
assert.equal(incompleteFacts.isComplete, false);
assert.equal(incompleteFacts.verificationNeeded, true);
assert.ok(incompleteFacts.missingFields?.includes('ingredientsText'));
assert.ok(incompleteFacts.missingFields?.includes('nutrition'));
assert.ok(incompleteFacts.missingFields?.includes('allergens'));
assert.equal(incompleteFacts.confidence, 'low');

const incompleteContentInput = productFactsToContentScoreInput(incompleteFacts);
assert.equal(incompleteContentInput.allergenDataStatus, null);
assert.equal(incompleteContentInput.additiveRiskLevel, null);

const incompleteContentScore = calculateContentScore(incompleteContentInput);
assert.notEqual(incompleteContentScore.status, 'ready');
assert.notEqual(incompleteContentScore.confidence, 'high');

const incompleteHealthInput = productFactsToHealthScoreInput(incompleteFacts);
const incompleteHealthScore = calculateHealthScore(incompleteHealthInput);
assert.equal(incompleteHealthScore.status, 'unavailable');
assert.equal(incompleteHealthScore.score, null);

const rafScoreWithoutPrice = calculateRafScore({
  priceScore: null,
  healthScore: 91,
  contentScore: 82,
  sustainabilityScore: 61,
});
assert.equal(rafScoreWithoutPrice.status, 'partial');
assert.equal(rafScoreWithoutPrice.score, null);
assert.equal(
  rafScoreWithoutPrice.components.find((component) => component.key === 'price')?.isAvailable,
  false,
);
assert.equal(incompleteFacts.sourceUrl, 'https://world.openfoodfacts.org/product/8690000000001');

console.log('PRODUCT_FACTS_ADAPTERS_SMOKE_OK');







