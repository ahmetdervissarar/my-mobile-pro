import assert from 'node:assert/strict';
import type { PriceResult } from '../types.js';
import { resolveDataConfidence } from './resolveConfidence.js';

function makeBaseResult(overrides: Partial<PriceResult> = {}): PriceResult {
  return {
    productName: 'Test Ürün',
    barcode: '8690000000000',
    marketName: 'Test Market',
    price: 50,
    currency: 'TRY',
    source: 'retailer_scraper',
    status: 'live',
    updatedAt: '2026-01-01T00:00:00.000Z',
    confidence: 0.9,
    marketPrices: [
      {
        marketName: 'Test Market',
        price: 50,
        currency: 'TRY',
      },
    ],
    productFacts: {
      barcode: '8690000000000',
      productName: 'Test Ürün',
      imageUrl: 'https://example.com/product.jpg',
      nutriScoreGrade: 'A',
      novaGroup: 1,
      trafficLight: {
        sugars: 'low',
        salt: 'low',
        saturatedFat: 'low',
        fat: 'low',
      },
      ingredientsText: 'Süt',
      additives: [],
      allergens: ['süt'],
      dataSource: 'off',
      isComplete: true,
      missingFields: [],
      verificationNeeded: false,
      confidence: 'high',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

const highConfidence = resolveDataConfidence(makeBaseResult());
assert.equal(highConfidence.level, 'high');
assert.ok(highConfidence.reasons.length >= 2);

const mediumConfidence = resolveDataConfidence(
  makeBaseResult({
    source: 'beta_reference',
    status: 'beta_reference',
    confidence: 0.2,
  }),
);
assert.equal(mediumConfidence.level, 'medium');

const lowConfidenceWithoutProductFacts = resolveDataConfidence(
  makeBaseResult({
    productFacts: undefined,
  }),
);
assert.equal(lowConfidenceWithoutProductFacts.level, 'low');

const lowConfidenceUnavailable = resolveDataConfidence(
  makeBaseResult({
    price: null,
    source: null,
    status: 'unavailable',
    confidence: 0,
    marketPrices: undefined,
    productFacts: undefined,
  }),
);
assert.equal(lowConfidenceUnavailable.level, 'low');

const lowConfidenceVerificationNeeded = resolveDataConfidence(
  makeBaseResult({
    productFacts: {
      dataSource: 'off',
      isComplete: false,
      missingFields: ['ingredientsText'],
      verificationNeeded: true,
      confidence: 'low',
    },
  }),
);
assert.equal(lowConfidenceVerificationNeeded.level, 'low');

console.log('DATA_CONFIDENCE_SMOKE_OK');
