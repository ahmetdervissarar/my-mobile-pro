import assert from 'node:assert/strict';

import {
  buildAlternativesBetaQueryEvent,
  buildPriceResolveBetaQueryEvent,
} from './queryEvent.js';

const resolveEvent = buildPriceResolveBetaQueryEvent({
  query: {
    barcode: '8690000000000',
    productName: 'Süt',
    location: { lat: 36.8, lng: 34.6 },
  },
  result: {
    productName: 'Süt 1 L',
    barcode: '8690000000000',
    productGroupKey: 'milk_1l',
    resolvedProductGroupKey: 'milk',
    alternativesEligible: true,
    marketName: 'Demo Market',
    price: 45,
    currency: 'TRY',
    source: 'manual_beta',
    status: 'manual_beta',
    updatedAt: new Date().toISOString(),
    confidence: 0.9,
  },
  triedProviders: ['manual_beta', 'last_known'],
});

assert.equal(resolveEvent.eventType, 'price_resolve');
assert.equal(resolveEvent.outcome, 'resolved');
assert.equal(resolveEvent.query.hasBarcode, true);
assert.equal(resolveEvent.query.barcodeLength, 13);
assert.equal(resolveEvent.query.barcodeHash?.length, 64);
assert.notEqual(resolveEvent.query.barcodeHash, '8690000000000');
assert.equal(resolveEvent.query.hasProductName, true);
assert.equal(resolveEvent.query.productNameLength, 3);
assert.equal(resolveEvent.query.hasLocation, true);
assert.equal(resolveEvent.result?.status, 'manual_beta');
assert.equal(resolveEvent.result?.source, 'manual_beta');
assert.equal(resolveEvent.result?.resolvedProductGroupKey, 'milk');
assert.equal(resolveEvent.result?.triedProviderCount, 2);

const unavailableEvent = buildPriceResolveBetaQueryEvent({
  query: { barcode: '1111111111111' },
  result: {
    productName: '',
    barcode: '1111111111111',
    marketName: '-',
    price: null,
    currency: 'TRY',
    source: null,
    status: 'unavailable',
    updatedAt: new Date().toISOString(),
    confidence: 0,
  },
});

assert.equal(unavailableEvent.outcome, 'unavailable');

const alternativesSuppressedEvent = buildAlternativesBetaQueryEvent({
  query: { barcode: '8690000000000' },
  categoryKey: 'dairy',
  productGroupKey: 'cheese',
  resolvedProductGroupKey: 'cheese',
  alternativesEligible: false,
  recommendationCount: 0,
  suppressionReason: 'not_alternatives_eligible',
});

assert.equal(alternativesSuppressedEvent.eventType, 'alternatives');
assert.equal(alternativesSuppressedEvent.outcome, 'suppressed');
assert.equal(alternativesSuppressedEvent.suppressionReason, 'not_alternatives_eligible');
assert.equal(alternativesSuppressedEvent.result?.recommendationCount, 0);

const alternativesRecommendedEvent = buildAlternativesBetaQueryEvent({
  query: { barcode: '8690000000000' },
  categoryKey: 'dairy',
  productGroupKey: 'milk_1l',
  resolvedProductGroupKey: 'milk',
  alternativesEligible: true,
  recommendationCount: 2,
});

assert.equal(alternativesRecommendedEvent.outcome, 'recommended');
assert.equal(alternativesRecommendedEvent.result?.recommendationCount, 2);

console.log('BETA_QUERY_EVENT_SMOKE_OK');
