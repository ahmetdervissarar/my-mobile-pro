import assert from 'node:assert/strict';
import { enrichOffers, pickBestOffer } from './enrichOffers.js';
import type { StoreLocator } from '../stores/storeLocator.js';

const mockStoreLocator: StoreLocator = {
  name: 'mock-store-locator',
  async findNearby() {
    return [
      {
        chainCode: 'MIGROS',
        displayName: 'Migros',
        branchName: 'Test Şube',
        latitude: 36.8,
        longitude: 34.63,
        address: 'Test adres',
      },
    ];
  },
};

const offers = await enrichOffers(
  [
    {
      marketName: 'Migros Sanal Market',
      price: 42.5,
      currency: 'TRY',
      source: 'manual_beta',
      productName: 'Test Süt 1 L',
      barcode: '8690000000000',
      productUrl: 'https://example.com/product',
      imageUrl: 'https://example.com/image.jpg',
      availability: 'unknown',
      observedAt: '2026-06-14T00:00:00.000Z',
      freshnessLabel: 'reference',
      confidence: 0.8,
      matchType: 'barcode',
      note: 'Smoke test offer',
    },
  ],
  {
    location: {
      latitude: 36.81,
      longitude: 34.62,
    },
  },
  {
    storeLocator: mockStoreLocator,
  },
);

assert.equal(offers.length, 1);

const offer = offers[0];

assert.equal(offer.chainCode, 'MIGROS');
assert.equal(offer.displayName, 'Migros');
assert.equal(offer.marketName, 'Migros Sanal Market');
assert.equal(offer.price, 42.5);
assert.equal(offer.currency, 'TRY');
assert.equal(offer.source, 'manual_beta');
assert.equal(offer.productName, 'Test Süt 1 L');
assert.equal(offer.barcode, '8690000000000');
assert.equal(offer.productUrl, 'https://example.com/product');
assert.equal(offer.imageUrl, 'https://example.com/image.jpg');
assert.equal(offer.availability, 'unknown');
assert.equal(offer.observedAt, '2026-06-14T00:00:00.000Z');
assert.equal(offer.freshnessLabel, 'reference');
assert.equal(offer.confidence, 0.8);
assert.equal(offer.matchType, 'barcode');
assert.equal(offer.note, 'Smoke test offer');

assert.ok(offer.store);
assert.ok(offer.distance);
assert.equal(typeof offer.distanceMeters, 'number');
assert.equal(typeof offer.distanceText, 'string');

const bestOffer = pickBestOffer(offers);

assert.equal(bestOffer?.price, 42.5);

console.log('PRICE_OFFERS_ENRICH_SMOKE_OK');

