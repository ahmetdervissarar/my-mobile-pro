import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { createSearchRouter } from './searchRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/search', createSearchRouter());

async function get(path: string): Promise<Response> {
  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Test server address not available.');
    }

    return await fetch(`http://127.0.0.1:${address.port}${path}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

const response = await get('/api/search/suggest?q=pir');
assert.equal(response.status, 200);

const json = (await response.json()) as {
  ok: boolean;
  query: string;
  suggestions: Array<{ type: string; label: string; productGroupKey: string }>;
};

assert.equal(json.ok, true);
assert.equal(json.query, 'pir');
assert.equal(json.suggestions[0]?.type, 'product_group');
assert.equal(json.suggestions[0]?.label, 'Pirinç');
assert.equal(json.suggestions[0]?.productGroupKey, 'rice');

const shortResponse = await get('/api/search/suggest?q=p');
assert.equal(shortResponse.status, 200);

const shortJson = (await shortResponse.json()) as {
  ok: boolean;
  query: string;
  suggestions: unknown[];
};

assert.equal(shortJson.ok, true);
assert.equal(shortJson.query, 'p');
assert.deepEqual(shortJson.suggestions, []);

// Aşama 2 (katalog): "süt" sorgusu hem grup hem katalog ürün önerisi döndürür;
// ürün önerisinde allergenData.dataStatus taşınır (bkz. görev değişmez kural 3).
const milkRecord: OffImportRecord = {
  gtin: '8690504000013',
  name: 'Tam Yağlı Süt',
  brand: 'Örnek Marka',
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
    url: 'https://world.openfoodfacts.org/product/8690504000013',
    observedAt: null,
    fetchedAt: '2026-09-21T00:00:00.000Z',
  },
  missingFields: [],
  completeness: 'complete',
};

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-search-catalog-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(fixturePath, `${JSON.stringify(milkRecord)}\n`);
loadCatalog(fixturePath);

const milkResponse = await get('/api/search/suggest?q=sut');
assert.equal(milkResponse.status, 200);

const milkJson = (await milkResponse.json()) as {
  suggestions: Array<Record<string, unknown>>;
};

assert.ok(
  milkJson.suggestions.some((suggestion) => suggestion.type === 'product_group'),
  '"sut" sorgusu bir grup önerisi döndürmeli',
);

const milkProductSuggestion = milkJson.suggestions.find((suggestion) => suggestion.type === 'product');
assert.ok(milkProductSuggestion, '"sut" sorgusu bir katalog ürün önerisi döndürmeli');
assert.equal(
  (milkProductSuggestion as { allergenData?: { dataStatus?: string } }).allergenData?.dataStatus,
  'present',
);

console.log('SEARCH_ROUTES_SUGGESTIONS_SMOKE_OK');
