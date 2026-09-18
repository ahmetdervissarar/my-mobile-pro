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
import { selectUsableProductFacts } from './usability.js';

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

// --- A1B: katmanlı tamlık ve kısmi OFF kaydının korunması ---

// Ad+görsel dışında anlamlı gıda verisi yok → insufficient → kullanılamaz (eski davranışla aynı sonuç).
assert.equal(incompleteFacts.completeness, 'insufficient');
assert.deepEqual(incompleteFacts.capabilities, { risk: false, health: false, content: false });
assert.equal(selectUsableProductFacts(incompleteFacts), null);

// Görsel, Nutri-Score ve NOVA eksik; alerjen tag'i ve içerik listesi var → partial → KORUNUR.
const partialFacts = openFoodFactsInfoToProductFacts({
  barcode: '8690000000100',
  productName: 'Partial OFF Product',
  ingredientsText: 'bugday unu, sut tozu, tuz',
  allergens: ['en:gluten', 'en:milk'],
  traceAllergens: ['en:nuts'],
  sourceUrl: 'https://world.openfoodfacts.org/product/8690000000100',
});

assert.equal(partialFacts.dataSource, 'off');
assert.equal(partialFacts.completeness, 'partial');
assert.equal(partialFacts.isComplete, false);
assert.ok(partialFacts.missingFields?.includes('imageUrl'));
assert.ok(partialFacts.missingFields?.includes('nutriScoreGrade'));
assert.ok(partialFacts.missingFields?.includes('novaGroup'));
assert.equal(selectUsableProductFacts(partialFacts), partialFacts, 'partial OFF record must be retained');
assert.equal(partialFacts.capabilities?.risk, true, 'structured allergen/trace tags enable risk');
assert.equal(partialFacts.capabilities?.health, false);
assert.equal(partialFacts.capabilities?.content, true);
assert.notEqual(partialFacts.confidence, 'high', 'partial data must not be high confidence');

// Sağlık verisi yok → sağlık sonucu unavailable; alerjen bileşeni anlamı değişmedi.
const partialHealth = calculateHealthScore(productFactsToHealthScoreInput(partialFacts));
assert.equal(partialHealth.status, 'unavailable');
assert.equal(partialHealth.score, null);
assert.equal(productFactsToContentScoreInput(partialFacts).allergenDataStatus, 'contains_allergen');

// Kısmi kayıt PriceResult içinde de yüksek güven alamaz.
const partialConfidence = resolveDataConfidence({
  ...resultWithIncompleteFacts,
  barcode: '8690000000100',
  productFacts: partialFacts,
  healthScore: partialHealth,
});
assert.notEqual(partialConfidence.level, 'high');

// Yalnız içerik metni var, alerjen tag'i yok → partial ama risk=false; içerik metni riski açmaz.
const ingredientsOnlyFacts = openFoodFactsInfoToProductFacts({
  barcode: '8690000000101',
  productName: 'Ingredients Only Product',
  ingredientsText: 'seker, kakao yagi, findik ezmesi',
  allergens: [],
  traceAllergens: [],
});

assert.equal(ingredientsOnlyFacts.completeness, 'partial');
assert.equal(ingredientsOnlyFacts.capabilities?.risk, false, 'ingredientsText alone must not enable risk');
assert.equal(ingredientsOnlyFacts.allergenInfo?.dataStatus, 'unknown');
assert.equal(selectUsableProductFacts(ingredientsOnlyFacts), ingredientsOnlyFacts);

// Yalnız iz tag'i var (beyan boş, içerik/besin yok) → partial, "içerebilir" uyarısı KORUNUR.
const tracesOnlyFacts = openFoodFactsInfoToProductFacts({
  barcode: '8690000000103',
  productName: 'Traces Only Product',
  allergens: [],
  traceAllergens: ['en:nuts'],
});

assert.equal(tracesOnlyFacts.completeness, 'partial');
assert.equal(tracesOnlyFacts.isComplete, false);
assert.equal(tracesOnlyFacts.capabilities?.risk, true, 'trace tags alone enable risk evaluation');
assert.equal(selectUsableProductFacts(tracesOnlyFacts), tracesOnlyFacts, 'traces-only OFF record must be retained');
assert.equal(tracesOnlyFacts.allergenInfo?.dataStatus, 'present');
assert.deepEqual(tracesOnlyFacts.allergenInfo?.traceAllergens, ['en:nuts']);
assert.deepEqual(tracesOnlyFacts.traceAllergens, ['en:nuts']);

// Tam OFF ürünü: mevcut davranış korunur.
const completeFacts = openFoodFactsInfoToProductFacts({
  barcode: '8690000000102',
  productName: 'Complete OFF Product',
  imageUrl: 'https://example.com/complete.jpg',
  ingredientsText: 'bugday unu, sut',
  allergens: ['en:gluten', 'en:milk'],
  traceAllergens: [],
  additives: [],
  nutriScore: 'b',
  novaGroup: 3,
  nutritionValues: { fat: 3, saturatedFat: 1, sugars: 4, salt: 0.3 },
});

assert.equal(completeFacts.completeness, 'complete');
assert.equal(completeFacts.isComplete, true);
assert.equal(completeFacts.confidence, 'high');
assert.deepEqual(completeFacts.capabilities, { risk: true, health: true, content: true });
assert.equal(selectUsableProductFacts(completeFacts), completeFacts);

// `completeness` alanı olmayan eski kayıt: eski `isComplete` davranışı korunur.
assert.equal(selectUsableProductFacts({ dataSource: 'off', isComplete: false }), null);

console.log('PRODUCT_FACTS_DATA_COMPLETENESS_GUARD_SMOKE_OK');