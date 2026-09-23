/**
 * RafSkoru — Kritik Profil-Alerjen Eşleşme Kodları
 * src/riskEngine/criticalAllergenCodes.ts
 *
 * riskEngine.ts'in PRIORITY_ORDER listesindeki alerjen eşleşme kodlarının
 * birebir aynısıdır. Bu dosya riskEngine.ts'e DOKUNMAZ; yalnızca birden
 * fazla ekranın (ürün sonucu, sepet) aynı kod listesini tekrar tanımlamadan
 * kullanabilmesi için ayrı bir sabit dosyasıdır. Karar mantığı içermez.
 */

export const CRITICAL_ALLERGEN_CODES = [
  'PROFILE_PEANUT_ALLERGEN_MATCH',
  'PROFILE_SOY_ALLERGEN_MATCH',
  'PROFILE_GLUTEN_ALLERGEN_MATCH',
  'PROFILE_MILK_ALLERGEN_MATCH',
  'PROFILE_LACTOSE_ALLERGEN_MATCH',
  'PROFILE_TREE_NUTS_ALLERGEN_MATCH',
  'PROFILE_SESAME_ALLERGEN_MATCH',
  'PROFILE_FISH_ALLERGEN_MATCH',
  'PROFILE_SHELLFISH_ALLERGEN_MATCH',
];
