/**
 * RafSkoru — Onaylı etiket kayıtlarının listelere yansıması (ADR-009, İş 1.3d)
 * apps/backend/src/catalog/effectiveCatalog.smoke.ts
 *
 * Korunan kural: aynı ürün ürün sayfasında, aramada, kategori listesinde,
 * sepette ve alternatif bölümünde AYNI puanı, AYNI Nutri-Score'u ve AYNI
 * alerjen verisini gösterir — onaylı etiket kaydı olsa da olmasa da.
 *
 * Ayrıca:
 *   - onaylanmamış aday kayıt hiçbir listeyi etkilemez
 *   - yeni onay, önbellekler sunucu yeniden başlatılmadan güncellenir
 *   - alerjen beyan/iz listeleri ve veri durumu değişmez
 *   - katalogun kendisi değişmez (ürün sayfası alan kökenini kaybetmez)
 *   - OFF'ta adı olmayan ürün, onaylı kayıttaki adla aranabilir
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildBasketProfile } from '../basket/basketScoring.js';
import {
  __resetLabelStoreDbForTesting,
  approveCandidate,
  createCandidate,
  recordExtraction,
  recordVerification,
} from '../labelStore/db.js';
import type { LabelFields, LabelRead } from '../labelStore/types.js';
import { getCatalogAlternatives } from '../price/alternatives/catalogAlternatives.js';
import { calculateContentScore } from '../price/contentScore/index.js';
import { calculateHealthScore } from '../price/healthScore/index.js';
import { PriceProviderService } from '../price/priceProviderService.js';
import {
  productFactsToContentScoreInput,
  productFactsToHealthScoreInput,
  productFactsToSustainabilityInput,
} from '../price/productFacts/adapters.js';
import { productFactsFromCatalog } from '../price/productFacts/catalogAdapter.js';
import { applyVerifiedLabel } from '../price/productFacts/verifiedLabelResolver.js';
import { __resetCatalogRafScoreCacheForTesting } from '../price/rafScore/catalogRafScore.js';
import { calculateRafScore } from '../price/rafScore/index.js';
import { calculateSustainabilityScore } from '../price/sustainability/index.js';
import { suggestByProductGroup, suggestSearch, type SearchSuggestion } from '../search/suggestions.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { getCatalog, loadCatalog } from './catalog.js';
import { __resetEffectiveCatalogForTesting, getEffectiveProductFacts } from './effectiveCatalog.js';

function ean13(first12: string): string {
  const sum = first12
    .split('')
    .map(Number)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return first12 + String((10 - (sum % 10)) % 10);
}

const LABELLED = ean13('869900000010');
const OTHER = ean13('869900000020');
const NAMELESS = ean13('869900000030');

function record(gtin: string, overrides: Partial<OffImportRecord>): OffImportRecord {
  return {
    gtin,
    name: 'Kayıt Testi Pirinci',
    brand: 'KayıtMarka',
    quantity: '1 kg',
    categories: ['en:rices'],
    imageUrl: null,
    ingredientsText: null,
    ingredientsLang: null,
    allergens: { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' },
    nutriscoreGrade: null,
    offGradeRaw: null,
    novaGroup: null,
    nutrition100g: {
      energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null,
      sugars: null, fiber: null, proteins: null, salt: null,
    },
    additives: [],
    provenance: {
      source: 'off',
      license: 'ODbL-1.0',
      url: `https://world.openfoodfacts.org/product/${gtin}`,
      observedAt: '2026-06-01T00:00:00.000Z',
      fetchedAt: '2026-09-21T00:00:00.000Z',
    },
    missingFields: ['ingredients', 'nutriscore'],
    completeness: 'usable_for_risk',
    ...overrides,
  };
}

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-effective-catalog-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(
  fixturePath,
  [
    record(LABELLED, {}),
    record(OTHER, { name: 'Diğer Pirinç', nutriscoreGrade: 'a', offGradeRaw: 'a', novaGroup: 1 }),
    record(NAMELESS, { name: null, brand: 'AdsizMarka' }),
  ]
    .map((entry) => JSON.stringify(entry))
    .join('\n') + '\n',
);
loadCatalog(fixturePath);
__resetLabelStoreDbForTesting(':memory:');
__resetEffectiveCatalogForTesting();
__resetCatalogRafScoreCacheForTesting();

const emptyFields: LabelFields = {
  productName: null,
  brand: null,
  quantityText: null,
  ingredientsText: null,
  ingredientsLang: null,
  allergenStatementText: null,
  traceStatementText: null,
  nutritionPer100: null,
};

const labelFields: LabelFields = {
  ...emptyFields,
  ingredientsText: 'Pirinç unu, şeker, süt tozu, susam',
  ingredientsLang: 'tr',
  nutritionPer100: {
    basis: '100g',
    energyKcal: 380,
    fat: 3,
    saturatedFat: 1,
    carbohydrates: 80,
    sugars: 12,
    fiber: 2,
    protein: 7,
    salt: 0.3,
  },
};

function read(fields: LabelFields): LabelRead {
  return { reader: 'desktop_session', model: null, readAt: '2026-11-14T12:00:00.000Z', fields, unreadableFields: [] };
}

function addCandidate(barcode: string, fields: LabelFields, approve: boolean, observedAt = '2026-11-10T09:30:00.000Z'): void {
  const candidate = createCandidate({
    barcode,
    photoSource: 'intake',
    photos: [{ slot: 'ingredients', ref: 'photos/x.jpg', attribution: null }],
    observedAt,
  });
  recordExtraction(candidate.id, read(fields));
  recordVerification(candidate.id, read(fields), []);
  if (approve) approveCandidate(candidate.id, { approvedBy: 'proje-sahibi' });
}

/** Ürün sayfasının yaptığının birebir aynısı: katalog verisi + onaylı kayıt + aynı hesaplayıcılar. */
function productPage(gtin: string) {
  const facts = applyVerifiedLabel(gtin, productFactsFromCatalog(gtin), getCatalog().byId.get(gtin)?.nutriScoreCategory ?? null);
  assert.ok(facts, `${gtin} için ürün verisi bulunmalı`);
  const rafScore = calculateRafScore({
    priceScore: null,
    healthScore: calculateHealthScore(productFactsToHealthScoreInput(facts)).score,
    contentScore: calculateContentScore(productFactsToContentScoreInput(facts)).score,
    sustainabilityScore: calculateSustainabilityScore(productFactsToSustainabilityInput(facts)).score,
  });
  return { facts, rafScore };
}

function searchRow(query: string, gtin: string) {
  return suggestSearch(query).suggestions.find(
    (s): s is Extract<SearchSuggestion, { type: 'product' }> => s.type === 'product' && s.productId === gtin,
  );
}

function groupRow(gtin: string) {
  return suggestByProductGroup('rice').suggestions.find((s) => s.productId === gtin);
}

function basketRow(gtin: string) {
  return buildBasketProfile({
    items: [{ type: 'product', productId: gtin, productGroupKey: 'rice', label: 'Test', quantity: { amount: 1, unit: 'piece' } }],
  }).perItem[0]!;
}

/** Her ekranın aynı puanı, Nutri-Score'u ve alerjen verisini gösterdiğini doğrular. */
function assertAllScreensAgree(gtin: string, query: string): ReturnType<typeof productPage> {
  const page = productPage(gtin);
  const search = searchRow(query, gtin);
  const group = groupRow(gtin);
  const basket = basketRow(gtin);
  const alternatives = getCatalogAlternatives({ barcode: gtin }).currentProduct;

  assert.ok(search, 'arama satırı bulunmalı');
  assert.ok(group, 'kategori satırı bulunmalı');
  assert.ok(alternatives, 'alternatif bölümünde mevcut ürün bulunmalı');

  assert.deepEqual(search.rafScore, page.rafScore, 'arama puanı ürün sayfasıyla aynı olmalı');
  assert.deepEqual(group.rafScore, page.rafScore, 'kategori puanı ürün sayfasıyla aynı olmalı');
  assert.deepEqual(alternatives.rafScore, page.rafScore, 'alternatif bölümündeki puan ürün sayfasıyla aynı olmalı');

  for (const [screen, nutriScore] of [
    ['arama', search.nutriScore],
    ['kategori', group.nutriScore],
    ['sepet', basket.nutriScore],
    ['alternatif', alternatives.nutriScore],
  ] as const) {
    assert.equal(nutriScore?.grade ?? null, page.facts.nutriScoreGrade ?? null, `${screen}: Nutri-Score ürün sayfasıyla aynı olmalı`);
  }

  for (const [screen, allergenData] of [
    ['arama', search.allergenData],
    ['kategori', group.allergenData],
    ['sepet', basket.allergenData],
    ['alternatif', alternatives.allergenData],
  ] as const) {
    assert.deepEqual(allergenData, page.facts.catalogAllergenData, `${screen}: alerjen verisi ürün sayfasıyla aynı olmalı`);
  }

  assert.deepEqual(getEffectiveProductFacts(getCatalog().byId.get(gtin)!), page.facts, 'liste puanlama girdisi ürün sayfasıyla aynı olmalı');
  return page;
}

const catalogAllergenBefore = structuredClone(getCatalog().byId.get(LABELLED)!.allergenData);

// ── 1) Onaylı kayıt yok: ekranlar zaten tutarlı ──────────────────────────
const before = assertAllScreensAgree(LABELLED, 'kayıt testi pirinci');
assert.equal(before.facts.nutriScoreGrade ?? null, null);
assert.equal(searchRow('kayıt testi pirinci', LABELLED)!.nutriScore?.source, null);

// ── 2) Onaylanmamış aday hiçbir listeyi etkilemez ────────────────────────
addCandidate(LABELLED, labelFields, false);
{
  const unchanged = assertAllScreensAgree(LABELLED, 'kayıt testi pirinci');
  assert.deepEqual(unchanged.rafScore, before.rafScore);
  assert.equal(searchRow('kayıt testi pirinci', LABELLED)!.allergenData?.ingredientsEvidence.source, 'off');
}

// ── 3) Onay → bütün ekranlar sunucu yeniden başlamadan güncellenir ───────
addCandidate(LABELLED, labelFields, true);
{
  const after = assertAllScreensAgree(LABELLED, 'kayıt testi pirinci');
  assert.equal(typeof after.rafScore.score, 'number', 'onaylı içindekiler ve besin tablosuyla puan üretilmeli');
  assert.notDeepEqual(after.rafScore, before.rafScore, 'onay puanı değiştirmeli (önbellek eski puanı tutmamalı)');
  assert.notEqual(after.facts.nutriScoreGrade ?? null, null, 'besin tablosundan not hesaplanmalı');

  const row = searchRow('kayıt testi pirinci', LABELLED)!;
  assert.deepEqual(
    { grade: row.nutriScore?.grade, status: row.nutriScore?.status, source: row.nutriScore?.source },
    { grade: after.facts.nutriScoreGrade, status: 'computed', source: 'rafskoru_label' },
    'etiketten hesaplanan not liste satırında kaynağıyla görünmeli',
  );
  assert.ok(row.nutriScore!.assumptions.includes('fvl_assumed_0'), 'hesap varsayımı satırda taşınmalı');

  // Alerjen sınıflandırması değişmez; yalnız kanıt metni onaylı içindekilerdir.
  assert.deepEqual(row.allergenData!.declared, catalogAllergenBefore.declared);
  assert.deepEqual(row.allergenData!.traces, catalogAllergenBefore.traces);
  assert.equal(row.allergenData!.dataStatus, catalogAllergenBefore.dataStatus);
  assert.deepEqual(row.allergenData!.ingredientsEvidence, {
    text: 'Pirinç unu, şeker, süt tozu, susam',
    lang: 'tr',
    source: 'rafskoru_verified',
  });

  // Katalogun kendisi değişmez → ürün sayfası alan kökenini korur.
  const raw = getCatalog().byId.get(LABELLED)!;
  assert.deepEqual(raw.allergenData, catalogAllergenBefore, 'katalogdaki alerjen verisi değişmemeli');
  assert.equal(raw.nutriScore.source, null, 'katalogdaki not değişmemeli');
  assert.equal(after.facts.fieldSources?.ingredientsText?.source, 'rafskoru_verified');
  assert.equal(after.facts.fieldSources?.nutriScoreGrade?.source, 'rafskoru_verified');

  // Gerçek ürün sayfası yolu (PriceProviderService) da aynı veriyi üretir.
  const resolved = (await new PriceProviderService().resolve({ barcode: LABELLED })).result.productFacts;
  assert.deepEqual(resolved, after.facts, 'ürün sayfası servisi liste ile aynı veriyi döndürmeli');
}

// ── 4) Yeni sürüm onayı → listeler yeni sürüme geçer ─────────────────────
addCandidate(
  LABELLED,
  { ...labelFields, ingredientsText: 'Pirinç unu, şeker, süt tozu' },
  true,
  '2026-11-12T09:30:00.000Z',
);
{
  assertAllScreensAgree(LABELLED, 'kayıt testi pirinci');
  assert.equal(
    searchRow('kayıt testi pirinci', LABELLED)!.allergenData!.ingredientsEvidence.text,
    'Pirinç unu, şeker, süt tozu',
    'en son onaylanan sürüm kullanılmalı',
  );
}

// ── 5) Onaylı kaydı olmayan ürün etkilenmez ──────────────────────────────
{
  assertAllScreensAgree(OTHER, 'diğer pirinç');
  const row = searchRow('diğer pirinç', OTHER)!;
  assert.equal(row.nutriScore?.source, 'off');
  assert.deepEqual(row.allergenData, getCatalog().byId.get(OTHER)!.allergenData);
}

// ── 6) OFF'ta adı olmayan ürün, onaylı kayıttaki adla aranabilir ─────────
{
  assert.equal(searchRow('yerel pirinç unu', NAMELESS), undefined, 'onaydan önce bu adla bulunmamalı');
  addCandidate(NAMELESS, { ...emptyFields, productName: 'Yerel Pirinç Unu', ingredientsText: 'Pirinç unu' }, true);

  const row = searchRow('yerel pirinç unu', NAMELESS);
  assert.ok(row, 'onaylı kayıttaki adla bulunmalı');
  assert.equal(row.label, 'Yerel Pirinç Unu');
  assert.ok(searchRow('adsizmarka', NAMELESS), 'marka ile aramak çalışmaya devam etmeli');
  assertAllScreensAgree(NAMELESS, 'yerel pirinç unu');
}

rmSync(fixtureDir, { recursive: true, force: true });
console.log('EFFECTIVE_CATALOG_SMOKE_OK');
