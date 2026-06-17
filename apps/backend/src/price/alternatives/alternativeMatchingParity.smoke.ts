import assert from 'node:assert/strict';

import { loadSeedAlternativeCandidates } from './candidateSource.js';
import { normalizeAlternativeProductShape } from './index.js';
import { scoreAlternatives } from './scoreAlternatives.js';
import type { AlternativeCurrentProduct } from './types.js';

const previousCanonicalFlag = process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
const previousShadowFlag = process.env.SHADOW_CANONICAL_ALTERNATIVE_MATCHING;

function setCanonicalMatching(enabled: boolean): void {
  if (enabled) {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = '1';
    return;
  }

  delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
}

function restoreFlags(): void {
  if (previousCanonicalFlag === undefined) {
    delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
  } else {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = previousCanonicalFlag;
  }

  if (previousShadowFlag === undefined) {
    delete process.env.SHADOW_CANONICAL_ALTERNATIVE_MATCHING;
  } else {
    process.env.SHADOW_CANONICAL_ALTERNATIVE_MATCHING = previousShadowFlag;
  }
}

function recommendationIds(currentProduct: AlternativeCurrentProduct): string[] {
  return scoreAlternatives({
    currentProduct,
    candidates,
    limit: 10,
  }).map((recommendation) => recommendation.candidate.id);
}

function recommendationRankingScores(currentProduct: AlternativeCurrentProduct): number[] {
  return scoreAlternatives({
    currentProduct,
    candidates,
    limit: 10,
  }).map((recommendation) => recommendation.rankingScore);
}

function assertLegacyCanonicalParity(
  name: string,
  legacyCurrentProduct: AlternativeCurrentProduct,
  canonicalCurrentProduct: AlternativeCurrentProduct,
): void {
  setCanonicalMatching(false);
  const legacyIds = recommendationIds(legacyCurrentProduct);
  const legacyScores = recommendationRankingScores(legacyCurrentProduct);

  setCanonicalMatching(true);
  const canonicalIds = recommendationIds(canonicalCurrentProduct);
  const canonicalScores = recommendationRankingScores(canonicalCurrentProduct);

  assert.deepEqual(canonicalIds, legacyIds, `${name}: recommendation ids changed`);
  assert.deepEqual(canonicalScores, legacyScores, `${name}: ranking scores changed`);
}

const candidates = loadSeedAlternativeCandidates();

try {
  const firstCandidateByLegacyKey = new Map(
    candidates.map((candidate) => [candidate.productGroupKey, candidate]),
  );

  for (const [legacyProductGroupKey, candidate] of firstCandidateByLegacyKey.entries()) {
    const shape = normalizeAlternativeProductShape(candidate);

    assert.equal(
      shape.legacyProductGroupKey,
      legacyProductGroupKey,
      `${legacyProductGroupKey}: legacy shape must be mapped explicitly`,
    );
    assert.ok(shape.canonicalProductGroupKey, `${legacyProductGroupKey}: canonical key missing`);
    assert.ok(shape.packageSize, `${legacyProductGroupKey}: package size missing`);

    const sharedCurrentProduct = {
      productName: `Current ${candidate.productName}`,
      categoryKey: candidate.categoryKey,
      price: candidate.price + 50,
      rafScore: Math.max(0, candidate.scores.rafScore - 20),
      healthScore: Math.max(0, candidate.scores.healthScore - 20),
      contentScore: Math.max(0, candidate.scores.contentScore - 20),
      sustainabilityScore:
        candidate.scores.sustainabilityScore === undefined
          ? undefined
          : Math.max(0, candidate.scores.sustainabilityScore - 20),
    };

    assertLegacyCanonicalParity(
      legacyProductGroupKey,
      {
        ...sharedCurrentProduct,
        productGroupKey: legacyProductGroupKey,
      },
      {
        ...sharedCurrentProduct,
        productGroupKey: legacyProductGroupKey,
        resolvedProductGroupKey: shape.canonicalProductGroupKey,
        packageSize: shape.packageSize,
        alternativesEligible: true,
      },
    );
  }

  assertLegacyCanonicalParity(
    'milk_1l realistic current product',
    {
      productName: 'Test Süt 1 L',
      categoryKey: 'dairy',
      productGroupKey: 'milk_1l',
      price: 46,
      rafScore: 74,
      healthScore: 70,
      contentScore: 72,
      sustainabilityScore: 65,
    },
    {
      productName: 'Test Süt 1 L',
      categoryKey: 'dairy',
      productGroupKey: 'milk_1l',
      resolvedProductGroupKey: 'milk',
      packageSize: normalizeAlternativeProductShape({ productGroupKey: 'milk_1l' }).packageSize,
      alternativesEligible: true,
      price: 46,
      rafScore: 74,
      healthScore: 70,
      contentScore: 72,
      sustainabilityScore: 65,
    },
  );

  assertLegacyCanonicalParity(
    'chips_100g realistic current product',
    {
      productName: 'Cips',
      categoryKey: 'snacks',
      productGroupKey: 'chips_100g',
      price: 32,
      rafScore: 66,
      healthScore: 32,
      contentScore: 68,
      sustainabilityScore: 50,
    },
    {
      productName: 'Cips',
      categoryKey: 'snacks',
      productGroupKey: 'chips_100g',
      resolvedProductGroupKey: 'chips',
      packageSize: normalizeAlternativeProductShape({ productGroupKey: 'chips_100g' }).packageSize,
      alternativesEligible: true,
      price: 32,
      rafScore: 66,
      healthScore: 32,
      contentScore: 68,
      sustainabilityScore: 50,
    },
  );

  console.log('ALTERNATIVE_MATCHING_PARITY_SMOKE_OK');
} finally {
  restoreFlags();
}
