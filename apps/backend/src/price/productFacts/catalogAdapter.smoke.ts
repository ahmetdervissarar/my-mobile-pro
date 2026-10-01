// productFactsFromCatalog — katalog-öncelikli ürün sayfası veri kaynağı.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../../catalog/catalog.js';
import type { OffImportRecord } from '../../tools/offTurkey/normalize.js';
import { productFactsFromCatalog } from './catalogAdapter.js';
import { productFactsToContentScoreInput } from './adapters.js';
import { calculateContentScore } from '../contentScore/index.js';

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/8690504000013',
  observedAt: '2026-09-01T00:00:00.000Z',
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

// "Dost %3.1" — declared=milk, eksik nutrition (isComplete=false olmalı) — yine de
// canlı OFF isComplete kapısı UYGULANMAMALI (katalogda ne varsa gösterilir).
const dostSutRecord: OffImportRecord = {
  gtin: '8690504000013',
  name: 'Dost %3.1 Yağlı Süt',
  brand: 'Dost',
  quantity: '1 L',
  categories: ['en:milks'],
  imageUrl: null,
  ingredientsText: null,
  ingredientsLang: null,
  allergens: { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' },
  nutriscoreGrade: 'b',
  offGradeRaw: 'b',
  novaGroup: 1,
  nutrition100g: {
    energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null,
    sugars: null, fiber: null, proteins: null, salt: null,
  },
  additives: [],
  provenance: BASE_PROVENANCE,
  missingFields: ['image', 'ingredients', 'nutrition.energyKcal'],
  completeness: 'usable_for_risk',
};

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-catalog-adapter-smoke-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(fixturePath, JSON.stringify(dostSutRecord) + '\n');
loadCatalog(fixturePath);

// 1) Katalogda olan bir GTIN — canlı OFF'a hiç gidilmeden ProductFacts döner.
const facts = productFactsFromCatalog('8690504000013');
assert.ok(facts, 'katalogdaki GTIN için ProductFacts dönmeli');
assert.equal(facts!.productName, 'Dost %3.1 Yağlı Süt');
assert.equal(facts!.nutriScoreGrade, 'B');
assert.deepEqual(facts!.catalogAllergenData?.declared, ['milk']);
assert.equal(facts!.catalogAllergenData?.dataStatus, 'present');
// isComplete=false (usable_for_risk) olsa da facts dönmeli — canlı-OFF isComplete
// kapısı katalog kaynaklı verilere UYGULANMAZ (tryFetchProductFacts'te ayrıca doğrulanır).
assert.equal(facts!.isComplete, false);
// Görev bulgusu madde 6: katalog gerçek katkı maddesi listesi taşımıyor —
// additives alanı "katkısız" (boş dizi) DEĞİL, "veri yok" (undefined)
// dönmeli; aksi halde contentScoreCalculator bunu en yüksek puanla
// (ADDITIVE_RISK_POINTS.none) yanlış yorumlar.
assert.equal(facts!.additives, undefined, 'additives veri yoksa undefined dönmeli, [] DEĞİL (bkz. madde 6 bulgusu)');

// Genel kural (görev koşulu 2): veri yokluğu "iyi değer" ile AYNI puanı
// ÜRETMEMELİ. Katalog kaynaklı facts ile türetilen content score girdisinde
// additiveRiskLevel null (veri yok) olmalı — gerçekten katkısız olduğu
// BİLİNEN (additiveRiskLevel: 'none') bir üründen DAHA DÜŞÜK puan almalı,
// aksi halde "veri yok" ile "katkısız" karıştırılıyor demektir.
const catalogContentInput = productFactsToContentScoreInput(facts!);
assert.equal(catalogContentInput.additiveRiskLevel, null, 'katalogdan gelen additiveRiskLevel veri yoksa null olmalı');

const catalogContentScore = calculateContentScore(catalogContentInput);
const confirmedNoAdditivesScore = calculateContentScore({ ...catalogContentInput, additiveRiskLevel: 'none' });

assert.notEqual(catalogContentScore.score, confirmedNoAdditivesScore.score);
assert.ok(
  (confirmedNoAdditivesScore.score ?? 0) > (catalogContentScore.score ?? 0),
  'gerçekten katkısız olduğu BİLİNEN ürün, katkı verisi hiç olmayan üründen daha yüksek puan almalı',
);

// 2) Katalogda olmayan bir GTIN — null döner (çağıran canlı OFF'a düşer).
const missing = productFactsFromCatalog('0000000000000');
assert.equal(missing, null);

console.log('CATALOG_ADAPTER_SMOKE_OK');
