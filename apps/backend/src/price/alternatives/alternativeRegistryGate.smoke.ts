import assert from 'node:assert/strict';

import { scoreAlternatives } from './scoreAlternatives.js';
import type { AlternativeCandidate, ScoreAlternativesInput } from './types.js';
import type { ProductPackageSize } from '../productGroups/index.js';

const confidence = { level: 'high' as const, reasons: ['test'] };

const packageSize100g: ProductPackageSize = {
  value: 100,
  unit: 'g',
  normalizedValue: 100,
  normalizedUnit: 'g',
  text: '100 g',
};

const packageSize1l: ProductPackageSize = {
  value: 1,
  unit: 'l',
  normalizedValue: 1000,
  normalizedUnit: 'ml',
  text: '1 l',
};

function candidate(overrides: Partial<AlternativeCandidate>): AlternativeCandidate {
  return {
    id: 'candidate-1',
    barcode: 'candidate-barcode',
    productName: 'Candidate',
    categoryKey: 'dairy',
    productGroupKey: 'milk',
    resolvedProductGroupKey: 'milk',
    packageSize: packageSize1l,
    marketName: 'Test Market',
    chainCode: 'UNKNOWN',
    price: 18,
    currency: 'TRY',
    scores: {
      rafScore: 80,
      priceScore: 90,
      healthScore: 80,
      contentScore: 80,
      sustainabilityScore: 70,
    },
    overallConfidence: confidence,
    ...overrides,
  };
}

function input(overrides: Partial<ScoreAlternativesInput['currentProduct']>): ScoreAlternativesInput {
  return {
    currentProduct: {
      id: 'current-1',
      barcode: 'current-barcode',
      productName: 'Current',
      categoryKey: 'dairy',
      productGroupKey: 'milk',
      resolvedProductGroupKey: 'milk',
      packageSize: packageSize1l,
      alternativesEligible: true,
      price: 20,
      rafScore: 60,
      healthScore: 60,
      contentScore: 60,
      sustainabilityScore: 60,
      ...overrides,
    },
    candidates: [candidate({})],
  };
}

const enabledRecommendations = scoreAlternatives(input({}));

assert.equal(enabledRecommendations.length, 1, 'Expected enabled registry group to return alternatives');
assert.equal(enabledRecommendations[0]?.candidate.resolvedProductGroupKey, 'milk');

const shadowRecommendations = scoreAlternatives({
  currentProduct: {
    ...input({}).currentProduct,
    productGroupKey: 'cheese',
    resolvedProductGroupKey: 'cheese',
    packageSize: packageSize100g,
  },
  candidates: [
    candidate({
      id: 'cheese-candidate',
      productGroupKey: 'cheese',
      resolvedProductGroupKey: 'cheese',
      packageSize: packageSize100g,
    }),
  ],
});

assert.equal(shadowRecommendations.length, 0, 'Expected shadow registry group to fail closed');

const restrictedRecommendations = scoreAlternatives({
  currentProduct: {
    ...input({}).currentProduct,
    productGroupKey: 'baby_formula',
    resolvedProductGroupKey: 'baby_formula',
    packageSize: packageSize100g,
  },
  candidates: [
    candidate({
      id: 'baby-formula-candidate',
      productGroupKey: 'baby_formula',
      resolvedProductGroupKey: 'baby_formula',
      packageSize: packageSize100g,
    }),
  ],
});

assert.equal(restrictedRecommendations.length, 0, 'Expected restricted registry group to fail closed');

const unknownRecommendations = scoreAlternatives({
  currentProduct: {
    ...input({}).currentProduct,
    productGroupKey: 'unknown_beta_group',
    resolvedProductGroupKey: 'unknown_beta_group',
    packageSize: packageSize100g,
  },
  candidates: [
    candidate({
      id: 'unknown-candidate',
      productGroupKey: 'unknown_beta_group',
      resolvedProductGroupKey: 'unknown_beta_group',
      packageSize: packageSize100g,
    }),
  ],
});

assert.equal(unknownRecommendations.length, 0, 'Expected unknown registry group to fail closed');

console.log('ALTERNATIVE_REGISTRY_GATE_SMOKE_OK');
