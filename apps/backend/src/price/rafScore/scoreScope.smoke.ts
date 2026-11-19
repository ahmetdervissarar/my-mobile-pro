/**
 * RafSkoru — Alkollü içecekler puan kapsamı dışında (ADR-009 §11, İş 1.4b)
 * apps/backend/src/price/rafScore/scoreScope.smoke.ts
 *
 * Korunan kurallar:
 *   - alkollü olduğu yalnız OFF kategorisinden veya onaylayanın seçtiği
 *     üründen anlaşılır; ürün adından ÇIKARILMAZ
 *   - kapsam dışı üründe hiçbir puan gösterilmez; durum "veri yok" ile
 *     karışmaz (ayrı gerekçe kodu)
 *   - ürün sayfası ve listeler AYNI sonucu gösterir
 *   - ürün verisi (içindekiler, alerjen) olduğu gibi kalır — alerjen
 *     uyarıları bundan etkilenmez
 *   - kapsam dışı ürün "daha yüksek puanlı seçenekler" bölümü açmaz
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../../catalog/catalog.js';
import { __resetEffectiveCatalogForTesting } from '../../catalog/effectiveCatalog.js';
import {
  __resetLabelStoreDbForTesting,
  approveCandidate,
  createCandidate,
  recordExtraction,
  recordVerification,
} from '../../labelStore/db.js';
import type { LabelFields, LabelRead } from '../../labelStore/types.js';
import { suggestSearch, type SearchSuggestion } from '../../search/suggestions.js';
import type { OffImportRecord } from '../../tools/offTurkey/normalize.js';
import { getCatalogAlternatives } from '../alternatives/catalogAlternatives.js';
import { PriceProviderService } from '../priceProviderService.js';
import { __resetCatalogRafScoreCacheForTesting } from './catalogRafScore.js';
import {
  buildOutOfScopeRafScore,
  isOutOfScopeRafScore,
  RAF_SCORE_OUT_OF_SCOPE_REASON_CODE,
  scoreScopeExclusionFromOffCategories,
} from './scoreScope.js';

function ean13(first12: string): string {
  const sum = first12
    .split('')
    .map(Number)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return first12 + String((10 - (sum % 10)) % 10);
}

// ── Kural birimleri ──────────────────────────────────────────────────────
assert.equal(scoreScopeExclusionFromOffCategories(['en:beverages', 'en:beers']), 'alcoholic_beverage');
assert.equal(scoreScopeExclusionFromOffCategories(['en:alcoholic-beverages']), 'alcoholic_beverage');
assert.equal(scoreScopeExclusionFromOffCategories(['en:wines']), 'alcoholic_beverage');
assert.equal(scoreScopeExclusionFromOffCategories(['en:beverages', 'en:juices']), null);
assert.equal(scoreScopeExclusionFromOffCategories([]), null);
assert.equal(scoreScopeExclusionFromOffCategories(null), null);

{
  const outOfScope = buildOutOfScopeRafScore('alcoholic_beverage');
  assert.equal(outOfScope.score, null);
  assert.equal(outOfScope.status, 'unavailable');
  assert.deepEqual(outOfScope.reasons?.map((reason) => reason.code), [RAF_SCORE_OUT_OF_SCOPE_REASON_CODE]);
  assert.ok(outOfScope.components.every((component) => !component.isAvailable));
  assert.equal(isOutOfScopeRafScore(outOfScope), true);
  assert.equal(isOutOfScopeRafScore(null), false);
}

// ── Katalog düzeneği ─────────────────────────────────────────────────────
const BEER = ean13('869930000010');
const NAMED_LIKE_BEER = ean13('869930000020');
const UNCATEGORIZED = ean13('869930000030');
const LIVE_BEER = ean13('869930000040');

function record(gtin: string, overrides: Partial<OffImportRecord>): OffImportRecord {
  return {
    gtin,
    name: 'Test Ürünü',
    brand: 'TestMarka',
    quantity: '500 ml',
    categories: [],
    imageUrl: null,
    ingredientsText: 'Su, arpa maltı, şerbetçiotu, maya',
    ingredientsLang: 'tr',
    allergens: { declared: ['gluten_wheat'], traces: [], rawDeclared: ['en:gluten'], rawTraces: [], dataStatus: 'present' },
    nutriscoreGrade: null,
    offGradeRaw: null,
    novaGroup: 3,
    nutrition100g: {
      energyKcal: 42, fat: 0, saturatedFat: 0, carbohydrates: 3.2,
      sugars: 0.2, fiber: null, proteins: 0.4, salt: 0.01,
    },
    additives: [],
    provenance: {
      source: 'off',
      license: 'ODbL-1.0',
      url: `https://world.openfoodfacts.org/product/${gtin}`,
      observedAt: null,
      fetchedAt: '2026-09-21T00:00:00.000Z',
    },
    missingFields: [],
    completeness: 'usable_for_risk',
    ...overrides,
  };
}

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-score-scope-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(
  fixturePath,
  [
    record(BEER, { name: 'Kapsam Testi Birası', categories: ['en:beverages', 'en:alcoholic-beverages', 'en:beers'] }),
    // Adında "bira" geçiyor ama alkollü kategorisi YOK → addan çıkarım yapılmamalı.
    record(NAMED_LIKE_BEER, { name: 'Kapsam Testi Bira Tadında Malt İçeceği', categories: ['en:beverages'] }),
    record(UNCATEGORIZED, { name: 'Kapsam Testi Kategorisiz', categories: [] }),
  ]
    .map((entry) => JSON.stringify(entry))
    .join('\n') + '\n',
);
loadCatalog(fixturePath);
__resetLabelStoreDbForTesting(':memory:');
__resetEffectiveCatalogForTesting();
__resetCatalogRafScoreCacheForTesting();

function searchRow(query: string, gtin: string) {
  return suggestSearch(query).suggestions.find(
    (s): s is Extract<SearchSuggestion, { type: 'product' }> => s.type === 'product' && s.productId === gtin,
  );
}

const requestedUrls: string[] = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
  const url = typeof input === 'string' ? input : input.toString();
  requestedUrls.push(url);
  if (url.includes(LIVE_BEER)) {
    return new Response(
      JSON.stringify({
        status: 1,
        product: {
          product_name: 'Canlı OFF Birası',
          ingredients_text: 'Su, arpa maltı',
          allergens_tags: ['en:gluten'],
          traces_tags: [],
          categories_tags: ['en:beverages', 'en:beers'],
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }
  return new Response(JSON.stringify({ status: 0 }), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

try {
  const service = new PriceProviderService();

  // ── OFF kategorisiyle alkollü: ürün sayfası ────────────────────────────
  const beerPage = (await service.resolve({ barcode: BEER })).result;
  assert.equal(beerPage.rafScore?.score, null, 'alkollü içeceğe puan verilmemeli');
  assert.deepEqual(
    beerPage.rafScore?.reasons?.map((reason) => reason.code),
    [RAF_SCORE_OUT_OF_SCOPE_REASON_CODE],
    'tek gerekçe "kapsam dışı" olmalı; "veri yok" gerekçeleriyle karışmamalı',
  );
  assert.equal(beerPage.healthScore, undefined, 'sağlık puanı gösterilmemeli');
  assert.equal(beerPage.contentScore, undefined, 'içerik puanı gösterilmemeli');
  assert.equal(beerPage.sustainability, undefined);
  assert.equal(beerPage.priceScore, undefined);

  // Ürün verisi olduğu gibi kalır → alerjen uyarısı mobilde üretilebilir.
  assert.equal(beerPage.productFacts?.scoreScopeExclusion, 'alcoholic_beverage');
  assert.equal(beerPage.productFacts?.ingredientsText, 'Su, arpa maltı, şerbetçiotu, maya');
  assert.deepEqual(beerPage.productFacts?.catalogAllergenData?.declared, ['gluten_wheat']);
  assert.equal(beerPage.productFacts?.catalogAllergenData?.dataStatus, 'present');

  // ── Listeler aynı sonucu gösterir ──────────────────────────────────────
  const beerRow = searchRow('kapsam testi birası', BEER);
  assert.ok(beerRow, 'alkollü ürün aramada bulunmaya devam etmeli');
  assert.deepEqual(beerRow.rafScore, beerPage.rafScore, 'arama satırı ürün sayfasıyla aynı sonucu göstermeli');
  assert.deepEqual(beerRow.allergenData?.declared, ['gluten_wheat'], 'liste satırında alerjen verisi kalmalı');

  // ── Alternatif bölümü açılmaz ──────────────────────────────────────────
  assert.deepEqual(getCatalogAlternatives({ barcode: BEER }).candidates, []);

  // ── Addan çıkarım yok ──────────────────────────────────────────────────
  const namedPage = (await service.resolve({ barcode: NAMED_LIKE_BEER })).result;
  assert.equal(namedPage.productFacts?.scoreScopeExclusion, undefined, 'adında "bira" geçmesi kapsam dışı bırakmamalı');
  assert.equal(isOutOfScopeRafScore(namedPage.rafScore), false);
  assert.equal(isOutOfScopeRafScore(searchRow('bira tadında', NAMED_LIKE_BEER)?.rafScore), false);

  // ── Onaylayanın seçtiği tür: kategorisiz ürün kapsam dışı olur ─────────
  assert.equal(isOutOfScopeRafScore(searchRow('kapsam testi kategorisiz', UNCATEGORIZED)?.rafScore), false);
  {
    const fields: LabelFields = {
      productName: null, brand: null, quantityText: null,
      ingredientsText: 'Su, arpa maltı, şerbetçiotu, maya', ingredientsLang: 'tr',
      allergenStatementText: null, traceStatementText: null, nutritionPer100: null,
    };
    const read: LabelRead = { reader: 'desktop_session', model: null, readAt: '2026-11-18T10:00:00.000Z', fields, unreadableFields: [] };
    const candidate = createCandidate({
      barcode: UNCATEGORIZED,
      photoSource: 'intake',
      photos: [{ slot: 'ingredients', ref: 'photos/x.jpg', attribution: null }],
      observedAt: '2026-11-10T09:30:00.000Z',
    });
    recordExtraction(candidate.id, read);
    recordVerification(candidate.id, read, []);
    approveCandidate(candidate.id, { approvedBy: 'proje-sahibi', productKind: 'alcoholic_beverage' });
  }
  const approvedPage = (await service.resolve({ barcode: UNCATEGORIZED })).result;
  assert.equal(approvedPage.productFacts?.scoreScopeExclusion, 'alcoholic_beverage');
  assert.equal(isOutOfScopeRafScore(approvedPage.rafScore), true);
  assert.deepEqual(searchRow('kapsam testi kategorisiz', UNCATEGORIZED)?.rafScore, approvedPage.rafScore);
  assert.equal(approvedPage.productFacts?.nutriScoreGrade ?? null, null, 'alkollü içeceğe Nutri-Score gösterilmemeli');
  assert.equal(
    searchRow('kapsam testi kategorisiz', UNCATEGORIZED)?.nutriScore?.grade ?? null,
    null,
    'liste satırında da katalogun önceki notu gösterilmemeli',
  );
  assert.equal(searchRow('kapsam testi kategorisiz', UNCATEGORIZED)?.nutriScore?.status, 'not_applicable');

  // OFF kategorisiyle alkollü üründe katalog kendi notunu da hesaplamaz.
  assert.equal(beerRow.nutriScore?.grade ?? null, null, 'alkollü kategorideki ürüne Nutri-Score hesaplanmamalı');
  assert.equal(beerRow.nutriScore?.status, 'not_applicable');
  assert.equal(beerPage.productFacts?.nutriScoreGrade ?? null, null);
  // Kapsam içi ürünün notu etkilenmez.
  assert.notEqual(searchRow('bira tadında', NAMED_LIKE_BEER)?.nutriScore?.grade ?? null, null);

  // ── Canlı OFF: kategori etiketi de istenir ve uygulanır ────────────────
  const livePage = (await service.resolve({ barcode: LIVE_BEER })).result;
  assert.ok(requestedUrls.some((url) => url.includes(LIVE_BEER) && url.includes('categories_tags')), 'canlı OFF isteği kategori etiketlerini istemeli');
  assert.equal(livePage.productFacts?.scoreScopeExclusion, 'alcoholic_beverage');
  assert.equal(isOutOfScopeRafScore(livePage.rafScore), true);
  assert.deepEqual(livePage.productFacts?.catalogAllergenData?.declared, ['gluten_wheat']);

  // ── Gıda dışı ürün (ADR-009 §14): onaylayan seçer; puan ve not gösterilmez ──
  {
    const fields: LabelFields = {
      productName: null, brand: 'Örnek Kozmetik', quantityText: null,
      ingredientsText: null, ingredientsLang: null,
      allergenStatementText: null, traceStatementText: null, nutritionPer100: null,
    };
    const read: LabelRead = { reader: 'desktop_session', model: null, readAt: '2026-11-19T10:00:00.000Z', fields, unreadableFields: [] };
    const candidate = createCandidate({
      barcode: NAMED_LIKE_BEER,
      photoSource: 'intake',
      photos: [{ slot: 'ingredients', ref: 'photos/y.jpg', attribution: null }],
      observedAt: '2026-11-19T09:30:00.000Z',
    });
    recordExtraction(candidate.id, read);
    recordVerification(candidate.id, read, []);
    approveCandidate(candidate.id, { approvedBy: 'proje-sahibi', productKind: 'non_food' });
  }
  const nonFoodPage = (await service.resolve({ barcode: NAMED_LIKE_BEER })).result;
  assert.equal(nonFoodPage.productFacts?.scoreScopeExclusion, 'non_food');
  assert.equal(isOutOfScopeRafScore(nonFoodPage.rafScore), true);
  assert.equal(nonFoodPage.rafScore?.reasons?.[0]?.params?.scope, 'non_food');
  assert.equal(nonFoodPage.productFacts?.nutriScoreGrade ?? null, null, 'gıda dışı ürüne Nutri-Score gösterilmemeli');
  const nonFoodRow = searchRow('bira tadında', NAMED_LIKE_BEER);
  assert.deepEqual(nonFoodRow?.rafScore, nonFoodPage.rafScore, 'liste ve ürün sayfası aynı sonucu vermeli');
  assert.equal(nonFoodRow?.nutriScore?.status, 'not_applicable');

  console.log('SCORE_SCOPE_SMOKE_OK');
} finally {
  globalThis.fetch = originalFetch;
  rmSync(fixtureDir, { recursive: true, force: true });
}
