/**
 * RafSkoru — Arama metninde Türkçe harfler
 * apps/backend/src/search/searchFolding.smoke.ts
 *
 * Hata (2026-11-15): büyük "İ" noktasını kaybedip "ı"ya dönüşüyordu. "İçim"
 * markası "içim" veya "icim" yazınca, "Pınar" markası "pinar" yazınca,
 * İngilizce "ICE TEA" "ice tea" yazınca bulunamıyordu. Katalogda adında veya
 * markasında büyük "İ" geçen 1.259 ürün vardı.
 *
 * Korunan kural: kullanıcı Türkçe harfle de, Türkçe harfsiz de, büyük ya da
 * küçük harfle de yazsa aynı ürünü bulur.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { foldSearchText, suggestSearch } from './suggestions.js';

// ── Katlama kuralları ────────────────────────────────────────────────────
const FOLD_CASES: Array<[string, string]> = [
  ['İçim', 'icim'],
  ['içim', 'icim'],
  ['İÇİM', 'icim'],
  ['ICIM', 'icim'],
  ['Pınar', 'pinar'],
  ['PINAR', 'pinar'],
  ['pinar', 'pinar'],
  ['ETİ', 'eti'],
  ['Eti', 'eti'],
  ['Ülker', 'ulker'],
  ['ÇAYKUR', 'caykur'],
  ['Şölen', 'solen'],
  ['Doğuş', 'dogus'],
  ['ICE TEA', 'ice tea'],
  ['COCA-COLA SERVICES', 'coca-cola services'],
  ['  Sıvı Yağ  ', 'sivi yag'],
];

for (const [input, expected] of FOLD_CASES) {
  assert.equal(foldSearchText(input), expected, `"${input}" → "${expected}" olmalı`);
}

// Aynı kelimenin bütün yazılışları aynı sonuca katlanmalı.
for (const group of [
  ['İçim', 'içim', 'icim', 'İÇİM', 'ICIM'],
  ['Pınar', 'pınar', 'pinar', 'PINAR'],
  ['Burçak', 'burcak', 'BURÇAK'],
  ['Şeftali', 'seftali', 'ŞEFTALİ'],
]) {
  assert.equal(new Set(group.map(foldSearchText)).size, 1, `${group.join(' / ')} aynı biçime katlanmalı`);
}

// ── Uçtan uca: katalogdaki ürün her yazılışla bulunur ────────────────────
function ean13(first12: string): string {
  const sum = first12
    .split('')
    .map(Number)
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return first12 + String((10 - (sum % 10)) % 10);
}

function record(gtin: string, name: string, brand: string): OffImportRecord {
  return {
    gtin,
    name,
    brand,
    quantity: null,
    categories: [],
    imageUrl: null,
    ingredientsText: null,
    ingredientsLang: null,
    allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
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
      observedAt: null,
      fetchedAt: '2026-09-21T00:00:00.000Z',
    },
    missingFields: [],
    completeness: 'insufficient',
  };
}

const ICIM = ean13('869910000010');
const PINAR = ean13('869910000020');
const ETI = ean13('869910000030');
const ICE_TEA = ean13('869910000040');

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-search-folding-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(
  fixturePath,
  [
    record(ICIM, 'İçim Tam Yağlı Süt', 'İçim'),
    record(PINAR, 'Pınar Ayran', 'Pınar'),
    record(ETI, 'ETİ Burçak', 'ETİ'),
    record(ICE_TEA, 'ICE TEA Şeftali', 'Lipton'),
  ]
    .map((entry) => JSON.stringify(entry))
    .join('\n') + '\n',
);
loadCatalog(fixturePath);

function foundIds(query: string): string[] {
  return suggestSearch(query)
    .suggestions.filter((s) => s.type === 'product')
    .map((s) => (s as { productId: string }).productId);
}

const SEARCH_CASES: Array<[string, string]> = [
  ['içim', ICIM],
  ['icim', ICIM],
  ['İÇİM', ICIM],
  ['İçim süt', ICIM],
  ['pınar', PINAR],
  ['pinar', PINAR],
  ['PINAR AYRAN', PINAR],
  ['eti', ETI],
  ['ETİ', ETI],
  ['burçak', ETI],
  ['burcak', ETI],
  ['ice tea', ICE_TEA],
  ['şeftali', ICE_TEA],
  ['seftali', ICE_TEA],
];

for (const [query, expectedId] of SEARCH_CASES) {
  assert.ok(foundIds(query).includes(expectedId), `"${query}" araması ilgili ürünü bulmalı`);
}

assert.ok(!foundIds('icim').includes(PINAR), 'katlama ilgisiz ürünleri eşleştirmemeli');

// ── Çok kelimeli sorgu: kelimeler yan yana olmak zorunda değil ───────────
assert.ok(foundIds('içim süt').includes(ICIM), 'marka + ürün türü araması bulmalı');
assert.ok(foundIds('süt içim').includes(ICIM), 'kelime sırası önemli olmamalı');
assert.ok(foundIds('lipton şeftali').includes(ICE_TEA), 'marka ad metninde olmasa da markayla bulunmalı');
assert.ok(!foundIds('içim ayran').includes(ICIM), 'kelimelerden biri geçmiyorsa eşleşmemeli');
assert.ok(!foundIds('içim ayran').includes(PINAR), 'kelimelerden biri geçmiyorsa eşleşmemeli');

// ── Ürün grubu araması da Türkçe harfsiz çalışır ─────────────────────────
for (const query of ['sıvı yağ', 'sivi yag', 'SIVI YAĞ']) {
  const groups = suggestSearch(query).suggestions.filter((s) => s.type === 'product_group');
  assert.ok(
    groups.some((s) => s.productGroupKey === 'sunflower_oil'),
    `"${query}" ayçiçek yağı grubunu önermeli`,
  );
}

rmSync(fixtureDir, { recursive: true, force: true });
console.log('SEARCH_FOLDING_SMOKE_OK');
