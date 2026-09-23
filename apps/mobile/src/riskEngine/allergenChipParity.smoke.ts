// Parite smoke testi (P0 kapısı) — çip (catalogAllergenChip.ts) ile riskEngine.ts'in
// ingredients anahtar-kelime eşleştiricisi asla çelişmemeli: riskEngine bir alerjen
// için uyarı üretiyorsa, çip o alerjen için "not_listed_in_available_data" (Belirtilmemiş)
// DÖNEMEZ. Yalnız saf TS modülleri kullanır (react-native importu YOK); bu yüzden
// mobil paket.json'a dokunmadan backend'in tsx'iyle çalıştırılabilir:
//   cd apps/backend && npx tsx ../mobile/src/riskEngine/allergenChipParity.smoke.ts
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../api/catalogTypes';
import type { AllergenKey, UserSensitivityProfile } from '../userProfile/userProfileTypes';
import { getCatalogAllergenChipStatus } from './catalogAllergenChip';
import { evaluateProductRisks } from './riskEngine';

const ALL_ALLERGEN_KEYS: AllergenKey[] = [
  'egg',
  'milk',
  'lactose',
  'gluten_wheat',
  'soy',
  'peanut',
  'tree_nuts',
  'sesame',
  'fish',
  'shellfish',
];

// riskEngine.ts'in ÖZEL (dışa açık olmayan) anahtar kelime listelerinden gerçek
// eşleşen örnek metinler — dosyaya dokunmadan, yalnız okunarak alınmıştır.
const INGREDIENT_TEXT_FOR_KEY: Partial<Record<AllergenKey, string>> = {
  egg: 'yumurta içerir',
  milk: 'süt proteini içerir',
  lactose: 'laktoz içerir',
  gluten_wheat: 'buğday unu içerir',
  soy: 'soya lesitini içerir',
  peanut: 'yer fıstığı içerir',
  tree_nuts: 'fındık içerir',
  sesame: 'susam içerir',
  fish: 'balık içerir',
  shellfish: 'karides içerir',
};

function baseAllergenData(overrides: Partial<CatalogAllergenData>): CatalogAllergenData {
  return {
    declared: [],
    traces: [],
    recognizedUnmodeled: [],
    rawUnmapped: [],
    dataStatus: 'present',
    ingredientsEvidence: { text: null, lang: null, source: 'off' },
    ...overrides,
  };
}

function profileFor(key: AllergenKey): UserSensitivityProfile {
  return { allergens: [key], chronicSensitivities: [], healthPreferences: [] };
}

let scenarioCount = 0;

for (const key of ALL_ALLERGEN_KEYS) {
  const profile = profileFor(key);

  // A) declared
  {
    const data = baseAllergenData({ declared: [key], dataStatus: 'present' });
    const chip = getCatalogAllergenChipStatus(data, profile);
    assert.equal(chip.status, 'declared_contains', `${key}: declared → declared_contains bekleniyor`);
    scenarioCount++;
  }

  // B) trace
  {
    const data = baseAllergenData({ traces: [key], dataStatus: 'present' });
    const chip = getCatalogAllergenChipStatus(data, profile);
    assert.equal(chip.status, 'trace_may_contain', `${key}: trace → trace_may_contain bekleniyor`);
    scenarioCount++;
  }

  // C) partial (anahtar declared/traces'ta yok, başka bir etiket eşlenemedi)
  {
    const data = baseAllergenData({ dataStatus: 'partial', rawUnmapped: ['en:some-unknown-tag'] });
    const chip = getCatalogAllergenChipStatus(data, profile);
    assert.equal(chip.status, 'unknown_or_unverified', `${key}: partial → unknown_or_unverified bekleniyor`);
    scenarioCount++;
  }

  // D) unknown_or_unverified (hiç ham etiket yok)
  {
    const data = baseAllergenData({ dataStatus: 'unknown_or_unverified' });
    const chip = getCatalogAllergenChipStatus(data, profile);
    assert.equal(chip.status, 'unknown_or_unverified', `${key}: unknown → unknown_or_unverified bekleniyor`);
    scenarioCount++;
  }

  // E) present, anahtar listede yok, ingredients boş (baseline not_listed)
  {
    const data = baseAllergenData({ dataStatus: 'present' });
    const chip = getCatalogAllergenChipStatus(data, profile);
    // TGK: laktoz sütün durumunu izler — present + milk declared/traces'ta yoksa
    // lactose de not_listed_in_available_data olur (ör. Arbella Makarna: present,
    // milk yok → lactose not_listed). Bu, önceki "modellenmemiş anahtar tavanı
    // unknown_or_unverified'dır" istisnasının YERİNİ ALIR (görev onayı, madde 4).
    assert.equal(chip.status, 'not_listed_in_available_data', `${key}: present + listede-yok → not_listed bekleniyor`);
    scenarioCount++;
  }

  // F) yalnızca içindekilerde geçen (present, listede yok, ingredients'ta anahtar kelime var)
  {
    const ingredientsText = INGREDIENT_TEXT_FOR_KEY[key] ?? null;
    const data = baseAllergenData({
      dataStatus: 'present',
      ingredientsEvidence: { text: ingredientsText, lang: ingredientsText ? 'tr' : null, source: 'off' },
    });
    const chip = getCatalogAllergenChipStatus(data, profile);

    if (key === 'lactose') {
      assert.equal(chip.status, 'trace_may_contain', 'lactose: ingredients\'ta doğrudan "laktoz" geçiyor → yükseltilmeli');
    } else {
      assert.equal(chip.status, 'trace_may_contain', `${key}: ingredients'ta geçiyor → yükseltilmeli, not_listed KALAMAZ`);
    }
    scenarioCount++;

    // ─── PARİTE ÇEKİRDEĞİ ────────────────────────────────────────────────────
    // riskEngine bu ingredients metniyle bu anahtar için gerçekten bir uyarı
    // üretiyorsa çip AYNI ürün+profil için not_listed_in_available_data
    // DÖNEMEZ. Bu, riskEngine'in ÖZEL kelime listelerine dokunmadan, yalnız
    // onun dışa açık evaluateProductRisks() çıktısını okuyarak doğrulanır.
    if (ingredientsText) {
      const riskResult = evaluateProductRisks({ ingredients: ingredientsText, userProfile: profile });
      const riskEngineWarnsForKey = riskResult.warnings.length > 0;
      assert.ok(riskEngineWarnsForKey, `${key}: riskEngine test metniyle uyarı üretmiyor — örnek metin geçersiz`);
      assert.notEqual(
        chip.status,
        'not_listed_in_available_data',
        `PARİTE İHLALİ: riskEngine ${key} için uyarı üretiyor ama çip not_listed diyor`,
      );
    }
  }
}

console.log(`MOBILE_ALLERGEN_CHIP_PARITY_SMOKE_OK (${ALL_ALLERGEN_KEYS.length} anahtar × 6 durum, ${scenarioCount} temel senaryo)`);
