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

function getIds(currentProduct: AlternativeCurrentProduct): string[] {
  return scoreAlternatives({
    currentProduct,
    candidates,
    limit: 10,
  }).map((recommendation) => recommendation.candidate.id);
}

function buildCanonicalCurrentProduct(
  legacyCurrentProduct: AlternativeCurrentProduct,
): AlternativeCurrentProduct {
  const shape = normalizeAlternativeProductShape(legacyCurrentProduct);

  return {
    ...legacyCurrentProduct,
    resolvedProductGroupKey: shape.canonicalProductGroupKey,
    packageSize: shape.packageSize,
    alternativesEligible: Boolean(shape.canonicalProductGroupKey && shape.packageSize),
  };
}

function compareCase(name: string, legacyCurrentProduct: AlternativeCurrentProduct): void {
  setCanonicalMatching(false);
  const legacyIds = getIds(legacyCurrentProduct);

  setCanonicalMatching(true);
  const canonicalIds = getIds(buildCanonicalCurrentProduct(legacyCurrentProduct));

  const same = JSON.stringify(legacyIds) === JSON.stringify(canonicalIds);

  console.log(
    JSON.stringify({
      case: name,
      productGroupKey: legacyCurrentProduct.productGroupKey ?? null,
      legacyIds,
      canonicalIds,
      same,
    }),
  );

  if (!same) {
    process.exitCode = 1;
  }
}

const candidates = loadSeedAlternativeCandidates();

try {
  process.env.SHADOW_CANONICAL_ALTERNATIVE_MATCHING = '1';

  compareCase('milk_1l realistic', {
    productName: 'Test Süt 1 L',
    categoryKey: 'dairy',
    productGroupKey: 'milk_1l',
    price: 46,
    rafScore: 74,
    healthScore: 70,
    contentScore: 72,
    sustainabilityScore: 65,
  });

  compareCase('chips_100g realistic', {
    productName: 'Cips',
    categoryKey: 'snacks',
    productGroupKey: 'chips_100g',
    price: 32,
    rafScore: 66,
    healthScore: 32,
    contentScore: 68,
    sustainabilityScore: 50,
  });

  for (const candidate of candidates) {
    compareCase(`seed-derived ${candidate.productGroupKey}`, {
      productName: `Current ${candidate.productName}`,
      categoryKey: candidate.categoryKey,
      productGroupKey: candidate.productGroupKey,
      price: candidate.price + 50,
      rafScore: Math.max(0, candidate.scores.rafScore - 20),
      healthScore: Math.max(0, candidate.scores.healthScore - 20),
      contentScore: Math.max(0, candidate.scores.contentScore - 20),
      sustainabilityScore:
        candidate.scores.sustainabilityScore === undefined
          ? undefined
          : Math.max(0, candidate.scores.sustainabilityScore - 20),
    });
  }

  if (process.exitCode === 1) {
    console.error('CANONICAL_MATCHING_MANUAL_CHECK_MISMATCH');
  } else {
    console.log('CANONICAL_MATCHING_MANUAL_CHECK_OK');
  }
} finally {
  restoreFlags();
}
