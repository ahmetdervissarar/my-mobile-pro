/**
 * Cihaz testi 1 Ekim, madde 4: liste puanı (arama/kategori önerileri) ürün
 * sayfasıyla AYNI hesaplayıcı zincirini (calculateHealthScore/
 * calculateContentScore/calculateSustainabilityScore + calculateRafScore,
 * aynı renormalize kuralı) kullanmalı. Bu test, suggestSearch/
 * suggestByProductGroup'un döndürdüğü rafScore'un, AYNI GTIN için ürün
 * sayfasının (priceProviderService.attachRafScore ile BİREBİR aynı adım
 * dizisi) hesapladığı sonuçla EŞİT olduğunu doğrular — üç ekran (ürün
 * sayfası, arama, kategori) arasında sapma olmamalı.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { productFactsFromCatalog } from '../price/productFacts/catalogAdapter.js';
import {
  productFactsToContentScoreInput,
  productFactsToHealthScoreInput,
  productFactsToSustainabilityInput,
} from '../price/productFacts/adapters.js';
import { calculateContentScore } from '../price/contentScore/index.js';
import { calculateHealthScore } from '../price/healthScore/index.js';
import { calculateSustainabilityScore } from '../price/sustainability/index.js';
import { calculateRafScore } from '../price/rafScore/index.js';
import { suggestByProductGroup, suggestSearch } from './suggestions.js';

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/8699000000013',
  observedAt: '2026-09-01T00:00:00.000Z',
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

// Fiyatı bilinmeyen (gerçekçi), sağlık/içerik verisi kısmen dolu bir ürün —
// KARAR'ın (fiyatsız değerlendirme) tetiklendiği tipik senaryo.
const record: OffImportRecord = {
  gtin: '8699000000013',
  name: 'Tutarlılık Testi Pirinci',
  brand: 'TestMarka',
  quantity: '1 kg',
  categories: ['en:rices'],
  imageUrl: null,
  ingredientsText: null,
  ingredientsLang: null,
  allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
  nutriscoreGrade: null,
  offGradeRaw: null,
  novaGroup: 1,
  nutrition100g: {
    energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null,
    sugars: null, fiber: null, proteins: null, salt: null,
  },
  additives: [],
  provenance: BASE_PROVENANCE,
  missingFields: ['ingredients', 'nutriscore'],
  completeness: 'usable_for_risk',
};

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-suggestion-rafscore-parity-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(fixturePath, JSON.stringify(record) + '\n');
loadCatalog(fixturePath);

function computeProductPageEquivalentRafScore(gtin: string) {
  const facts = productFactsFromCatalog(gtin);
  assert.ok(facts, 'fixture GTIN için facts bulunmalı');

  const healthScore = calculateHealthScore(productFactsToHealthScoreInput(facts!));
  const contentScore = calculateContentScore(productFactsToContentScoreInput(facts!));
  const sustainabilityScore = calculateSustainabilityScore(productFactsToSustainabilityInput(facts!));

  return calculateRafScore({
    priceScore: null,
    healthScore: healthScore.score,
    contentScore: contentScore.score,
    sustainabilityScore: sustainabilityScore.score,
  });
}

const expectedRafScore = computeProductPageEquivalentRafScore('8699000000013');
// Sabit beklenti değil — gerçek hesaplamanın kendisiyle karşılaştırılıyor;
// yine de bir skor üretildiğini (null kalmadığını) doğrulayalım.
assert.equal(typeof expectedRafScore.score, 'number');

// ── suggestSearch (arama) ───────────────────────────────────────────────
const searchResult = suggestSearch('tutarlılık testi pirinci');
const searchSuggestion = searchResult.suggestions.find(
  (s): s is Extract<typeof s, { type: 'product' }> => s.type === 'product' && s.productId === '8699000000013',
);
assert.ok(searchSuggestion, 'arama önerisinde test ürünü bulunmalı');
assert.deepEqual(searchSuggestion!.rafScore, expectedRafScore, 'arama listesi puanı ürün sayfasıyla BİREBİR aynı olmalı');

// ── suggestByProductGroup (kategori) ────────────────────────────────────
const groupResult = suggestByProductGroup('rice');
const groupSuggestion = groupResult.suggestions.find((s) => s.productId === '8699000000013');
assert.ok(groupSuggestion, 'kategori listesinde test ürünü bulunmalı');
assert.deepEqual(groupSuggestion!.rafScore, expectedRafScore, 'kategori listesi puanı ürün sayfasıyla BİREBİR aynı olmalı');

console.log('SUGGESTION_RAF_SCORE_PARITY_SMOKE_OK');
