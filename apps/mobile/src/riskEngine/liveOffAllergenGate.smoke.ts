/**
 * RafSkoru — Canlı OFF Yolunda Alerjen Kapısı (P0-1, feat/v2-catalog)
 * src/riskEngine/liveOffAllergenGate.smoke.ts
 *
 * Kanıt senaryosu: profil {milk}, canlı OFF verisi KISMİ (ingredients var,
 * nutriScore yok). Backend'in openFoodFactsAdapter.smoke.ts'in ürettiğiyle
 * BİREBİR aynı CatalogAllergenData şekli kullanılır — bu test, o şeklin
 * arama/sepetle AYNI birleştirme fonksiyonundan geçtiğinde gerçekten bir
 * uyarı (declared_contains) ürettiğini kanıtlar.
 */
import assert from 'node:assert/strict';

import { evaluateCatalogAllergenDataForProfile } from './catalogAllergenChip';
import type { CatalogAllergenData } from '../api/catalogTypes';
import { emptyUserSensitivityProfile } from '../userProfile/userProfileTypes';

// backend openFoodFactsAdapter.smoke.ts'teki "kısmi canlı OFF" senaryosuyla
// BİREBİR aynı: ingredients var, nutriScore yok, süt beyanı var.
const partialLiveOffAllergenData: CatalogAllergenData = {
  declared: ['milk'],
  traces: [],
  recognizedUnmodeled: [],
  rawUnmapped: [],
  dataStatus: 'present',
  ingredientsEvidence: { text: 'süt, şeker, aroma verici', lang: null, source: 'off' },
};

const evaluation = evaluateCatalogAllergenDataForProfile(partialLiveOffAllergenData, {
  ...emptyUserSensitivityProfile,
  allergens: ['milk'],
});

assert.equal(
  evaluation.status,
  'declared_contains',
  'kısmi canlı OFF verisinde süt beyanı, profildeki süt alerjisiyle eşleşip uyarı üretmeli',
);

// Karşı-kanıt: nutriScore eksikliği hiçbir şekilde alerjen sonucunu YUMUŞATMAZ —
// aynı veriyle, profilde OLMAYAN bir alerjen için sonuç 'unknown_or_unverified'
// değil, katalogla AYNI kural: present + declared'da yoksa 'not_listed_in_available_data'.
const evaluationForOtherAllergen = evaluateCatalogAllergenDataForProfile(partialLiveOffAllergenData, {
  ...emptyUserSensitivityProfile,
  allergens: ['peanut'],
});
assert.equal(evaluationForOtherAllergen.status, 'not_listed_in_available_data');

console.log('LIVE_OFF_ALLERGEN_GATE_SMOKE_OK');
