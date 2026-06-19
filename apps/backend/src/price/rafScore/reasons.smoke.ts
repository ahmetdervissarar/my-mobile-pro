import assert from 'node:assert/strict';

import { calculateRafScore } from './rafScoreCalculator.js';
import { buildRafScoreReasons } from './reasons.js';

const unavailableReasons = buildRafScoreReasons({
  rafScore: null,
});

assert.deepEqual(unavailableReasons, [
  {
    code: 'raf_score_unavailable',
    category: 'data_quality',
    severity: 'warning',
  },
]);

const partialScore = calculateRafScore({
  priceScore: null,
  healthScore: 82,
  contentScore: 42,
  sustainabilityScore: null,
});

const lowConfidenceInput = {
  rafScore: partialScore,
  priceConfidence: {
    status: 'not_found' as const,
    source: null,
    observedAt: null,
    isSynthetic: false,
  },
  allergenInfo: {
    dataStatus: 'unknown' as const,
    declaredAllergens: [],
    traceAllergens: [],
    source: 'none' as const,
  },
  overallConfidence: {
    level: 'low' as const,
    reasons: ['missing_price'],
  },
};

const reasons = buildRafScoreReasons(lowConfidenceInput);
const repeatedReasons = buildRafScoreReasons(lowConfidenceInput);

assert.deepEqual(reasons, repeatedReasons);
assert.ok(reasons.length <= 5);

const codes = reasons.map((reason) => reason.code);
assert.deepEqual(codes, [
  'content_low_score',
  'data_low_confidence',
  'allergen_data_unknown',
  'price_missing',
  'sustainability_component_missing',
]);

assert.equal(
  reasons.find((reason) => reason.code === 'price_missing')?.severity,
  'warning',
);

assert.equal(
  reasons.find((reason) => reason.code === 'allergen_data_unknown')?.severity,
  'warning',
);

assert.equal(
  reasons.find((reason) => reason.code === 'data_low_confidence')?.severity,
  'warning',
);

assert.ok(
  reasons
    .filter((reason) => reason.code.includes('missing') || reason.code.includes('unknown'))
    .every((reason) => reason.severity !== 'negative'),
);

const categories = new Set(reasons.map((reason) => reason.category));
assert.equal(categories.size, reasons.length);

const completeScore = calculateRafScore({
  priceScore: 90,
  healthScore: 82,
  contentScore: 74,
  sustainabilityScore: 81,
});

const liveReasons = buildRafScoreReasons({
  rafScore: completeScore,
  priceConfidence: {
    status: 'live',
    source: 'live_api',
    observedAt: new Date('2026-06-19T09:00:00.000Z').toISOString(),
    isSynthetic: false,
  },
  allergenInfo: {
    dataStatus: 'present',
    declaredAllergens: ['en:milk'],
    traceAllergens: [],
    source: 'off_structured',
  },
  overallConfidence: {
    level: 'high',
    reasons: [],
  },
});

assert.ok(liveReasons.some((reason) => reason.code === 'price_live_available'));
assert.ok(
  liveReasons.every(
    (reason) => reason.severity !== 'warning' || reason.category !== 'data_quality',
  ),
);

const betaReferenceReasons = buildRafScoreReasons({
  rafScore: completeScore,
  priceConfidence: {
    status: 'beta_reference',
    source: 'manual_beta',
    observedAt: null,
    isSynthetic: true,
  },
  allergenInfo: {
    dataStatus: 'present',
    declaredAllergens: [],
    traceAllergens: [],
    source: 'off_structured',
  },
  overallConfidence: {
    level: 'high',
    reasons: [],
  },
});

const betaReferenceCodes = betaReferenceReasons.map((reason) => reason.code);
assert.ok(betaReferenceCodes.includes('price_beta_reference'));
assert.ok(!betaReferenceCodes.includes('price_live_available'));

const lowPriceScore = calculateRafScore({
  priceScore: 35,
  healthScore: 82,
  contentScore: 74,
  sustainabilityScore: 81,
});

const lowPriceReasons = buildRafScoreReasons({
  rafScore: lowPriceScore,
  priceConfidence: {
    status: 'beta_reference',
    source: 'manual_beta',
    observedAt: null,
    isSynthetic: true,
  },
  allergenInfo: {
    dataStatus: 'present',
    declaredAllergens: [],
    traceAllergens: [],
    source: 'off_structured',
  },
  overallConfidence: {
    level: 'high',
    reasons: [],
  },
});

const lowPriceCodes = lowPriceReasons.map((reason) => reason.code);
assert.ok(lowPriceCodes.includes('price_low_score'));
assert.ok(!lowPriceCodes.includes('price_beta_reference'));

console.log('RAF_SCORE_REASONS_SMOKE_OK');
