// GET /api/price/resolve — katalog boşken sessizce "ürün bulunamadı"
// göstermek yerine catalogStatus alanıyla gerçek durumu taşıması (bkz.
// görev onayı, madde 5c).
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import type { PriceProviderService } from '../price/priceProviderService.js';
import { createPriceRouter } from './priceRoutes.js';

async function withServer<T>(app: express.Express, run: (baseUrl: string) => Promise<T>): Promise<T> {
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

const fakeResolve = async () => ({
  result: { status: 'not_found', raw: undefined } as never,
  disclaimer: 'test-disclaimer',
  triedProviders: [],
});

// ── Katalog boş (hiç yüklenmedi) → catalogStatus.empty: true ────────────
{
  loadCatalog('/tmp/rafskoru-catalog-status-does-not-exist.jsonl');

  const app = express();
  app.use('/api/price', createPriceRouter({ resolve: fakeResolve } as unknown as PriceProviderService));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/price/resolve?q=test`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { catalogStatus: { empty: boolean; productCount: number } };
    assert.deepEqual(body.catalogStatus, { empty: true, productCount: 0 });
  });
}

// ── Katalog dolu → catalogStatus.empty: false, productCount doğru ───────
{
  const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-price-routes-catalog-status-'));
  const fixturePath = join(fixtureDir, 'products.jsonl');
  const record: OffImportRecord = {
    gtin: '8690000000086',
    name: 'Test Ürünü',
    brand: 'Test Marka',
    quantity: null,
    categories: [],
    imageUrl: null,
    ingredientsText: null,
    ingredientsLang: null,
    allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
    nutriscoreGrade: null,
    offGradeRaw: null,
    novaGroup: null,
    nutrition100g: { energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null, sugars: null, fiber: null, proteins: null, salt: null },
    additives: [],
    provenance: {
      source: 'off',
      license: 'ODbL-1.0',
      url: 'https://world.openfoodfacts.org/product/0000000000000',
      observedAt: '2026-09-01T00:00:00.000Z',
      fetchedAt: '2026-09-21T00:00:00.000Z',
    },
    missingFields: [],
    completeness: 'insufficient',
  };
  writeFileSync(fixturePath, `${JSON.stringify(record)}\n`);
  loadCatalog(fixturePath);

  const app = express();
  app.use('/api/price', createPriceRouter({ resolve: fakeResolve } as unknown as PriceProviderService));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/price/resolve?q=test`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { catalogStatus: { empty: boolean; productCount: number } };
    assert.deepEqual(body.catalogStatus, { empty: false, productCount: 1 });
  });
}

console.log('PRICE_ROUTES_CATALOG_STATUS_SMOKE_OK');
