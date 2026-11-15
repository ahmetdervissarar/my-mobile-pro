/**
 * RafSkoru — Arama sonuçlarının sırası: tam ad eşleşmesi önce
 * apps/backend/src/search/searchRanking.smoke.ts
 *
 * Proje sahibi kararı (2026-11-15): kullanıcının yazdığı metin bir ürünün
 * adıyla birebir aynıysa o ürün listenin en üstünde yer alır — verisi daha
 * eksik olsa bile. Ardından adında geçen ürünler, en son yalnız markasıyla
 * eşleşen ürünler gelir.
 *
 * D4 istisnası korunur: adı yalnızca ürün grubunun jenerik adı olan kayıt
 * ("Süt") tam eşleşme sayılmaz (bkz. suggestionsGenericNameOrdering.smoke.ts).
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { suggestSearch } from './suggestions.js';

function ean13(first12: string): string {
  const sum = first12
    .split('')
    .map(Number)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return first12 + String((10 - (sum % 10)) % 10);
}

const COMPLETE_NUTRITION = {
  energyKcal: 540, fat: 30, saturatedFat: 18, carbohydrates: 58,
  sugars: 50, fiber: 2, proteins: 6, salt: 0.2,
};
const EMPTY_NUTRITION = {
  energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null,
  sugars: null, fiber: null, proteins: null, salt: null,
};

/** rich=true: veri tamlığı ve not bakımından en iyi kayıt (eski sıralamada en üste çıkardı). */
function record(gtin: string, name: string, brand: string, rich: boolean): OffImportRecord {
  return {
    gtin,
    name,
    brand,
    quantity: null,
    categories: ['en:chocolates'],
    imageUrl: rich ? 'https://example.test/x.jpg' : null,
    ingredientsText: rich ? 'şeker, kakao yağı, süt tozu' : null,
    ingredientsLang: rich ? 'tr' : null,
    allergens: rich
      ? { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' }
      : { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
    nutriscoreGrade: rich ? 'a' : null,
    offGradeRaw: rich ? 'a' : null,
    novaGroup: rich ? 4 : null,
    nutrition100g: rich ? COMPLETE_NUTRITION : EMPTY_NUTRITION,
    additives: [],
    provenance: {
      source: 'off',
      license: 'ODbL-1.0',
      url: `https://world.openfoodfacts.org/product/${gtin}`,
      observedAt: null,
      fetchedAt: '2026-09-21T00:00:00.000Z',
    },
    missingFields: [],
    completeness: rich ? 'complete' : 'insufficient',
  };
}

const EXACT = ean13('869920000010');
const PHRASE = ean13('869920000020');
const WORDS = ean13('869920000030');
const BRAND_ONLY = ean13('869920000040');
const ICIM_NAMED = ean13('869920000050');
const ICIM_BRAND_ONLY = ean13('869920000060');

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-search-ranking-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(
  fixturePath,
  [
    // Tam ad eşleşmesi BİLEREK en eksik veriyle: eski sıralamada en alta düşerdi.
    record(EXACT, 'Ülker Çikolata', 'Ülker', false),
    record(PHRASE, 'Ülker Çikolata Fındık Rüyası', 'Ülker', true),
    record(WORDS, 'Çikolata Ülker Sütlü Kare', 'Ülker', true),
    record(BRAND_ONLY, 'Çilekli Sütlü Kare Çikolata', 'Ülker', true),
    record(ICIM_NAMED, 'İçim Ayran', 'İçim', false),
    record(ICIM_BRAND_ONLY, 'Sade Kefir', 'İçim', true),
  ]
    .map((entry) => JSON.stringify(entry))
    .join('\n') + '\n',
);
loadCatalog(fixturePath);

function orderOf(query: string): string[] {
  return suggestSearch(query)
    .suggestions.filter((s) => s.type === 'product')
    .map((s) => (s as { productId: string }).productId);
}

// ── Tam ad eşleşmesi en üstte; sonra adla eşleşme gücü ───────────────────
{
  const order = orderOf('ülker çikolata');
  assert.equal(order[0], EXACT, 'tam ad eşleşmesi, verisi en eksik olsa da ilk sırada olmalı');
  assert.ok(order.indexOf(PHRASE) < order.indexOf(WORDS), 'adda sırasıyla geçen, dağınık geçenden önce gelmeli');
  assert.ok(order.indexOf(WORDS) < order.indexOf(BRAND_ONLY), 'adda geçen, yalnız markada geçenden önce gelmeli');
  assert.ok(order.indexOf(PHRASE) < order.indexOf(BRAND_ONLY));
}

// ── Yazılış farkı tam eşleşmeyi bozmaz ───────────────────────────────────
for (const query of ['ÜLKER ÇİKOLATA', 'ulker cikolata', '  Ülker  Çikolata. ']) {
  assert.equal(orderOf(query)[0], EXACT, `"${query}" tam ad eşleşmesi sayılmalı`);
}

// ── Tek kelime: adında geçen, yalnız markasıyla eşleşenden önce ──────────
{
  const order = orderOf('içim');
  assert.ok(order.includes(ICIM_BRAND_ONLY), 'markayla eşleşen ürün listede kalmalı');
  assert.ok(
    order.indexOf(ICIM_NAMED) < order.indexOf(ICIM_BRAND_ONLY),
    'adında "İçim" geçen ürün, verisi daha eksik olsa da yalnız markası İçim olandan önce gelmeli',
  );
}

// ── Eşleşme gücü eşitse eski kurallar (veri tamlığı) geçerli ─────────────
{
  const order = orderOf('kare');
  assert.ok(order.includes(WORDS) && order.includes(BRAND_ONLY));
}

rmSync(fixtureDir, { recursive: true, force: true });
console.log('SEARCH_RANKING_SMOKE_OK');
