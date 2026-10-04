// getCatalogRafScore — paylaşılan fiyatsız RafSkoru + bileşen-kapsamı etiketi.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getCatalog, loadCatalog } from '../../catalog/catalog.js';
import type { OffImportRecord } from '../../tools/offTurkey/normalize.js';
import { __resetCatalogRafScoreCacheForTesting, getCatalogRafScore } from './catalogRafScore.js';

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
    quantity: null,
    categories: [],
    imageUrl: null,
    ingredientsText: null,
    ingredientsLang: null,
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

// "İçerik yalnız" — nutriScore/nova yok, yalnız alerjen/içindekiler verisi var.
const CONTENT_ONLY_GTIN = '8690000000017';
const contentOnlyRecord = makeRecord({
  gtin: CONTENT_ONLY_GTIN,
  ingredientsText: 'Su, şeker.',
  allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'not_listed_in_available_data' },
});

// "Sağlık + içerik" — nutriScore/nova da var.
const HEALTH_AND_CONTENT_GTIN = '8690000000024';
const healthAndContentRecord = makeRecord({
  gtin: HEALTH_AND_CONTENT_GTIN,
  ingredientsText: 'Su, şeker.',
  nutriscoreGrade: 'c',
  novaGroup: 2,
});

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-catalog-rafscore-smoke-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(
  fixturePath,
  `${JSON.stringify(contentOnlyRecord)}\n${JSON.stringify(healthAndContentRecord)}\n`,
);
loadCatalog(fixturePath);

const catalog = getCatalog();
const contentOnlyProduct = catalog.byId.get(CONTENT_ONLY_GTIN);
const healthAndContentProduct = catalog.byId.get(HEALTH_AND_CONTENT_GTIN);
assert.ok(contentOnlyProduct, 'içerik-yalnız fixture katalogda olmalı');
assert.ok(healthAndContentProduct, 'sağlık+içerik fixture katalogda olmalı');

// Not: sustainabilityScore kategori sınıflandırmasından türer, nutriScore/nova
// gerektirmez — bu yüzden "sağlıksız" (nutriScore/nova yok) bir üründe bile
// mevcut olabilir. Gerçek davranışa göre doğrulanmıştır (bkz. görev kanıtı).
const contentOnlyResult = getCatalogRafScore(contentOnlyProduct!);
assert.ok(contentOnlyResult, 'içerik-yalnız üründe de fiyatsız RafSkoru hesaplanabilmeli (KARAR)');
assert.ok(
  !contentOnlyResult!.scoreCoverageKey.includes('health'),
  'nutriScore/nova verisi yoksa kapsamda health OLMAMALI',
);
assert.ok(contentOnlyResult!.scoreCoverageKey.includes('content'));
assert.ok(contentOnlyResult!.rafScore.score !== null);

const healthAndContentResult = getCatalogRafScore(healthAndContentProduct!);
assert.ok(healthAndContentResult);
assert.ok(
  healthAndContentResult!.scoreCoverageKey.includes('health') &&
    healthAndContentResult!.scoreCoverageKey.includes('content'),
  'nutriScore/nova verisi varsa kapsamda health VE content olmalı',
);
// İki fixture'ın kapsamı birbirinden FARKLI olmalı — "aynı bileşen kümesi mi"
// karşılaştırmasının (alternatif önerisi görevi) anlamlı olabilmesi için.
assert.notEqual(contentOnlyResult!.scoreCoverageKey, healthAndContentResult!.scoreCoverageKey);

// Aynı ürün için ikinci çağrı önbellekten (referans eşitliği) gelmeli.
const cachedAgain = getCatalogRafScore(contentOnlyProduct!);
assert.equal(cachedAgain, contentOnlyResult, 'ikinci çağrı önbellekten aynı nesneyi dönmeli');

// Katalog yeniden yüklenince önbellek temizlenmeli (loadedAt değişimi).
__resetCatalogRafScoreCacheForTesting();
writeFileSync(fixturePath, `${JSON.stringify(contentOnlyRecord)}\n`);
loadCatalog(fixturePath);
const reloadedCatalog = getCatalog();
const reloadedProduct = reloadedCatalog.byId.get(CONTENT_ONLY_GTIN);
assert.ok(reloadedProduct);
const afterReload = getCatalogRafScore(reloadedProduct!);
assert.notEqual(afterReload, contentOnlyResult, 'yeniden yüklenen katalogda önbellek sıfırlanmalı (yeni nesne)');

console.log('CATALOG_RAF_SCORE_SMOKE_OK');
