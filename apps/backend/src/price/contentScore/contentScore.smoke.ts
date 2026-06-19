import { strict as assert } from 'node:assert';

import { calculateContentScore } from './contentScoreCalculator.js';

const completeClearScore = calculateContentScore({
  productName: 'Clear Allergen Smoke Product',
  ingredientsText: 'Tam içerik listesi, anlaşılır bileşenler ve üretim bilgisi.',
  additives: [],
  additiveRiskLevel: 'none',
  allergenDataStatus: 'clear',
  hasPalmOil: false,
  isUltraProcessedHint: false,
});

assert.equal(completeClearScore.status, 'ready');
assert.equal(completeClearScore.confidence, 'high');
assert.equal(completeClearScore.factors.allergenTransparency, 100);

const unknownAllergenScore = calculateContentScore({
  productName: 'Unknown Allergen Smoke Product',
  ingredientsText: 'Tam içerik listesi, anlaşılır bileşenler ve üretim bilgisi.',
  additives: [],
  additiveRiskLevel: 'none',
  allergenDataStatus: 'unknown',
  hasPalmOil: false,
  isUltraProcessedHint: false,
});

assert.equal(unknownAllergenScore.status, 'ready');
assert.equal(unknownAllergenScore.confidence, 'high');
assert.equal(unknownAllergenScore.factors.allergenTransparency, 40);
assert.ok(
  unknownAllergenScore.score !== null &&
    completeClearScore.score !== null &&
    unknownAllergenScore.score < completeClearScore.score,
  'unknown allergen data must lower the content score versus clear allergen evidence',
);

const containsAllergenScore = calculateContentScore({
  productName: 'Contains Allergen Smoke Product',
  ingredientsText: 'Tam içerik listesi, anlaşılır bileşenler ve üretim bilgisi.',
  additives: [],
  additiveRiskLevel: 'none',
  allergenDataStatus: 'contains_allergen',
  hasPalmOil: false,
  isUltraProcessedHint: false,
});

assert.equal(containsAllergenScore.factors.allergenTransparency, 60);
assert.ok(
  containsAllergenScore.score !== null &&
    unknownAllergenScore.score !== null &&
    completeClearScore.score !== null &&
    unknownAllergenScore.score < containsAllergenScore.score &&
    containsAllergenScore.score < completeClearScore.score,
  'content score allergen ordering must be unknown < contains_allergen < clear',
);

const missingAllergenScore = calculateContentScore({
  productName: 'Missing Allergen Smoke Product',
  ingredientsText: 'Tam içerik listesi, anlaşılır bileşenler ve üretim bilgisi.',
  additives: [],
  additiveRiskLevel: 'none',
  hasPalmOil: false,
  isUltraProcessedHint: false,
});

assert.equal(missingAllergenScore.status, 'partial');
assert.equal(missingAllergenScore.factors.allergenTransparency, 0);
assert.ok(
  missingAllergenScore.explanations.some((explanation) =>
    explanation.includes('Eksik bilesenler'),
  ),
);

const unavailableScore = calculateContentScore({
  productName: 'Unavailable Content Smoke Product',
});

assert.equal(unavailableScore.status, 'unavailable');
assert.equal(unavailableScore.score, null);
assert.equal(unavailableScore.confidence, 'low');

console.log('CONTENT_SCORE_SMOKE_OK');
