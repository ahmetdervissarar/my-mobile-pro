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

// not_listed_in_available_data artık bir katalog dataStatus değeri DEĞİL (yalnız çip
// düzeyinde, profil-alerjeni-başına bir sonuçtur). Ham etiket yoksa (içindekiler olsa
// da olmasa da) katalog düzeyinde her zaman unknown_or_unverified.
const noRawTagsWithIngredientsRecord = makeRecord({
  ingredientsText: 'şeker, süt tozu',
  allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'not_listed_in_available_data' },
});
assert.equal(buildCatalogProduct(noRawTagsWithIngredientsRecord).allergenData.dataStatus, 'unknown_or_unverified');

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

// 8) Üç kova — bkz. görev onayı
// 8a) en:hazelnuts → tree_nuts (savunmacı eşleme; gerçek OFF kanonik etiketi değil, bkz.
//     offAllergenMap.ts başlığı). Uygulamadan ÖNCE bu assert kırmızı görüldü.
const hazelnutRecord = makeRecord({
  allergens: {
    declared: [],
    traces: [],
    rawDeclared: ['en:hazelnuts'],
    rawTraces: [],
    dataStatus: 'present',
  },
});
const hazelnutProduct = buildCatalogProduct(hazelnutRecord);
assert.deepEqual(hazelnutProduct.allergenData.declared, ['tree_nuts']);
assert.equal(hazelnutProduct.allergenData.dataStatus, 'present');

// 8b) en:milk (bilinen) + gerçekten tanınmayan bir etiket → milk declared'da kalır,
//     durum 'partial' (present DEĞİL).
const partialRecord = makeRecord({
  allergens: {
    declared: [],
    traces: [],
    rawDeclared: ['en:milk', 'en:some-truly-unknown-tag'],
    rawTraces: [],
    dataStatus: 'present',
  },
});
const partialProduct = buildCatalogProduct(partialRecord);
assert.deepEqual(partialProduct.allergenData.declared, ['milk']);
assert.equal(partialProduct.allergenData.dataStatus, 'partial');
assert.deepEqual(partialProduct.allergenData.rawUnmapped, ['en:some-truly-unknown-tag']);

// 8c) Yalnız en:celery (tanınan ama modellenmemiş) → present, partial DEĞİL.
const celeryOnlyRecord = makeRecord({
  allergens: {
    declared: [],
    traces: [],
    rawDeclared: ['en:celery'],
    rawTraces: [],
    dataStatus: 'present',
  },
});
const celeryOnlyProduct = buildCatalogProduct(celeryOnlyRecord);
assert.equal(celeryOnlyProduct.allergenData.dataStatus, 'present');
assert.deepEqual(celeryOnlyProduct.allergenData.declared, []);
assert.deepEqual(celeryOnlyProduct.allergenData.recognizedUnmodeled, ['en:celery']);
assert.deepEqual(celeryOnlyProduct.allergenData.rawUnmapped, []);

// 8d) Etiketsiz ürün (rawDeclared/rawTraces boş) → unknown_or_unverified.
const noTagsRecord = makeRecord({
  allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'present' },
});
assert.equal(buildCatalogProduct(noTagsRecord).allergenData.dataStatus, 'unknown_or_unverified');

// 9) Nutri-Score: OFF notu varsa her zaman öncelikli — kendi hesabımız yeterli veriyle
//    çalışabilse bile 'computed' değil 'off' kullanılır.
const offPriorityRecord = makeRecord({
  categories: [],
  nutriscoreGrade: 'b',
  nutrition100g: {
    energyKcal: 300,
    fat: 5,
    saturatedFat: 2,
    carbohydrates: 40,
    sugars: 10,
    fiber: 3,
    proteins: 8,
    salt: 0.5,
  },
});
const offPriorityProduct = buildCatalogProduct(offPriorityRecord);
assert.equal(offPriorityProduct.nutriScore.status, 'off');
assert.equal(offPriorityProduct.nutriScore.source, 'off');
assert.equal(offPriorityProduct.nutriScore.grade, 'B');

// 7) Dosya yokken katalog boş kalır; hata fırlatılmaz
const emptyCatalog = loadCatalog('/tmp/rafskoru-catalog-smoke-does-not-exist.jsonl');
assert.equal(emptyCatalog.products.length, 0);
assert.equal(emptyCatalog.byId.size, 0);

console.log('CATALOG_SMOKE_OK');
