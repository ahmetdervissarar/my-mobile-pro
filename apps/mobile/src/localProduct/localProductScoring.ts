/**
 * RafSkoru — Kullanıcı Katkısı: Yerel Skorlama
 * src/localProduct/localProductScoring.ts
 *
 * Sorumluluk: onaylanmış bir UserContributedProduct'ı, katalog ürünleriyle
 * AYNI iki mekanizmadan geçirmek:
 *  1) evaluateProductRisks (riskEngine.ts) — genel/kronik uyarılar. Ham
 *     nutrition100g, main dalının riskEngine'i yalnız Traffic Light bandı
 *     kabul ettiğinden createTrafficLightNutrition ile bandlanır (aynı
 *     eşikler, arama/sepet/ürün sayfasıyla birebir aynı dosya).
 *  2) evaluateCatalogAllergenDataForProfile (catalogAllergenChip.ts) —
 *     alerjen kapısı. localProductAllergenData.ts'in ürettiği, dataStatus'ü
 *     asla 'present'e çıkmayan CatalogAllergenData ile.
 * İki mekanizma da DEĞİŞTİRİLMEDEN, olduğu gibi tüketilir.
 */

import { createTrafficLightNutrition } from '../nutrition/trafficLight';
import type { AllergenProfileEvaluation } from '../riskEngine/catalogAllergenChip';
import { evaluateCatalogAllergenDataForProfile } from '../riskEngine/catalogAllergenChip';
import { evaluateProductRisks } from '../riskEngine/riskEngine';
import type { ProductRiskResult } from '../riskEngine/riskEngine';
import type { UserSensitivityProfile } from '../userProfile/userProfileTypes';
import { userContributedProductToCatalogAllergenData } from './localProductAllergenData';
import type { UserContributedProduct } from './types';

export interface LocalProductScore {
  riskResult: ProductRiskResult;
  allergenEvaluation: AllergenProfileEvaluation;
}

export function scoreLocalProduct(
  product: UserContributedProduct,
  userProfile: UserSensitivityProfile,
): LocalProductScore {
  const trafficLight = createTrafficLightNutrition({
    fat: product.nutrition100g.fat,
    saturatedFat: product.nutrition100g.saturatedFat,
    sugars: product.nutrition100g.sugars,
    salt: product.nutrition100g.salt,
  });

  const riskResult = evaluateProductRisks({
    name: product.name,
    ingredients: product.ingredientsText,
    allergenInfo: null,
    // Kozmetik alan — güvenlik kararı BUNDAN türetilmez (bkz. productResult/
    // helpers.ts'teki aynı ilke). Gerçek alerjen kararı aşağıdaki
    // allergenEvaluation'dan gelir.
    allergens: [],
    additives: [],
    novaGroup: null,
    trafficLight,
    nutriScore: null,
    userProfile,
  });

  const allergenData = userContributedProductToCatalogAllergenData(product);
  const allergenEvaluation = evaluateCatalogAllergenDataForProfile(allergenData, userProfile);

  return { riskResult, allergenEvaluation };
}
