// Ağsız uçtan uca akış: arama → GTIN ile sepete ekleme → değerlendirme.
// Hiçbir dış servise (OFF dahil) bağlanmaz; sabit bir fixture JSONL kullanır.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildBasketProfile } from '../basket/basketScoring.js';
import type { BasketEvaluateRequest } from '../basket/types.js';
import { suggestSearch } from '../search/suggestions.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { getCatalog, loadCatalog } from './catalog.js';

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/0000000000000',
  observedAt: null,
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

const EMPTY_NUTRITION: OffImportRecord['nutrition100g'] = {
  energyKcal: null,
  fat: null,
  saturatedFat: null,
  carbohydrates: null,
  sugars: null,
  fiber: null,
  proteins: null,
  salt: null,
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
    nutrition100g: EMPTY_NUTRITION,
    additives: [],
    provenance: BASE_PROVENANCE,
    missingFields: [],
    completeness: 'insufficient',
    ...overrides,
  };
}

// Fındıklı bir ürün — üç-kova düzeltmesinin ağsız uçtan uca akışta da çalıştığını kanıtlar.
const hazelnutRecord = makeRecord({
  gtin: '8690504000013',
  name: 'Fındıklı Çikolata',
  brand: 'Örnek Marka',
  categories: ['en:chocolates'],
  allergens: {
    declared: [],
    traces: [],
    rawDeclared: ['en:hazelnuts'],
    rawTraces: [],
    dataStatus: 'present',
  },
});

// Sade bir süt ürünü — arama sonucunda hem grup hem katalog önerisi döner.
const milkRecord = makeRecord({
  gtin: '8690504000020',
  name: 'Tam Yağlı Süt',
  brand: 'Örnek Süt',
  categories: ['en:milks'],
  allergens: { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' },
});

// Aynı GTIN'de ÇELİŞEN alerjen beyanı — biri süt, diğeri fıstık diyor. loadCatalog bu
// ürünü fail-closed olarak unknown_or_unverified'a düşürmeli ve sayaç artmalı.
const conflictGtin = '8690504000037';
const conflictRecordA = makeRecord({
  gtin: conflictGtin,
  name: 'Çelişkili Ürün',
  categories: ['en:biscuits'],
  allergens: { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' },
});
const conflictRecordB = makeRecord({
  gtin: conflictGtin,
  name: 'Çelişkili Ürün',
  categories: ['en:biscuits'],
  allergens: { declared: ['peanut'], traces: [], rawDeclared: ['en:peanuts'], rawTraces: [], dataStatus: 'present' },
});

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-catalog-e2e-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(
  fixturePath,
  [
    JSON.stringify(hazelnutRecord),
    JSON.stringify(milkRecord),
    JSON.stringify(conflictRecordA),
    JSON.stringify(conflictRecordB),
    '{this is not valid json', // bozuk satır sayacını kanıtlar
  ].join('\n') + '\n',
);

loadCatalog(fixturePath);

// 1) Bozuk satır ve mükerrer GTIN çakışması sayaçları doğru mu?
const catalog = getCatalog();
assert.equal(catalog.malformedLineCount, 1);
assert.equal(catalog.duplicateConflictCount, 1);
assert.equal(catalog.products.length, 3); // hazelnut + milk + conflict (tek kayıt olarak)

// 2) Arama: "süt" hem grup hem katalog ürün önerisi döner; allergenData.dataStatus taşınır.
const milkSearch = suggestSearch('süt');
assert.ok(milkSearch.suggestions.some((s) => s.type === 'product_group'));
const milkSuggestion = milkSearch.suggestions.find(
  (s) => s.type === 'product' && s.productId === milkRecord.gtin,
);
assert.ok(milkSuggestion, '"süt" araması katalogdaki süt ürününü döndürmeli');
assert.equal(
  milkSuggestion!.type === 'product' ? milkSuggestion!.allergenData?.dataStatus : undefined,
  'present',
);

// 3) Arama: fındıklı ürün de bulunur, declared tree_nuts içerir.
const chocolateSearch = suggestSearch('fındıklı');
const hazelnutSuggestion = chocolateSearch.suggestions.find(
  (s) => s.type === 'product' && s.productId === hazelnutRecord.gtin,
);
assert.ok(hazelnutSuggestion, '"fındıklı" araması bulunmalı');
assert.deepEqual(
  hazelnutSuggestion!.type === 'product' ? hazelnutSuggestion!.allergenData?.declared : undefined,
  ['tree_nuts'],
);

// 4) Sepete GTIN ile ekleme + değerlendirme — fındıklı ürün, katalogda olmayan bir ürün,
//    ve çelişkili mükerrer GTIN'li ürün birlikte.
const request: BasketEvaluateRequest = {
  items: [
    {
      type: 'product',
      productId: hazelnutRecord.gtin,
      productGroupKey: 'chocolate',
      label: hazelnutRecord.name!,
      quantity: { amount: 1, unit: 'piece' },
    },
    {
      type: 'product',
      productId: 'not-in-catalog-0000000000',
      productGroupKey: 'chocolate',
      label: 'Katalogda olmayan ürün',
      quantity: { amount: 1, unit: 'piece' },
    },
    {
      type: 'product',
      productId: conflictGtin,
      productGroupKey: 'biscuit',
      label: 'Çelişkili Ürün',
      quantity: { amount: 1, unit: 'piece' },
    },
  ],
};

const profile = buildBasketProfile(request);

const hazelnutItem = profile.perItem[0]!;
assert.deepEqual(hazelnutItem.allergenData?.declared, ['tree_nuts']);
assert.equal(hazelnutItem.allergenData?.dataStatus, 'present');
assert.equal(hazelnutItem.allergenDataStatus, undefined);

const notInCatalogItem = profile.perItem[1]!;
assert.equal(notInCatalogItem.allergenDataStatus, 'unknown_or_unverified');
assert.equal(notInCatalogItem.allergenData, undefined);

const conflictItem = profile.perItem[2]!;
assert.equal(conflictItem.allergenData?.dataStatus, 'unknown_or_unverified');
assert.deepEqual(conflictItem.allergenData?.declared, []);

console.log('CATALOG_END_TO_END_SMOKE_OK');
