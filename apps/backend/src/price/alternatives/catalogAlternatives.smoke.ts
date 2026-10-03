// getCatalogAlternatives — gerçek katalogdan, aynı grup içi alternatif önerisi.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../../catalog/catalog.js';
import type { OffImportRecord } from '../../tools/offTurkey/normalize.js';
import { getCatalogAlternatives } from './catalogAlternatives.js';

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/0000000000000',
  observedAt: '2026-09-01T00:00:00.000Z',
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

function makeRecord(overrides: Partial<OffImportRecord>): OffImportRecord {
  return {
    gtin: '0000000000000',
    name: 'Test Ürünü',
    brand: 'Test Marka',
    quantity: '1 L',
    categories: [],
    imageUrl: null,
    ingredientsText: 'Su, şeker.',
    ingredientsLang: 'tr',
    allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'not_listed_in_available_data' },
    nutriscoreGrade: null,
    offGradeRaw: null,
    novaGroup: null,
    nutrition100g: {
      energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null,
      sugars: null, fiber: null, proteins: null, salt: null,
    },
    additives: [],
    provenance: BASE_PROVENANCE,
    missingFields: [],
    completeness: 'insufficient',
    ...overrides,
  };
}

const MILK_LOW_GTIN = '8690000000031'; // en:milks, düşük puanlı (nutriScore yok)
const MILK_HIGH_GTIN = '8690000000048'; // en:milks, yüksek puanlı (nutriScore B)
const MILK_SAME_GTIN = '8690000000055'; // en:milks, mevcut üründen DÜŞÜK puanlı — elenmeli
const CHEESE_GTIN = '8690000000062'; // farklı grup (en:cheeses) — ASLA aday olmamalı
const UNCLASSIFIED_GTIN = '8690000000079'; // hiç OFF kategorisi yok — bölüm hiç çıkmamalı

const records = [
  makeRecord({ gtin: MILK_LOW_GTIN, name: 'Düz Süt', brand: 'A', categories: ['en:milks'] }),
  makeRecord({
    gtin: MILK_HIGH_GTIN,
    name: 'İyi Süt',
    brand: 'B',
    categories: ['en:milks'],
    nutriscoreGrade: 'b',
    novaGroup: 1,
  }),
  makeRecord({
    gtin: MILK_SAME_GTIN,
    name: 'Zayıf Süt',
    brand: 'C',
    categories: ['en:milks'],
    allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
    ingredientsText: null,
  }),
  makeRecord({ gtin: CHEESE_GTIN, name: 'Peynir', brand: 'D', categories: ['en:cheeses'] }),
  makeRecord({ gtin: UNCLASSIFIED_GTIN, name: 'Sınıfsız Ürün', brand: 'E', categories: [] }),
];

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-catalog-alternatives-smoke-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(fixturePath, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
loadCatalog(fixturePath);

// 1) Aynı grup (milk) içinden, mevcut ürünü hariç tutarak aday döner.
const result = getCatalogAlternatives({ barcode: MILK_LOW_GTIN });
assert.ok(result.currentProduct, 'mevcut ürün bulunmalı');
assert.equal(result.currentProduct!.productGroupKey, 'milk');
assert.ok(
  result.candidates.every((c) => c.productGroupKey === 'milk'),
  'tüm adaylar AYNI gruptan olmalı',
);
assert.ok(
  !result.candidates.some((c) => c.productId === CHEESE_GTIN),
  'farklı gruptaki ürün (peynir) hiç aday olmamalı',
);
assert.ok(
  result.candidates.some((c) => c.productId === MILK_HIGH_GTIN),
  'daha yüksek puanlı aynı-grup ürün aday listesinde olmalı',
);

// 2) Mevcut üründen düşük puanlı aday elenir.
assert.ok(
  !result.candidates.some((c) => c.productId === MILK_SAME_GTIN),
  'mevcut üründen düşük puanlı aday gösterilmemeli',
);

// 3) Sıralama: puana göre azalan.
for (let i = 1; i < result.candidates.length; i++) {
  assert.ok(
    (result.candidates[i - 1].rafScore.score ?? 0) >= (result.candidates[i].rafScore.score ?? 0),
    'adaylar puana göre azalan sıralı olmalı',
  );
}

// 4) Grup bilinmeyen (unclassified) üründe bölüm hiç çıkmaz (boş aday listesi).
const unclassifiedResult = getCatalogAlternatives({ barcode: UNCLASSIFIED_GTIN });
assert.deepEqual(unclassifiedResult.candidates, [], 'unclassified üründe aday listesi boş olmalı');

// 5) Katalogda olmayan barkod — currentProduct null, candidates boş.
const missingResult = getCatalogAlternatives({ barcode: '0000000000000' });
assert.equal(missingResult.currentProduct, null);
assert.deepEqual(missingResult.candidates, []);

console.log('CATALOG_ALTERNATIVES_SMOKE_OK');
