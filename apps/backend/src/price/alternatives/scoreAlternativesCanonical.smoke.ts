import assert from 'node:assert/strict';

import { parsePackageSizeFromText } from '../productGroups/index.js';
import { loadSeedAlternativeCandidates } from './candidateSource.js';
import { scoreAlternatives } from './scoreAlternatives.js';
import type { AlternativeCandidate } from './types.js';

const previousFlag = process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;

function setCanonicalMatching(enabled: boolean): void {
  if (enabled) {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = '1';
    return;
  }

  delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
}

function candidate(overrides: Partial<AlternativeCandidate>): AlternativeCandidate {
  return {
    id: 'candidate',
    productName: 'Candidate',
    categoryKey: 'dairy',
    productGroupKey: 'milk',
    resolvedProductGroupKey: 'milk',
    packageSize: parsePackageSizeFromText('1 L'),
    marketName: 'Test Market',
    chainCode: 'manual_beta',
    price: 38,
    currency: 'TRY',
    scores: {
      rafScore: 80,
      priceScore: 80,
      healthScore: 80,
      contentScore: 80,
      sustainabilityScore: 80,
    },
    overallConfidence: {
      level: 'high',
      score: 90,
      reasons: [],
    },
    ...overrides,
  } as AlternativeCandidate;
}

try {
  const candidates = loadSeedAlternativeCandidates();

  setCanonicalMatching(false);

  const legacyMilk = scoreAlternatives({
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

  setCanonicalMatching(true);

  const canonicalMilkFromLegacySeed = scoreAlternatives({
    currentProduct: {
      productName: 'Test Süt 1 L',
      categoryKey: 'dairy',
      productGroupKey: 'milk_1l',
      resolvedProductGroupKey: 'milk',
      packageSize: parsePackageSizeFromText('1 L'),
      alternativesEligible: true,
      price: 46,
      rafScore: 74,
      healthScore: 70,
      contentScore: 72,
      sustainabilityScore: 65,
    },
    candidates,
    limit: 3,
  });

  assert.deepEqual(
    canonicalMilkFromLegacySeed.map((recommendation) => recommendation.candidate.id),
    legacyMilk.map((recommendation) => recommendation.candidate.id),
  );

  const currentMilk1l = {
    productName: 'Test Milk 1 L',
    categoryKey: 'dairy' as const,
    productGroupKey: 'milk',
    resolvedProductGroupKey: 'milk',
    packageSize: parsePackageSizeFromText('1 L'),
    alternativesEligible: true,
    price: 42,
    rafScore: 70,
    healthScore: 70,
    contentScore: 70,
    sustainabilityScore: 70,
  };

  const matrixCandidates = [
    candidate({
      id: 'milk-1000ml',
      productName: 'Milk 1000 ml',
      productGroupKey: 'milk',
      resolvedProductGroupKey: 'milk',
      packageSize: parsePackageSizeFromText('1000 ml'),
      price: 38,
      scores: {
        rafScore: 80,
        priceScore: 80,
        healthScore: 80,
        contentScore: 80,
        sustainabilityScore: 80,
      },
    }),
    candidate({
      id: 'milk-200ml',
      productName: 'Milk 200 ml',
      productGroupKey: 'milk',
      resolvedProductGroupKey: 'milk',
      packageSize: parsePackageSizeFromText('200 ml'),
      price: 20,
      scores: {
        rafScore: 82,
        priceScore: 80,
        healthScore: 80,
        contentScore: 80,
        sustainabilityScore: 80,
      },
    }),
    candidate({
      id: 'kefir-1l',
      productName: 'Kefir 1 L',
      productGroupKey: 'kefir',
      resolvedProductGroupKey: 'kefir',
      packageSize: parsePackageSizeFromText('1 L'),
      price: 36,
      scores: {
        rafScore: 84,
        priceScore: 80,
        healthScore: 80,
        contentScore: 80,
        sustainabilityScore: 80,
      },
    }),
    candidate({
      id: 'milk-wrong-category',
      productName: 'Milk 1 L Wrong Category',
      categoryKey: 'beverages',
      productGroupKey: 'milk',
      resolvedProductGroupKey: 'milk',
      packageSize: parsePackageSizeFromText('1 L'),
      price: 36,
      scores: {
        rafScore: 86,
        priceScore: 80,
        healthScore: 80,
        contentScore: 80,
        sustainabilityScore: 80,
      },
    }),
  ];

  const canonicalMatrix = scoreAlternatives({
    currentProduct: currentMilk1l,
    candidates: matrixCandidates,
    limit: 10,
  });

  assert.deepEqual(
    canonicalMatrix.map((recommendation) => recommendation.candidate.id),
    ['milk-1000ml'],
  );

  const ineligibleCurrent = scoreAlternatives({
    currentProduct: {
      ...currentMilk1l,
      alternativesEligible: false,
    },
    candidates: matrixCandidates,
    limit: 10,
  });

  assert.deepEqual(ineligibleCurrent, []);

  console.log('ALTERNATIVES_CANONICAL_MATCHING_SMOKE_OK');
} finally {
  if (previousFlag === undefined) {
    delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
  } else {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = previousFlag;
  }
}
