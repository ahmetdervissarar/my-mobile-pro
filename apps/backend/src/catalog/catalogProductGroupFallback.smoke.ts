// Görev (unclassified %78,3 ölçümü) — İş 1b: ad-tabanlı grup eşleştirmesi
// (resolveProductGroup) artık OFF categories_tags'i hiç çıkaramadığında
// devreye giriyor. Bu test: (1) OFF eşleşmesi varsa ad ASLA ezmez,
// (2) marka adına takılmaz, (3) restricted (bebek maması) gruplar ad
// yoluyla da atanmaz, (4) kelime sınırı hatası (cola⊂cikolata gibi
// alt-dize eşleşmeleri) düzeltildi.
import assert from 'node:assert/strict';

import type { OffImportRecord } from '../tools/offTurkey/normalize.js';
import { buildCatalogProduct } from './catalog.js';

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/0000000000000',
  observedAt: '2026-09-01T00:00:00.000Z',
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

function makeRecord(overrides: Partial<OffImportRecord>): OffImportRecord {
  return {
    gtin: '8690504000013',
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

// 1) OFF eşleşmesi varsa ad-tabanlı ASLA ezmez — ad "Pirinç" (rice) desin,
// OFF etiketi 'en:milks' (milk) olsun; sonuç OFF'a göre 'milk' kalmalı.
{
  const product = buildCatalogProduct(
    makeRecord({ name: 'Pirinç Sütü 1 L', categories: ['en:milks'] }),
  );
  assert.equal(product.productGroupKey, 'milk');
  assert.equal(product.productGroupSource, 'off');
}

// 2) OFF boşsa (unclassified) ve ad net bir ürün grubuna işaret ediyorsa
// ad-tabanlı devreye girer, kaynak 'name' işaretlenir.
{
  const product = buildCatalogProduct(makeRecord({ name: 'Kefir 1 L', categories: [] }));
  assert.equal(product.productGroupKey, 'kefir');
  assert.equal(product.productGroupSource, 'name');
}

// 3) Marka adına takılma testi: marka "Eti"/"Ülker"/"Banvit", ad grupla
// ilgisiz bir ürün — hiçbir grup atanmamalı (unclassified kalmalı).
for (const brand of ['Eti', 'Ülker', 'Banvit']) {
  const product = buildCatalogProduct(
    makeRecord({ name: `${brand} Bilinmeyen Ürün 100 G`, brand, categories: [] }),
  );
  assert.equal(
    product.productGroupKey,
    'unclassified',
    `${brand} markası tek başına bir grup tetiklememeli`,
  );
}

// 3b) Marka adı adın İÇİNDE geçse de (ör. "Eti Cips"), marka çıkarıldıktan
// sonra kalan metin ("Cips") hâlâ doğru şekilde eşleşmeli — brand-stripping'in
// gerçek eşleşmeyi BOZMADIĞINI doğrular.
{
  const product = buildCatalogProduct(
    makeRecord({ name: 'Eti Cips 100 G', brand: 'Eti', categories: [] }),
  );
  assert.equal(product.productGroupKey, 'chips');
  assert.equal(product.productGroupSource, 'name');
}

// 4) Kelime sınırı: "Çikolata" kelimesi "cola" alt dizesini içerir
// (normalize edilince "cikolata" ⊃ "cola" DEĞİL — ama eski .includes()
// mantığıyla yanlışlıkla eşleşiyordu). "Sade Çikolata" ASLA 'cola' grubuna
// düşmemeli.
{
  const product = buildCatalogProduct(
    makeRecord({ name: 'Sade Çikolata 70 G', categories: [] }),
  );
  assert.notEqual(product.productGroupKey, 'cola', '"çikolata" kelimesi hiçbir zaman cola ile eşleşmemeli');
  assert.equal(product.productGroupKey, 'chocolate');
}

// 5) Restricted politika: bebek maması adı OFF'ta unclassified kalsa bile
// ad-tabanlı yol restricted gruplara (baby_formula/baby_cereal/baby_food)
// ASLA düşürmez — registry.ts'in alternativeEligibility:'disabled'
// kararını ad yoluyla delmez.
{
  const product = buildCatalogProduct(
    makeRecord({ name: 'Bebek Maması 400 g', categories: [] }),
  );
  assert.equal(
    product.productGroupKey,
    'unclassified',
    'restricted (bebek maması) grupları ad-tabanlı yol da atamamalı',
  );
}

// 6) Belirsiz/anlamsız ad: hiçbir grupla eşleşmeyen bir ad unclassified
// kalmalı — zorla bir gruba düşürülmemeli.
{
  const product = buildCatalogProduct(
    makeRecord({ name: 'Tamamen Belirsiz İthal Sos Karışımı', categories: [] }),
  );
  assert.equal(product.productGroupKey, 'unclassified');
}

console.log('CATALOG_PRODUCT_GROUP_FALLBACK_SMOKE_OK');
