/**
 * RafSkoru — contributionValidation smoke testi
 * src/localProduct/contributionValidation.smoke.ts
 */
import assert from 'node:assert/strict';

import { emptyUserContributedNutrition100g } from './types';
import { isContributionDraftValid, validateContributionDraft } from './contributionValidation';

// ── Zorunlu alanlar: yalnız barkod + ad ─────────────────────────────────────
{
  const issues = validateContributionDraft({
    gtin: null,
    name: null,
    nutrition100g: emptyUserContributedNutrition100g,
  });
  const codes = issues.map((i) => i.code);
  assert.ok(codes.includes('missing_gtin'));
  assert.ok(codes.includes('missing_name'));
}

// ── Fotoğraf/besin değeri olmadan, yalnız barkod+ad ile GEÇERLİ ────────────
{
  const ok = isContributionDraftValid({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: emptyUserContributedNutrition100g,
  });
  assert.equal(ok, true, 'barkod+ad yeterli olmalı, besin değeri zorunlu değil');
}

// ── Sayısal aralık dışı değer reddedilir ────────────────────────────────────
{
  const issues = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, sugars: 150 },
  });
  assert.ok(issues.some((i) => i.code === 'value_out_of_range' && i.field === 'sugars'));
}

// ── Toplam tutarlılık: yağ+karbonhidrat+protein+tuz <= 100g ─────────────────
{
  const exceeds = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, fat: 40, carbohydrates: 40, proteins: 20, salt: 5 },
  });
  assert.ok(exceeds.some((i) => i.code === 'total_exceeds_100g'), 'fat+carb+protein+salt=105 > 100 reddedilmeli');

  const withinLimit = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, fat: 30, carbohydrates: 30, proteins: 20, salt: 5 },
  });
  assert.ok(!withinLimit.some((i) => i.code === 'total_exceeds_100g'), 'toplam=85 <= 100 kabul edilmeli');
}

// ── Doymuş yağ <= toplam yağ ─────────────────────────────────────────────
{
  const invalid = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, fat: 5, saturatedFat: 10 },
  });
  assert.ok(invalid.some((i) => i.code === 'saturated_fat_exceeds_fat'));

  const valid = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, fat: 10, saturatedFat: 5 },
  });
  assert.ok(!valid.some((i) => i.code === 'saturated_fat_exceeds_fat'));
}

// ── Şeker <= toplam karbonhidrat ─────────────────────────────────────────
{
  const invalid = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, carbohydrates: 10, sugars: 20 },
  });
  assert.ok(invalid.some((i) => i.code === 'sugars_exceeds_carbohydrates'));

  const valid = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, carbohydrates: 20, sugars: 10 },
  });
  assert.ok(!valid.some((i) => i.code === 'sugars_exceeds_carbohydrates'));
}

// ── Kısmi doldurma: eksik alan varsa tutarlılık kuralı sessizce atlanır ─────
{
  const partial = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, sugars: 40 }, // carbohydrates yok
  });
  assert.ok(!partial.some((i) => i.code === 'sugars_exceeds_carbohydrates'));
}

// ── Ondalık yuvarlama toleransı: tam sınırda reddedilmemeli ─────────────────
{
  const boundary = validateContributionDraft({
    gtin: '8690000000001',
    name: 'Test Ürün',
    nutrition100g: { ...emptyUserContributedNutrition100g, fat: 25, carbohydrates: 25, proteins: 25, salt: 25 },
  });
  assert.ok(!boundary.some((i) => i.code === 'total_exceeds_100g'), 'tam 100g sınırda reddedilmemeli');
}

console.log('CONTRIBUTION_VALIDATION_SMOKE_OK');
