/**
 * RafSkoru — Onaylı etiket → ProductFacts sözleşmesi (ADR-009 §4, §7a)
 * apps/backend/src/price/productFacts/verifiedLabelFacts.smoke.ts
 *
 * Korunan kurallar:
 *   - onaylı kayıt alerjen alanı ÜRETMEZ; birleştirme tabandaki alerjen
 *     alanlarına DOKUNMAZ
 *   - onaylı kayıttaki boş alan tabandaki değeri silmez
 *   - içindekiler çelişkisinde daha yeni tarihli onaylı kayıt geçerlidir ve
 *     çelişki döner
 *   - başka kaynaktan gelen her alan fieldSources içinde anılır
 *   - girdi nesneleri değiştirilmez; farklı barkodlar birleştirilmez
 *   - Nutri-Score yalnız ürün türü, birim ve zorunlu besinler biliniyorsa
 *     hesaplanır; aksi hâlde not üretilmez (tahmin yok)
 *   - etiketten hesaplanan not tabandaki notun yerine geçmez
 */
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../../catalog/catalog.js';
import type {
  LabelFields,
  LabelNutritionPer100,
  LabelProductKind,
  LabelProductKindSource,
  VerifiedLabelProduct,
} from '../../labelStore/types.js';
import type { ProductFacts } from './types.js';
import {
  deriveNutriScoreFromLabel,
  ingredientsMentionNonNutritiveSweetener,
  mergeVerifiedLabelIntoFacts,
  productFactsFromVerifiedLabel,
} from './verifiedLabelFacts.js';

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

function verified(
  fields: Partial<LabelFields>,
  extra: { observedAt?: string; kind?: LabelProductKind | null; kindSource?: LabelProductKindSource | null } = {},
): VerifiedLabelProduct {
  const kind = extra.kind ?? null;
  return {
    barcode: BARCODE,
    version: 1,
    fields: { ...emptyFields, ...fields },
    observedAt: extra.observedAt ?? '2026-11-10T09:30:00.000Z',
    photos: [{ slot: 'ingredients', ref: 'photos/x.jpg', attribution: null }],
    photoSource: 'intake',
    candidateId: 'aday-1',
    productKind: kind,
    productKindSource: kind === null ? null : (extra.kindSource ?? 'approver'),
    approvedBy: 'proje-sahibi',
    approvedAt: '2026-11-14T12:00:00.000Z',
    supersededAt: null,
  };
}

/** Bisküvi benzeri katı gıda: genel gıda kurallarıyla E çıkar (olumsuz puan 25). */
const biscuitPer100g: LabelNutritionPer100 = {
  basis: '100g',
  energyKcal: 480,
  fat: 22,
  saturatedFat: 12,
  carbohydrates: 62,
  sugars: 25,
  fiber: null,
  protein: 6,
  salt: 0.8,
};

/** Şekersiz gazlı içecek: tatlandırıcı varsa C, yoksa B. */
const dietDrinkPer100ml: LabelNutritionPer100 = {
  basis: '100ml',
  energyKcal: 1,
  fat: 0,
  saturatedFat: 0,
  carbohydrates: 0,
  sugars: 0,
  fiber: null,
  protein: 0,
  salt: 0.02,
};

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
  const { facts, nutriScore } = productFactsFromVerifiedLabel(
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
  assert.deepEqual(nutriScore, { status: 'skipped', reason: 'unknown_product_kind' });
  assert.equal(facts.nutriScoreGrade, null, 'ürün türü bilinmeden Nutri-Score üretilmemeli');
  assert.ok(facts.missingFields!.includes('nutriScoreGrade'));
  assert.ok(facts.missingFields!.includes('nutrition'));
  assert.equal(facts.novaGroup, null);
  assert.equal(facts.isComplete, false);
  assert.equal(facts.confidence, 'low', 'besin verisi kullanılamadığında güven düşük kalmalı');
  assert.ok(!facts.missingFields!.includes('ingredientsText'));
  assert.ok(!facts.missingFields!.includes('productName'));
}

// ── Yalnız onaylı kayıt: okunamayan alan eksik kalır ─────────────────────
{
  const { facts } = productFactsFromVerifiedLabel(verified({ productName: 'Tam Yağlı Süt' }));
  assert.equal(facts.ingredientsText, null);
  assert.ok(facts.missingFields!.includes('ingredientsText'));
  assert.equal(facts.confidence, 'low');
}

// ── Nutri-Score: tür + birim + zorunlu besinler tamsa hesaplanır ─────────
{
  const { facts, nutriScore } = productFactsFromVerifiedLabel(
    verified({ productName: 'Bisküvi', ingredientsText: 'Buğday unu, şeker, palm yağı', nutritionPer100: biscuitPer100g }, { kind: 'general' }),
  );

  assert.equal(nutriScore.status, 'derived');
  assert.equal(facts.nutriScoreGrade, 'E');
  if (nutriScore.status === 'derived') {
    assert.equal(nutriScore.derivation.category, 'general');
    assert.equal(nutriScore.derivation.categorySource, 'approver');
    assert.ok(nutriScore.derivation.assumptions.includes('fvl_assumed_0'), 'varsayım görünür kalmalı');
    assert.ok(nutriScore.derivation.assumptions.includes('fiber_assumed_0'), 'okunmayan lif varsayım olarak işaretlenmeli');
  }
  assert.ok(!facts.missingFields!.includes('nutriScoreGrade'));
  assert.ok(!facts.missingFields!.includes('nutrition'));
  assert.ok(facts.missingFields!.includes('novaGroup'), 'NOVA etiketten üretilmez');
  assert.ok(facts.missingFields!.includes('allergens'));
  assert.equal(facts.confidence, 'medium');
  assert.equal(facts.isComplete, false);
}

// ── Nutri-Score: koşul eksikse not üretilmez, neden döner ────────────────
{
  const general = { category: 'general', source: 'approver' } as const;
  const beverage = { category: 'beverage', source: 'approver' } as const;
  const withNutrition = (nutritionPer100: LabelNutritionPer100 | null, ingredientsText: string | null = 'Su') => ({
    ...emptyFields,
    ingredientsText,
    nutritionPer100,
  });

  assert.deepEqual(deriveNutriScoreFromLabel(withNutrition(biscuitPer100g), null), { status: 'skipped', reason: 'unknown_product_kind' });
  assert.deepEqual(deriveNutriScoreFromLabel(withNutrition(null), general), { status: 'skipped', reason: 'no_nutrition' });
  assert.deepEqual(
    deriveNutriScoreFromLabel(withNutrition({ ...biscuitPer100g, basis: null }), general),
    { status: 'skipped', reason: 'basis_unknown' },
    'birimi okunamayan tablo kullanılmamalı',
  );
  assert.deepEqual(
    deriveNutriScoreFromLabel(withNutrition({ ...biscuitPer100g, basis: '100ml' }), general),
    { status: 'skipped', reason: 'basis_mismatch' },
    '100 ml değerleri 100 g gibi puanlanmamalı',
  );
  assert.deepEqual(
    deriveNutriScoreFromLabel(withNutrition({ ...dietDrinkPer100ml, basis: '100g' }), beverage),
    { status: 'skipped', reason: 'basis_mismatch' },
  );
  assert.deepEqual(
    deriveNutriScoreFromLabel(withNutrition({ ...biscuitPer100g, protein: null }), general),
    { status: 'skipped', reason: 'insufficient_nutrients', missing: ['proteins'] },
    'okunamayan zorunlu besin 0 sayılmamalı',
  );
  assert.deepEqual(
    deriveNutriScoreFromLabel(withNutrition(biscuitPer100g), { category: 'not_applicable', source: 'approver' }),
    { status: 'skipped', reason: 'not_applicable' },
  );
  assert.deepEqual(
    deriveNutriScoreFromLabel(withNutrition(dietDrinkPer100ml, null), beverage),
    { status: 'skipped', reason: 'beverage_sweeteners_unknown' },
    'içindekiler okunmadan içecekte tatlandırıcı "yok" varsayılmamalı',
  );
}

// ── Nutri-Score: içecekte tatlandırıcı içindekiler metninden okunur ──────
{
  const beverage = { category: 'beverage', source: 'user_declared' } as const;
  const grade = (ingredientsText: string) => {
    const outcome = deriveNutriScoreFromLabel({ ...emptyFields, ingredientsText, nutritionPer100: dietDrinkPer100ml }, beverage);
    assert.equal(outcome.status, 'derived');
    return outcome.status === 'derived' ? outcome.derivation : null;
  };

  assert.equal(grade('Su, karbondioksit, aroma verici')!.grade, 'B');
  assert.equal(grade('Su, karbondioksit, tatlandırıcılar (aspartam, asesülfam K)')!.grade, 'C');
  assert.equal(grade('Su, karbondioksit, tatlandırıcı (E 955)')!.grade, 'C');
  assert.ok(
    !grade('Su, karbondioksit, aroma verici')!.assumptions.includes('sweeteners_assumed_absent'),
    'tatlandırıcı metinden okunduğunda "yok varsayıldı" işareti olmamalı',
  );
  assert.equal(grade('Su')!.categorySource, 'user_declared');

  for (const text of ['E950', 'e-951', 'E 952', 'SAKARİN', 'sukraloz', 'steviol glikozitler', 'Asesülfam K']) {
    assert.equal(ingredientsMentionNonNutritiveSweetener(text), true, `tatlandırıcı tanınmalı: ${text}`);
  }
  for (const text of ['şeker, sitrik asit (E330)', 'E9500', 'glikoz şurubu', 'tuz']) {
    assert.equal(ingredientsMentionNonNutritiveSweetener(text), false, `tatlandırıcı sanılmamalı: ${text}`);
  }
}

// ── Nutri-Score: su besin tablosu olmadan sınıflanır ─────────────────────
{
  const outcome = deriveNutriScoreFromLabel(emptyFields, { category: 'water', source: 'approver' });
  assert.equal(outcome.status, 'derived');
  assert.equal(outcome.status === 'derived' ? outcome.derivation.grade : null, 'A');
}

// ── Birleştirme: eksik içindekiler tamamlanır, alerjen alanları aynen kalır
{
  const base = offFacts();
  const snapshot = structuredClone(base);
  const { facts, conflicts, nutriScore } = mergeVerifiedLabelIntoFacts(
    base,
    verified({ productName: 'Tam Yağlı Süt 1 L', ingredientsText: 'Pastörize inek sütü' }),
  );

  assert.deepEqual(base, snapshot, 'taban nesnesi değiştirilmemeli');
  assert.deepEqual(conflicts, []);
  assert.equal(nutriScore.status, 'skipped');
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
  assert.equal(facts.nutriScoreGrade, 'B');
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

// ── Birleştirme: taban notu yoksa etiketten hesaplanan not tamamlar ──────
{
  const base = offFacts({
    productName: 'Bisküvi',
    nutriScoreGrade: null,
    missingFields: ['imageUrl', 'ingredientsText', 'nutrition', 'nutriScoreGrade'],
  });
  const { facts, conflicts, nutriScore } = mergeVerifiedLabelIntoFacts(
    base,
    verified({ ingredientsText: 'Buğday unu, şeker', nutritionPer100: biscuitPer100g }),
    { baseNutriScoreCategory: 'general' },
  );

  assert.deepEqual(conflicts, []);
  assert.equal(facts.nutriScoreGrade, 'E');
  assert.equal(nutriScore.status === 'derived' ? nutriScore.derivation.categorySource : null, 'off_category');
  assert.deepEqual(facts.fieldSources, {
    ingredientsText: { source: 'rafskoru_verified', observedAt: '2026-11-10T09:30:00.000Z' },
    nutriScoreGrade: { source: 'rafskoru_verified', observedAt: '2026-11-10T09:30:00.000Z' },
  });
  assert.deepEqual(facts.missingFields, ['imageUrl']);
  assert.deepEqual(facts.catalogAllergenData, base.catalogAllergenData);
  assert.equal(facts.confidence, 'medium', 'güven birleştirmeyle yükseltilmemeli');
}

// ── Birleştirme: tür hiçbir yerden bilinmiyorsa not üretilmez ────────────
{
  const base = offFacts({ nutriScoreGrade: null, missingFields: ['imageUrl', 'nutriScoreGrade'] });
  const { facts, nutriScore } = mergeVerifiedLabelIntoFacts(base, verified({ nutritionPer100: biscuitPer100g }));
  assert.deepEqual(nutriScore, { status: 'skipped', reason: 'unknown_product_kind' });
  assert.equal(facts.nutriScoreGrade, null);
  assert.deepEqual(facts.missingFields, ['imageUrl', 'nutriScoreGrade']);
  assert.equal(facts.fieldSources, undefined);
}

// ── Ürün türü önceliği: onaylayan > OFF kategorisi > kullanıcı beyanı ────
{
  const base = offFacts({ nutriScoreGrade: null, missingFields: ['imageUrl', 'nutriScoreGrade'] });
  const drink = { ingredientsText: 'Su, karbondioksit', nutritionPer100: dietDrinkPer100ml };

  const approver = mergeVerifiedLabelIntoFacts(base, verified(drink, { kind: 'beverage', kindSource: 'approver' }), {
    baseNutriScoreCategory: 'general',
  });
  assert.equal(
    approver.nutriScore.status === 'derived' ? approver.nutriScore.derivation.categorySource : null,
    'approver',
    'onaylayanın belirlediği tür OFF kategorisinin önüne geçmeli',
  );
  assert.equal(approver.facts.nutriScoreGrade, 'B');

  const userDeclared = mergeVerifiedLabelIntoFacts(base, verified(drink, { kind: 'beverage', kindSource: 'user_declared' }), {
    baseNutriScoreCategory: 'general',
  });
  assert.deepEqual(
    userDeclared.nutriScore,
    { status: 'skipped', reason: 'basis_mismatch' },
    'kullanıcı beyanı OFF kategorisinin önüne geçmemeli',
  );
  assert.equal(userDeclared.facts.nutriScoreGrade, null);

  const onlyUser = mergeVerifiedLabelIntoFacts(base, verified(drink, { kind: 'beverage', kindSource: 'user_declared' }));
  assert.equal(
    onlyUser.nutriScore.status === 'derived' ? onlyUser.nutriScore.derivation.categorySource : null,
    'user_declared',
    'OFF kategorisi yoksa kullanıcı beyanı kullanılmalı',
  );
}

// ── Birleştirme: taban notu varsa korunur, fark çelişki olarak döner ─────
{
  const base = offFacts({ ingredientsText: 'Buğday unu, şeker', missingFields: ['imageUrl'] });
  const { facts, conflicts } = mergeVerifiedLabelIntoFacts(
    base,
    verified({ nutritionPer100: biscuitPer100g }, { kind: 'general' }),
  );
  assert.equal(facts.nutriScoreGrade, 'B', 'etiketten hesaplanan not tabandaki notun yerine geçmemeli');
  assert.equal(facts.fieldSources, undefined);
  assert.deepEqual(conflicts, [
    {
      field: 'nutriScoreGrade',
      baseValue: 'B',
      verifiedValue: 'E',
      baseObservedAt: '2026-06-01T00:00:00.000Z',
      verifiedObservedAt: '2026-11-10T09:30:00.000Z',
      winner: 'base',
    },
  ]);

  const same = mergeVerifiedLabelIntoFacts(
    offFacts({ nutriScoreGrade: 'E', missingFields: ['imageUrl'] }),
    verified({ nutritionPer100: biscuitPer100g }, { kind: 'general' }),
  );
  assert.deepEqual(same.conflicts, [], 'aynı not çelişki sayılmamalı');
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
