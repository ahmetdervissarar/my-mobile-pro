import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { buildBasketProfile } from './basketScoring.js';
import type { BasketEvaluateRequest } from './types.js';

const knownRequest: BasketEvaluateRequest = {
  items: [
    {
      type: 'product_group',
      productGroupKey: 'rice',
      label: 'Pirinç',
      quantity: { amount: 1, unit: 'kilogram' },
    },
    {
      type: 'product_group',
      productGroupKey: 'milk',
      label: 'Süt',
      quantity: { amount: 1, unit: 'liter' },
    },
  ],
};

const knownProfile = buildBasketProfile(knownRequest);

assert.equal(knownProfile.itemCount, 2);
assert.equal(knownProfile.coverage, 'partial');
assert.equal(typeof knownProfile.basketRafSkoru, 'number');
assert.equal(typeof knownProfile.subScores.health, 'number');
assert.equal(knownProfile.perItem[0]?.type, 'product_group');
assert.equal(knownProfile.perItem[0]?.productGroupKey, 'rice');
assert.equal(typeof knownProfile.perItem[0]?.score, 'number');
assert.deepEqual(knownProfile.perItem[0]?.riskFlags, []);

const unknownRequest: BasketEvaluateRequest = {
  items: [
    {
      type: 'product_group',
      productGroupKey: 'unknown_group',
      label: 'Bilinmeyen ürün grubu',
      quantity: { amount: 1, unit: 'piece' },
    },
  ],
};

const unknownProfile = buildBasketProfile(unknownRequest);

assert.equal(unknownProfile.itemCount, 1);
assert.equal(unknownProfile.coverage, 'insufficient_data');
assert.equal(unknownProfile.basketRafSkoru, null);
assert.equal(unknownProfile.perItem[0]?.score, null);

assert.equal(knownProfile.perItem[0]?.scoreSource, 'group_estimate');
assert.equal(unknownProfile.perItem[0]?.scoreSource, 'none');
assert.equal(unknownProfile.perItem[0]?.allergenDataStatus, 'unknown_or_unverified');

// Aşama 3 (katalog): productId katalogda bulunan/bulunmayan 'product' tipi öğeler.
const milkRecord: OffImportRecord = {
  gtin: '8690504000013',
  name: 'Tam Yağlı Süt',
  brand: 'Örnek Marka',
  quantity: '1 L',
  categories: ['en:milks'],
  imageUrl: 'https://example.com/sut.jpg',
  ingredientsText: 'süt',
  ingredientsLang: 'tr',
  allergens: { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' },
  nutriscoreGrade: 'c',
  offGradeRaw: 'c',
  novaGroup: 1,
  nutrition100g: {
    energyKcal: 60,
    fat: 3.2,
    saturatedFat: 2,
    carbohydrates: 4.7,
    sugars: 4.7,
    fiber: 0,
    proteins: 3.2,
    salt: 0.1,
  },
  additives: [],
  provenance: {
    source: 'off',
    license: 'ODbL-1.0',
    url: 'https://world.openfoodfacts.org/product/8690504000013',
    observedAt: null,
    fetchedAt: '2026-09-21T00:00:00.000Z',
  },
  missingFields: [],
  completeness: 'complete',
};

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-basket-catalog-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(fixturePath, `${JSON.stringify(milkRecord)}\n`);
loadCatalog(fixturePath);

const productRequest: BasketEvaluateRequest = {
  items: [
    {
      type: 'product',
      productId: milkRecord.gtin,
      productGroupKey: 'milk',
      label: milkRecord.name!,
      quantity: { amount: 1, unit: 'liter' },
    },
    {
      type: 'product',
      productId: 'not-in-catalog',
      productGroupKey: 'milk',
      label: 'Katalogda olmayan süt',
      quantity: { amount: 1, unit: 'liter' },
    },
  ],
};

const productProfile = buildBasketProfile(productRequest);

const knownCatalogItem = productProfile.perItem[0]!;
assert.equal(knownCatalogItem.brand, 'Örnek Marka');
assert.equal(knownCatalogItem.imageUrl, 'https://example.com/sut.jpg');
assert.equal(knownCatalogItem.nutriScore?.grade !== undefined, true);
assert.equal(knownCatalogItem.allergenData?.dataStatus, 'present');
assert.equal(knownCatalogItem.allergenDataStatus, undefined);
// Puan hala grup tahmininden gelir — bu görev puanlama mantığını değiştirmez.
assert.equal(knownCatalogItem.scoreSource, 'group_estimate');

const unknownCatalogItem = productProfile.perItem[1]!;
assert.equal(unknownCatalogItem.allergenDataStatus, 'unknown_or_unverified');
assert.equal(unknownCatalogItem.nutriScore, undefined);
assert.equal(unknownCatalogItem.allergenData, undefined);

console.log('BASKET_SCORING_SMOKE_OK');
