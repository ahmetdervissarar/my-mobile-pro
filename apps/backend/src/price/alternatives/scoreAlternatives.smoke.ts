import assert from 'node:assert/strict';

import { loadSeedAlternativeCandidates } from './candidateSource.js';
import { scoreAlternatives } from './scoreAlternatives.js';

const candidates = loadSeedAlternativeCandidates();

assert.ok(candidates.length >= 9);

const snackAlternatives = scoreAlternatives({
  currentProduct: {
    id: 'seed-snacks-003',
    productName: 'Patates Cipsi 100 g',
    categoryKey: 'snacks',
    price: 32.5,
    rafScore: 43,
    healthScore: 35,
    contentScore: 42,
    sustainabilityScore: 48,
  },
  candidates,
  limit: 2,
});

assert.equal(snackAlternatives.length, 2);
assert.equal(snackAlternatives[0]?.candidate.id, 'seed-snacks-002');
assert.ok((snackAlternatives[0]?.rafScoreDelta ?? 0) > 0);
assert.ok((snackAlternatives[0]?.priceDelta ?? 0) < 0);
assert.equal(snackAlternatives[0]?.priceDeltaText, '17,6 TL daha ucuz');

const beverageAlternatives = scoreAlternatives({
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

assert.equal(beverageAlternatives[0]?.candidate.id, 'seed-beverages-001');
assert.equal(beverageAlternatives[0]?.reasonLabel, 'Daha iyi alternatif bulundu');
assert.ok(beverageAlternatives[0]?.reasons.some((reason) => reason.includes('RafSkoru')));

const emptyAlternatives = scoreAlternatives({
  currentProduct: {
    productName: 'Test Et Ürünü',
    categoryKey: 'meat',
    price: 100,
    rafScore: 50,
  },
  candidates,
});

assert.deepEqual(emptyAlternatives, []);

console.log('ALTERNATIVES_SMOKE_OK');
