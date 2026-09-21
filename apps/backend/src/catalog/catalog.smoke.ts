import assert from 'node:assert/strict';

import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { buildCatalogProduct, loadCatalog } from './catalog.js';

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/0000000000000',
  observedAt: '2026-09-01T00:00:00.000Z',
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

function makeRecord(overrides: Partial<OffImportRecord>): OffImportRecord {
  return {
    gtin: '8690504000013',
    name: 'Test Ürünü',
    brand: 'Test Marka',
    quantity: null,
    categories: [],
    imageUrl: null,
    ingredientsText: null,
    ingredientsLang: null,
    allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
    nutriscoreGrade: null,
    novaGroup: null,
    nutrition100g: {
      energyKcal: null,
      fat: null,
      saturatedFat: null,
      carbohydrates: null,
      sugars: null,
      fiber: null,
      proteins: null,
      salt: null,
    },
    additives: [],
    provenance: BASE_PROVENANCE,
    missingFields: [],
    completeness: 'insufficient',
    ...overrides,
  };
}

// 1) Eşleşen grup / unclassified
const cheeseRecord = makeRecord({ categories: ['en:cheeses'] });
assert.equal(buildCatalogProduct(cheeseRecord).productGroupKey, 'cheese');

const unknownCategoryRecord = makeRecord({ categories: ['en:some-unmapped-category'] });
assert.equal(buildCatalogProduct(unknownCategoryRecord).productGroupKey, 'unclassified');

// 2) Kendi Nutri-Score hesabımız (yeterli besin verisi var)
const computedRecord = makeRecord({
  categories: [],
  nutrition100g: {
    energyKcal: 300,
    fat: 5,
    saturatedFat: 2,
    carbohydrates: 40,
    sugars: 10,
    fiber: null,
    proteins: 8,
    salt: 0.5,
  },
});
const computedProduct = buildCatalogProduct(computedRecord);
assert.equal(computedProduct.nutriScore.status, 'computed');
assert.equal(computedProduct.nutriScore.source, 'rafskoru_computed');
assert.ok(computedProduct.nutriScore.grade);
assert.deepEqual(computedProduct.nutriScore.assumptions, ['fiber_assumed_0', 'fvl_assumed_0']);

// 3) Kendi hesabımız eksik veriyle çalışamıyor ama OFF notu var → OFF'a düşüş
const offFallbackRecord = makeRecord({
  categories: [],
  nutriscoreGrade: 'e',
  nutrition100g: {
    energyKcal: 300,
    fat: null,
    saturatedFat: null,
    carbohydrates: null,
    sugars: null,
    fiber: null,
    proteins: null,
    salt: null,
  },
});
const offFallbackProduct = buildCatalogProduct(offFallbackRecord);
assert.equal(offFallbackProduct.nutriScore.status, 'off');
assert.equal(offFallbackProduct.nutriScore.source, 'off');
assert.equal(offFallbackProduct.nutriScore.grade, 'E');

// 4) Notun hiç olmaması
const noGradeRecord = makeRecord({ categories: [], nutriscoreGrade: null });
const noGradeProduct = buildCatalogProduct(noGradeRecord);
assert.equal(noGradeProduct.nutriScore.status, 'insufficient_data');
assert.equal(noGradeProduct.nutriScore.grade, null);
assert.equal(noGradeProduct.nutriScore.source, null);

// 5) unknown_or_unverified korunur — "içermez/güvenli" gibi başka bir duruma dönüştürülmez
const unknownAllergenRecord = makeRecord({
  allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
});
assert.equal(buildCatalogProduct(unknownAllergenRecord).allergenData.dataStatus, 'unknown_or_unverified');

const notListedRecord = makeRecord({
  allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'not_listed_in_available_data' },
});
assert.equal(buildCatalogProduct(notListedRecord).allergenData.dataStatus, 'not_listed_in_available_data');

const declaredRecord = makeRecord({
  allergens: {
    declared: ['milk', 'tree_nuts'],
    traces: ['egg'],
    rawDeclared: ['en:milk', 'en:nuts'],
    rawTraces: ['en:eggs'],
    dataStatus: 'present',
  },
});
const declaredProduct = buildCatalogProduct(declaredRecord);
assert.deepEqual(declaredProduct.allergenData.declared.sort(), ['milk', 'tree_nuts']);
assert.deepEqual(declaredProduct.allergenData.traces, ['egg']);
assert.equal(declaredProduct.allergenData.dataStatus, 'present');

// 6) packageSize yalnız açık biçimlerde ayrıştırılır
assert.deepEqual(buildCatalogProduct(makeRecord({ quantity: '1 L' })).packageSize, { amount: 1000, unit: 'ml' });
assert.deepEqual(buildCatalogProduct(makeRecord({ quantity: '500 g' })).packageSize, { amount: 500, unit: 'g' });
assert.equal(buildCatalogProduct(makeRecord({ quantity: 'yaklaşık 1 paket' })).packageSize, undefined);

// 7) Dosya yokken katalog boş kalır; hata fırlatılmaz
const emptyCatalog = loadCatalog('/tmp/rafskoru-catalog-smoke-does-not-exist.jsonl');
assert.equal(emptyCatalog.products.length, 0);
assert.equal(emptyCatalog.byId.size, 0);

console.log('CATALOG_SMOKE_OK');
