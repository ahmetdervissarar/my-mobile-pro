import assert from 'node:assert/strict';

import { loadSeedAlternativeCandidates } from './candidateSource.js';
import { scoreAlternatives } from './scoreAlternatives.js';

const candidates = loadSeedAlternativeCandidates();

assert.ok(candidates.length >= 9);

const milkAlternatives = scoreAlternatives({
  currentProduct: {
    productName: 'Test Süt 1 L',
    categoryKey: 'dairy',
    productGroupKey: 'milk_1l',
    price: 46,
    rafScore: 74,
    healthScore: 70,
    contentScore: 72,
    sustainabilityScore: 65,
  },
  candidates,
  limit: 3,
});

assert.equal(milkAlternatives.length, 2);
assert.ok(milkAlternatives.every((recommendation) => recommendation.candidate.productGroupKey === 'milk_1l'));
assert.ok(milkAlternatives.every((recommendation) => recommendation.candidate.id !== 'seed-dairy-003'));
assert.ok(milkAlternatives.every((recommendation) => (recommendation.rafScoreDelta ?? 0) > 0));
assert.ok(milkAlternatives.every((recommendation) => (recommendation.priceDelta ?? 0) <= 0));

const snackAlternatives = scoreAlternatives({
  currentProduct: {
    productName: 'Patates Cipsi 100 g',
    categoryKey: 'snacks',
    productGroupKey: 'chips_100g',
    price: 32.5,
    rafScore: 43,
    healthScore: 35,
    contentScore: 42,
    sustainabilityScore: 48,
  },
  candidates,
  limit: 2,
});

assert.deepEqual(snackAlternatives, []);

const missingProductGroupAlternatives = scoreAlternatives({
  currentProduct: {
    productName: 'Meyve Suyu 1 L',
    categoryKey: 'beverages',
    price: 42.9,
    rafScore: 55,
    healthScore: 52,
    contentScore: 58,
    sustainabilityScore: 57,
  },
  candidates,
  limit: 2,
});

assert.deepEqual(missingProductGroupAlternatives, []);

const emptyAlternatives = scoreAlternatives({
  currentProduct: {
    productName: 'Test Et Ürünü',
    categoryKey: 'meat',
    productGroupKey: 'meat_product',
    price: 100,
    rafScore: 50,
  },
  candidates,
});

assert.deepEqual(emptyAlternatives, []);

console.log('ALTERNATIVES_SMOKE_OK');
