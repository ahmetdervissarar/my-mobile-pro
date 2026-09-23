/**
 * RafSkoru — localProductAllergenData smoke testi
 * src/localProduct/localProductAllergenData.smoke.ts
 *
 * Kanıtlamak istediği: kullanıcı katkısı ürünlerinde alerjen kapısı hiçbir
 * profil anahtarı için 'not_listed_in_available_data' (daha az temkinli,
 * "baktık yok") döndürmez — dataStatus asla 'present' olmadığından
 * işaretlenmemiş her anahtar 'unknown_or_unverified' kalır. İşaretlenen
 * anahtarlar ise gerçek beyan olarak ('declared_contains') hâlâ görünür.
 */
import assert from 'node:assert/strict';

import { evaluateCatalogAllergenDataForProfile } from '../riskEngine/catalogAllergenChip';
import { emptyUserSensitivityProfile } from '../userProfile/userProfileTypes';
import { userContributedProductToCatalogAllergenData } from './localProductAllergenData';
import type { UserContributedProduct } from './types';
import { emptyUserContributedNutrition100g } from './types';

function makeProduct(declaredAllergens: UserContributedProduct['declaredAllergens']): UserContributedProduct {
  return {
    gtin: '8690000000099',
    name: 'Test katkı ürünü',
    brand: null,
    quantityText: null,
    ingredientsText: 'yer fıstığı ezmesi, şeker',
    nutrition100g: emptyUserContributedNutrition100g,
    declaredAllergens,
    photos: { front: null, ingredients: null, nutrition: null },
    entryMethod: 'manual',
    dataSource: 'user_contributed',
    verified: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

// ── dataStatus asla 'present' değil ─────────────────────────────────────────
{
  const withAllergens = userContributedProductToCatalogAllergenData(makeProduct(['peanut', 'milk']));
  assert.equal(withAllergens.dataStatus, 'partial');

  const withoutAllergens = userContributedProductToCatalogAllergenData(makeProduct([]));
  assert.equal(withoutAllergens.dataStatus, 'unknown_or_unverified');
}

// ── İşaretlenmemiş alerjen: 'not_listed_in_available_data' DEĞİL,
//    'unknown_or_unverified' döner (present'e hiç çıkmadığının kanıtı) ─────
{
  const data = userContributedProductToCatalogAllergenData(makeProduct(['peanut']));
  const evaluation = evaluateCatalogAllergenDataForProfile(data, {
    ...emptyUserSensitivityProfile,
    allergens: ['milk'], // kullanıcı fıstık işaretledi ama profil süt soruyor
  });

  assert.equal(evaluation.status, 'unknown_or_unverified');
  assert.notEqual(evaluation.status, 'not_listed_in_available_data');
}

// ── İşaretlenen alerjen gerçek beyan olarak GÖRÜNMEYE devam eder ───────────
{
  const data = userContributedProductToCatalogAllergenData(makeProduct(['peanut']));
  const evaluation = evaluateCatalogAllergenDataForProfile(data, {
    ...emptyUserSensitivityProfile,
    allergens: ['peanut'],
  });

  assert.equal(evaluation.status, 'declared_contains');
}

// ── Hiç alerjen işaretlenmemiş ürün + boş profil: genel durum 'unknown_or_unverified' ─
{
  const data = userContributedProductToCatalogAllergenData(makeProduct([]));
  const evaluation = evaluateCatalogAllergenDataForProfile(data, emptyUserSensitivityProfile);
  assert.equal(evaluation.status, 'unknown_or_unverified');
}

console.log('LOCAL_PRODUCT_ALLERGEN_DATA_SMOKE_OK');
