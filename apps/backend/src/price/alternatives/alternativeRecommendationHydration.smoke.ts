import assert from 'node:assert/strict';

import { loadSeedAlternativeCandidates } from './candidateSource.js';
import { normalizeAlternativeProductShape } from './index.js';
import { scoreAlternatives } from './scoreAlternatives.js';
import type { AlternativeCurrentProduct } from './types.js';

const previousCanonicalFlag = process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;

const candidates = loadSeedAlternativeCandidates();
const rawCandidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

function assertHydratedRecommendations(
  name: string,
  currentProduct: AlternativeCurrentProduct,
): void {
  const recommendations = scoreAlternatives({
    currentProduct,
    candidates,
    limit: 10,
  });

  assert.ok(recommendations.length > 0, `${name}: expected recommendations`);

  for (const recommendation of recommendations) {
    const hydratedCandidate = recommendation.candidate;
    const rawCandidate = rawCandidateById.get(hydratedCandidate.id);

    assert.ok(rawCandidate, `${name}: raw candidate not found`);

    const expectedShape = normalizeAlternativeProductShape(rawCandidate);

    assert.equal(
      hydratedCandidate.productGroupKey,
      rawCandidate.productGroupKey,
      `${name}: legacy productGroupKey must stay unchanged`,
    );

    assert.equal(
      hydratedCandidate.resolvedProductGroupKey,
      expectedShape.canonicalProductGroupKey,
      `${name}: resolvedProductGroupKey must be hydrated`,
    );

    assert.deepEqual(
      hydratedCandidate.packageSize,
      expectedShape.packageSize,
      `${name}: packageSize must be hydrated`,
    );

    assert.deepEqual(
      hydratedCandidate.signals ?? null,
      rawCandidate.signals ?? null,
      `${name}: allergen/signals payload must stay unchanged`,
    );
  }
}

try {
  assertHydratedRecommendations('milk legacy recommendations', {
    productName: 'Test Süt 1 L',
    categoryKey: 'dairy',
    productGroupKey: 'milk_1l',
    price: 46,
    rafScore: 74,
    healthScore: 70,
    contentScore: 72,
    sustainabilityScore: 65,
  });

  assertHydratedRecommendations('chips legacy recommendations', {
    productName: 'Cips',
    categoryKey: 'snacks',
    productGroupKey: 'chips_100g',
    price: 32,
    rafScore: 66,
    healthScore: 32,
    contentScore: 68,
    sustainabilityScore: 50,
  });

  console.log('ALTERNATIVE_RECOMMENDATION_HYDRATION_SMOKE_OK');
} finally {
  if (previousCanonicalFlag === undefined) {
    delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
  } else {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = previousCanonicalFlag;
  }
}
