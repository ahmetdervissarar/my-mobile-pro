/**
 * RafSkoru — Onaylı etiket → ProductFacts sözleşmesi (ADR-009 §4, §7a)
 * apps/backend/src/price/productFacts/verifiedLabelFacts.smoke.ts
 *
 * Korunan kurallar:
 *   - onaylı kayıt alerjen alanı ÜRETMEZ; birleştirme tabandaki alerjen
 *     alanlarına DOKUNMAZ
 *   - onaylı kayıttaki boş alan tabandaki değeri silmez
 *   - çelişkide daha yeni tarihli onaylı kayıt geçerlidir ve çelişki döner
 *   - başka kaynaktan gelen her alan fieldSources içinde anılır
 *   - girdi nesneleri değiştirilmez; farklı barkodlar birleştirilmez
 */
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../../catalog/catalog.js';
import type { LabelFields, VerifiedLabelProduct } from '../../labelStore/types.js';
import type { ProductFacts } from './types.js';
import { mergeVerifiedLabelIntoFacts, productFactsFromVerifiedLabel } from './verifiedLabelFacts.js';

const BARCODE = '8691004000022';

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

function verified(fields: Partial<LabelFields>, observedAt = '2026-11-10T09:30:00.000Z'): VerifiedLabelProduct {
  return {
    barcode: BARCODE,
    version: 1,
    fields: { ...emptyFields, ...fields },
    observedAt,
    photos: [{ slot: 'ingredients', ref: 'photos/x.jpg', attribution: null }],
    photoSource: 'intake',
    candidateId: 'aday-1',
    approvedBy: 'proje-sahibi',
    approvedAt: '2026-11-14T12:00:00.000Z',
    supersededAt: null,
  };
}

const catalogAllergenData: CatalogAllergenData = {
  declared: ['milk'],
  traces: ['tree_nuts'],
  recognizedUnmodeled: [],
  rawUnmapped: [],
  dataStatus: 'present',
  ingredientsEvidence: { text: null, lang: null, source: 'off' },
};

function offFacts(overrides: Partial<ProductFacts> = {}): ProductFacts {
  return {
    barcode: BARCODE,
    productName: 'Süt',
    imageUrl: null,
    nutriScoreGrade: 'B',
    novaGroup: 1,
    trafficLight: null,
    ingredientsText: null,
    allergens: ['milk'],
    traceAllergens: ['tree_nuts'],
    allergenInfo: { dataStatus: 'present', declaredAllergens: ['milk'], traceAllergens: ['tree_nuts'], source: 'off_structured' },
    catalogAllergenData,
    dataSource: 'off',
    isComplete: false,
    missingFields: ['imageUrl', 'ingredientsText'],
    confidence: 'medium',
    sourceUrl: 'https://world.openfoodfacts.org/product/8691004000022',
    observedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Yalnız onaylı kayıt: alerjen alanı üretilmez ─────────────────────────
{
  const facts = productFactsFromVerifiedLabel(
    verified({
      productName: 'Tam Yağlı Süt',
      ingredientsText: 'Pastörize inek sütü',
      allergenStatementText: 'Süt ürünüdür.',
      traceStatementText: 'Eser miktarda fındık içerebilir.',
    }),
  );

  assert.equal(facts.dataSource, 'rafskoru_verified');
  assert.equal(facts.barcode, BARCODE);
  assert.equal(facts.productName, 'Tam Yağlı Süt');
  assert.equal(facts.ingredientsText, 'Pastörize inek sütü');
  assert.equal(facts.observedAt, '2026-11-10T09:30:00.000Z', 'etiketin gözlem zamanı taşınmalı');
  assert.equal(facts.verifiedAt, '2026-11-14T12:00:00.000Z');
  assert.equal(facts.fieldSources, undefined, 'tek kaynaklı veride fieldSources olmamalı');

  // Etikette alerjen ifadesi OLSA BİLE yapılandırılmış alerjen verisi üretilmez.
  assert.deepEqual(facts.allergenInfo, { dataStatus: 'unknown', declaredAllergens: [], traceAllergens: [], source: 'none' });
  assert.equal(facts.allergens, undefined);
  assert.equal(facts.traceAllergens, undefined);
  assert.equal(facts.catalogAllergenData, undefined);
  assert.ok(facts.missingFields!.includes('allergens'), 'alerjen verisi eksik olarak işaretlenmeli');

  assert.equal(facts.additives, undefined, 'boş katkı listesi "katkısız" anlamına gelirdi; alan hiç olmamalı');
  assert.equal(facts.nutriScoreGrade, null, 'kategori bilinmeden Nutri-Score üretilmemeli');
  assert.equal(facts.novaGroup, null);
  assert.equal(facts.isComplete, false);
  assert.equal(facts.confidence, 'low', 'besin verisi kullanılmadığı sürece güven düşük kalmalı');
  assert.ok(!facts.missingFields!.includes('ingredientsText'));
  assert.ok(!facts.missingFields!.includes('productName'));
}

// ── Yalnız onaylı kayıt: okunamayan alan eksik kalır ─────────────────────
{
  const facts = productFactsFromVerifiedLabel(verified({ productName: 'Tam Yağlı Süt' }));
  assert.equal(facts.ingredientsText, null);
  assert.ok(facts.missingFields!.includes('ingredientsText'));
  assert.equal(facts.confidence, 'low');
}

// ── Birleştirme: eksik içindekiler tamamlanır, alerjen alanları aynen kalır
{
  const base = offFacts();
  const snapshot = structuredClone(base);
  const { facts, conflicts } = mergeVerifiedLabelIntoFacts(base, verified({ productName: 'Tam Yağlı Süt 1 L', ingredientsText: 'Pastörize inek sütü' }));

  assert.deepEqual(base, snapshot, 'taban nesnesi değiştirilmemeli');
  assert.deepEqual(conflicts, []);
  assert.equal(facts.dataSource, 'off', 'taban kaynağı korunmalı');
  assert.equal(facts.ingredientsText, 'Pastörize inek sütü');
  assert.deepEqual(facts.fieldSources, {
    ingredientsText: { source: 'rafskoru_verified', observedAt: '2026-11-10T09:30:00.000Z' },
  });
  assert.equal(facts.productName, 'Süt', 'taban adı varken onaylı ad onun yerine geçmemeli');
  assert.deepEqual(facts.missingFields, ['imageUrl']);
  assert.equal(facts.verifiedAt, '2026-11-14T12:00:00.000Z');
  assert.equal(facts.observedAt, '2026-06-01T00:00:00.000Z', 'tabanın gözlem zamanı korunmalı');

  assert.deepEqual(facts.allergenInfo, base.allergenInfo, 'allergenInfo değişmemeli');
  assert.deepEqual(facts.allergens, base.allergens);
  assert.deepEqual(facts.traceAllergens, base.traceAllergens);
  assert.deepEqual(facts.catalogAllergenData, base.catalogAllergenData, 'catalogAllergenData değişmemeli');
  assert.equal(facts.nutriScoreGrade, 'B');
  assert.equal(facts.novaGroup, 1);
  assert.equal(facts.confidence, 'medium', 'güven birleştirmeyle yükseltilmemeli');
  assert.equal(facts.isComplete, false);
}

// ── Birleştirme: eksik ad tamamlanır ─────────────────────────────────────
{
  const { facts } = mergeVerifiedLabelIntoFacts(
    offFacts({ productName: null, missingFields: ['productName', 'imageUrl', 'ingredientsText'] }),
    verified({ productName: 'Tam Yağlı Süt' }),
  );
  assert.equal(facts.productName, 'Tam Yağlı Süt');
  assert.deepEqual(facts.fieldSources, { productName: { source: 'rafskoru_verified', observedAt: '2026-11-10T09:30:00.000Z' } });
  assert.deepEqual(facts.missingFields, ['imageUrl', 'ingredientsText'], 'onaylı kayıtta olmayan alan eksik kalmalı');
}

// ── Onaylı kayıttaki boş alan tabandaki değeri silmez ────────────────────
{
  const base = offFacts({ ingredientsText: 'Süt', missingFields: ['imageUrl'] });
  const { facts, conflicts } = mergeVerifiedLabelIntoFacts(base, verified({}));
  assert.equal(facts.ingredientsText, 'Süt');
  assert.equal(facts.productName, 'Süt');
  assert.equal(facts.fieldSources, undefined);
  assert.equal(facts.verifiedAt, undefined, 'onaylı kayıttan alan alınmadıysa verifiedAt eklenmemeli');
  assert.deepEqual(conflicts, []);
}

// ── Aynı içerik (yazım/boşluk farkı) çelişki sayılmaz ────────────────────
{
  const base = offFacts({ ingredientsText: 'pastörize  İNEK sütü.', missingFields: ['imageUrl'] });
  const { facts, conflicts } = mergeVerifiedLabelIntoFacts(base, verified({ ingredientsText: 'Pastörize inek sütü' }));
  assert.deepEqual(conflicts, []);
  assert.equal(facts.ingredientsText, 'pastörize  İNEK sütü.', 'eşdeğer içerikte taban değeri korunmalı');
  assert.equal(facts.fieldSources, undefined);
}

// ── Çelişki: onaylı kayıt daha yeni → onaylı kayıt geçerli, çelişki döner ─
{
  const base = offFacts({ ingredientsText: 'Süt', missingFields: ['imageUrl'] });
  const { facts, conflicts } = mergeVerifiedLabelIntoFacts(base, verified({ ingredientsText: 'Süt, D vitamini' }));
  assert.equal(facts.ingredientsText, 'Süt, D vitamini');
  assert.deepEqual(facts.fieldSources, {
    ingredientsText: { source: 'rafskoru_verified', observedAt: '2026-11-10T09:30:00.000Z' },
  });
  assert.deepEqual(conflicts, [
    {
      field: 'ingredientsText',
      baseValue: 'Süt',
      verifiedValue: 'Süt, D vitamini',
      baseObservedAt: '2026-06-01T00:00:00.000Z',
      verifiedObservedAt: '2026-11-10T09:30:00.000Z',
      winner: 'verified',
    },
  ]);
  assert.deepEqual(facts.catalogAllergenData, base.catalogAllergenData, 'çelişkide de alerjen verisi değişmemeli');
}

// ── Çelişki: taban daha yeni → taban geçerli, çelişki yine döner ─────────
{
  const base = offFacts({ ingredientsText: 'Süt', missingFields: ['imageUrl'], observedAt: '2026-12-01T00:00:00.000Z' });
  const { facts, conflicts } = mergeVerifiedLabelIntoFacts(base, verified({ ingredientsText: 'Süt, D vitamini' }));
  assert.equal(facts.ingredientsText, 'Süt');
  assert.equal(facts.fieldSources, undefined);
  assert.equal(facts.verifiedAt, undefined);
  assert.equal(conflicts.length, 1, 'kaybeden taraf onaylı kayıt olsa da çelişki sessiz kalmamalı');
  assert.equal(conflicts[0]!.winner, 'base');
}

// ── Çelişki: tabanın tarihi yok → tarihli onaylı kayıt geçerli ───────────
{
  const base = offFacts({ ingredientsText: 'Süt', missingFields: ['imageUrl'], observedAt: null });
  const { facts, conflicts } = mergeVerifiedLabelIntoFacts(base, verified({ ingredientsText: 'Süt, D vitamini' }));
  assert.equal(facts.ingredientsText, 'Süt, D vitamini');
  assert.equal(conflicts[0]!.winner, 'verified');
  assert.equal(conflicts[0]!.baseObservedAt, null);
}

// ── Koruma: farklı barkod ve OFF dışı taban birleştirilmez ───────────────
assert.throws(
  () => mergeVerifiedLabelIntoFacts(offFacts({ barcode: '8690000000012' }), verified({ ingredientsText: 'Süt' })),
  /Farklı barkodlu/,
);
for (const dataSource of ['beta_inference', 'label_unverified', 'rafskoru_verified'] as const) {
  assert.throws(
    () => mergeVerifiedLabelIntoFacts(offFacts({ dataSource }), verified({ ingredientsText: 'Süt' })),
    /yalnız OFF tabanlı/,
    `${dataSource} tabanı birleştirilmemeli`,
  );
}

console.log('VERIFIED_LABEL_FACTS_SMOKE_OK');
