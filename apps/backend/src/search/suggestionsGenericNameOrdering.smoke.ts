/**
 * RafSkoru — Arama: jenerik isimli mükerrer-görünen kayıtları sona sırala (D4)
 * apps/backend/src/search/suggestionsGenericNameOrdering.smoke.ts
 *
 * Cihaz testi (30 Eylül): "Süt · Dost · 1000 ml" ve "%3.1 Yağlı Süt · Dost ·
 * 1000 ml" ayırt edilemiyordu. Kanıt: FARKLI GTIN (8695077092021 vs
 * 8695077102010), mükerrer değil — tekilleştirme YOK (veri kaybı riski).
 * Bunun yerine: adı yalnızca ürün grubunun jenerik Türkçe adıyla ("Süt")
 * birebir aynı olan kayıt, aynı gruptaki diğer kayıtların ARKASINA
 * sıralanır ama listede KALIR.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { suggestSearch } from './suggestions.js';

function milkRecord(overrides: Partial<OffImportRecord> & { gtin: string; name: string }): OffImportRecord {
  return {
    brand: 'Dost',
    quantity: '1 L',
    categories: ['en:milks'],
    imageUrl: null,
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
      url: 'https://world.openfoodfacts.org/product/test',
      observedAt: null,
      fetchedAt: '2026-09-21T00:00:00.000Z',
    },
    missingFields: [],
    completeness: 'complete',
    ...overrides,
  };
}

const genericRecord = milkRecord({ gtin: '8695077092021', name: 'Süt' });
const descriptiveRecord = milkRecord({ gtin: '8695077102010', name: 'Dost Tam Yağlı Süt' });

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-search-generic-name-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(fixturePath, `${JSON.stringify(genericRecord)}\n${JSON.stringify(descriptiveRecord)}\n`);
loadCatalog(fixturePath);

const result = suggestSearch('sut');
const productSuggestions = result.suggestions.filter((s) => s.type === 'product');

assert.equal(productSuggestions.length, 2, 'iki FARKLI GTIN de listede kalmalı (tekilleştirme yok)');

const genericIndex = productSuggestions.findIndex((s) => s.type === 'product' && s.productId === '8695077092021');
const descriptiveIndex = productSuggestions.findIndex((s) => s.type === 'product' && s.productId === '8695077102010');

assert.ok(genericIndex !== -1 && descriptiveIndex !== -1, 'her iki GTIN de sonuçlarda bulunmalı');
assert.ok(
  descriptiveIndex < genericIndex,
  'jenerik isimli kayıt ("Süt") daha açıklayıcı isimli kayıttan SONRA sıralanmalı',
);

console.log('SEARCH_SUGGESTIONS_GENERIC_NAME_ORDERING_SMOKE_OK');
