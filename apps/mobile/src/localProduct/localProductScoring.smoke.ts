/**
 * RafSkoru — localProductScoring smoke testi
 * src/localProduct/localProductScoring.smoke.ts
 */
import assert from 'node:assert/strict';

import { emptyUserSensitivityProfile } from '../userProfile/userProfileTypes';
import { scoreLocalProduct } from './localProductScoring';
import type { UserContributedProduct } from './types';
import { emptyUserContributedNutrition100g } from './types';

function makeProduct(overrides: Partial<UserContributedProduct> = {}): UserContributedProduct {
  return {
    gtin: '8690000000099',
    name: 'Test katkı ürünü',
    brand: null,
    quantityText: null,
    ingredientsText: null,
    nutrition100g: emptyUserContributedNutrition100g,
    declaredAllergens: [],
    photos: { front: null, ingredients: null, nutrition: null },
    entryMethod: 'manual',
    dataSource: 'user_contributed',
    verified: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ── Yüksek tuz + sodyum hassasiyeti → PROFILE_TRAFFIC_LIGHT_HIGH_SALT ───────
{
  const product = makeProduct({
    name: 'ev yapımı turşu',
    nutrition100g: { ...emptyUserContributedNutrition100g, salt: 2.5 },
  });
  const { riskResult } = scoreLocalProduct(product, {
    ...emptyUserSensitivityProfile,
    chronicSensitivities: ['hypertension_sodium'],
  });
  const codes = riskResult.warnings.map((w) => w.code);
  assert.ok(codes.includes('PROFILE_TRAFFIC_LIGHT_HIGH_SALT'), `beklenen uyarı yok: ${codes.join(',')}`);
}

// ── Düşük tuz + sodyum hassasiyeti → uyarı YOK ──────────────────────────────
{
  const product = makeProduct({
    name: 'ev yapımı turşu',
    nutrition100g: { ...emptyUserContributedNutrition100g, salt: 0.1 },
  });
  const { riskResult } = scoreLocalProduct(product, {
    ...emptyUserSensitivityProfile,
    chronicSensitivities: ['hypertension_sodium'],
  });
  const codes = riskResult.warnings.map((w) => w.code);
  assert.ok(!codes.includes('PROFILE_TRAFFIC_LIGHT_HIGH_SALT'));
}

// ── Alerjen kapısı skorlama içinde de asla present'e çıkmaz ─────────────────
{
  const product = makeProduct({ declaredAllergens: ['peanut'] });
  const { allergenEvaluation } = scoreLocalProduct(product, {
    ...emptyUserSensitivityProfile,
    allergens: ['milk'], // kullanıcı fıstık işaretledi, profil süt soruyor
  });
  assert.equal(allergenEvaluation.status, 'unknown_or_unverified');
}

// ── İşaretlenen alerjen skorlama sonucunda görünür ──────────────────────────
{
  const product = makeProduct({ declaredAllergens: ['peanut'] });
  const { allergenEvaluation } = scoreLocalProduct(product, {
    ...emptyUserSensitivityProfile,
    allergens: ['peanut'],
  });
  assert.equal(allergenEvaluation.status, 'declared_contains');
}

console.log('LOCAL_PRODUCT_SCORING_SMOKE_OK');
