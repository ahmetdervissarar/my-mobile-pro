// Cihaz testi: ürün sayfasının "Sepete ekle" girdisi (resolvedProductGroupKey)
// aramanın kullandığı AYNI katalog alanına (CatalogProduct.productGroupKey)
// dayanmalı — ad-tabanlı sezgisel çıkarıma (inferProductGroupKey/
// resolveProductGroup) değil. "Mercimek" adı o sezgisel kural kümesinde HİÇ
// yok (yalnız milk/kefir/ayran/yogurt/chips/wafer/biscuit/chocolate/rice/
// water/cola/breakfast_cereal/baby_formula tanınır) — bu test, düzeltmeden
// önce bu üründe resolvedProductGroupKey'in null kalacağını (dolayısıyla
// "Sepete ekle"nin pasif kalacağını), düzeltmeden sonra katalogdaki
// productGroupKey'e (OFF en:lentils → 'lentils') düştüğünü doğrular.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../catalog/catalog.js';
import { suggestSearch } from '../search/suggestions.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { PriceProviderService } from './priceProviderService.js';

const LENTILS_GTIN = '8690000000201';

const record: OffImportRecord = {
  gtin: LENTILS_GTIN,
  name: 'Mercimek',
  brand: 'Test Marka',
  quantity: '500 g',
  categories: ['en:lentils'],
  imageUrl: null,
  ingredientsText: 'Mercimek.',
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

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-price-catalog-groupkey-smoke-'));
const fixturePath = join(fixtureDir, 'products.jsonl');
writeFileSync(fixturePath, `${JSON.stringify(record)}\n`);
loadCatalog(fixturePath);

const service = new PriceProviderService();
const response = await service.resolve({ barcode: LENTILS_GTIN });

assert.equal(
  response.result.resolvedProductGroupKey,
  'lentils',
  'katalogdaki OFF kategorisinden türeyen productGroupKey (arama ile AYNI alan) kullanılmalı',
);
assert.equal(response.result.groupConfidence, 'exact', 'katalog eşleşmesi yüksek güvenle (exact) sayılmalı');
assert.equal(response.result.groupSource, 'barcode');
assert.equal(
  response.result.alternativesEligible,
  true,
  "registry'de 'lentils' alternativeEligibility:'enabled' — true olmalı",
);

// Birebir aynı sonuç: arama (suggestSearch) AYNI ürün için AYNI productGroupKey'i
// (CatalogProduct.productGroupKey) döner — ürün sayfası ve arama artık aynı
// alandan besleniyor, ikisi arasında sepete ekleme tutarsızlığı kalmaz.
const searchResults = suggestSearch('Mercimek');
const searchSuggestion = searchResults.suggestions.find(
  (suggestion) => suggestion.type === 'product' && suggestion.productId === LENTILS_GTIN,
);
assert.ok(searchSuggestion, 'arama sonucunda test ürünü bulunmalı');
assert.equal(
  searchSuggestion!.type === 'product' ? searchSuggestion!.productGroupKey : undefined,
  response.result.resolvedProductGroupKey,
  'arama ve ürün sayfası (price resolve) AYNI productGroupKey değerini vermeli',
);

console.log('PRICE_PROVIDER_SERVICE_CATALOG_GROUP_KEY_SMOKE_OK');
