/**
 * RafSkoru — celiac_gluten / gluten_wheat Davranış Eşdeğerliği
 * src/riskEngine/celiacGlutenParity.smoke.ts
 *
 * Amaç: celiac_gluten kronik anahtarının, gluten_wheat allerjeninin TÜM
 * davranışını (beyan eşleşmesi + veri-yok kapısı dahil) devraldığını
 * kanıtlamak — ADR-005/ADR-006, riskEngine.ts "effectiveAllergens".
 * İki profil için üretilen warnings listesi BİREBİR aynı olmalıdır.
 */
import assert from 'node:assert/strict';

import { evaluateProductRisks } from './riskEngine';
import type { ProductRiskInput } from './riskEngine';

function codesOf(input: ProductRiskInput): string[] {
  return evaluateProductRisks(input).warnings.map((warning) => warning.code);
}

// ── Senaryo A: gluten beyanlı ürün ──────────────────────────────────────────
const glutenDeclaredProduct: Omit<ProductRiskInput, 'userProfile'> = {
  name: 'tam buğdaylı kraker',
  ingredients: 'tam buğday unu, bitkisel yağ, tuz, maya',
  allergenInfo: 'Gluten içerir.',
  allergens: ['gluten'],
  additives: [],
  novaGroup: null,
};

const viaAllergen = codesOf({
  ...glutenDeclaredProduct,
  userProfile: { allergens: ['gluten_wheat'], chronicSensitivities: [], healthPreferences: [] },
});

const viaCeliac = codesOf({
  ...glutenDeclaredProduct,
  userProfile: { allergens: [], chronicSensitivities: ['celiac_gluten'], healthPreferences: [] },
});

assert.deepEqual(
  viaCeliac,
  viaAllergen,
  'celiac_gluten, gluten beyanlı üründe gluten_wheat ile AYNI uyarıları üretmeli',
);
assert.deepEqual(viaAllergen, ['PROFILE_GLUTEN_ALLERGEN_MATCH']);

// ── Senaryo B: veri yok (içerik/alerjen bilgisi hiç yok) ────────────────────
const noDataProduct: Omit<ProductRiskInput, 'userProfile'> = {
  name: 'ev yapımı erişte',
  ingredients: null,
  allergenInfo: null,
  allergens: [],
  additives: [],
  novaGroup: null,
};

const viaAllergenNoData = codesOf({
  ...noDataProduct,
  userProfile: { allergens: ['gluten_wheat'], chronicSensitivities: [], healthPreferences: [] },
});

const viaCeliacNoData = codesOf({
  ...noDataProduct,
  userProfile: { allergens: [], chronicSensitivities: ['celiac_gluten'], healthPreferences: [] },
});

assert.deepEqual(
  viaCeliacNoData,
  viaAllergenNoData,
  'celiac_gluten, veri-yok durumunda da gluten_wheat ile AYNI uyarıları üretmeli (PROFILE_ALLERGEN_INFO_MISSING dahil)',
);
assert.deepEqual(viaAllergenNoData, ['PROFILE_ALLERGEN_INFO_MISSING', 'MISSING_INGREDIENTS']);

console.log('CELIAC_GLUTEN_PARITY_SMOKE_OK');
