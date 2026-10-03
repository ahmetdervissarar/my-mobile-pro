// GET /api/price/alternatives/catalog — HTTP katmanı sözleşmesi.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import type { PriceProviderService } from '../price/priceProviderService.js';
import { createPriceRouter } from './priceRoutes.js';

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

const MILK_GTIN = '8690000000086';
const MILK_BETTER_GTIN = '8690000000093';

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-price-routes-catalog-alternatives-smoke-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(
  fixturePath,
  [
    makeRecord({ gtin: MILK_GTIN, name: 'Düz Süt', categories: ['en:milks'] }),
    makeRecord({ gtin: MILK_BETTER_GTIN, name: 'İyi Süt', categories: ['en:milks'], nutriscoreGrade: 'b', novaGroup: 1 }),
  ]
    .map((r) => JSON.stringify(r))
    .join('\n') + '\n',
);
loadCatalog(fixturePath);

const app = express();
app.use(
  '/api/price',
  createPriceRouter({
    resolve: async () => {
      throw new Error('resolve should not be called by catalog-alternatives smoke');
    },
  } as unknown as PriceProviderService),
);

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server address not available.');
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolvePromise, reject) => {
      server.close((err) => (err ? reject(err) : resolvePromise()));
    });
  }
}

await withServer(async (baseUrl) => {
  const missingBarcode = await fetch(`${baseUrl}/api/price/alternatives/catalog`);
  assert.equal(missingBarcode.status, 400);

  const response = await fetch(`${baseUrl}/api/price/alternatives/catalog?barcode=${MILK_GTIN}`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    currentProduct: { productGroupKey: string } | null;
    candidates: { productId: string; productGroupKey: string }[];
  };
  assert.equal(body.currentProduct?.productGroupKey, 'milk');
  assert.ok(body.candidates.some((c) => c.productId === MILK_BETTER_GTIN));

  const unknownBarcode = await fetch(`${baseUrl}/api/price/alternatives/catalog?barcode=0000000000000`);
  assert.equal(unknownBarcode.status, 200);
  const unknownBody = (await unknownBarcode.json()) as { currentProduct: unknown; candidates: unknown[] };
  assert.equal(unknownBody.currentProduct, null);
  assert.deepEqual(unknownBody.candidates, []);
});

console.log('PRICE_ROUTES_CATALOG_ALTERNATIVES_SMOKE_OK');
