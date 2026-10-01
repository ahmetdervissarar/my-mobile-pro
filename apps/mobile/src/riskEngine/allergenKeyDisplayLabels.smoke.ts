/**
 * RafSkoru — Ham alerjen anahtarları TR etiketlensin testi (device test 30
 * Eylül, D1)
 * src/riskEngine/allergenKeyDisplayLabels.smoke.ts
 *
 * Cihaz raporu: "egg, gluten_wheat, milk, tree_nuts, peanut" gibi ham
 * kanonik anahtarlar kullanıcıya doğrudan gösteriliyordu. Bu test, profil
 * ekranındaki AYNI 10 etiketin + modellenmemiş 4 zorunlu alerjenin doğru
 * eşlendiğini ve tanınmayan değerlerin OLDUĞU GİBİ (veri kaybı olmadan)
 * kaldığını doğrular.
 */
import assert from 'node:assert/strict';

import { allergenOptions } from '../userProfile/userProfileTypes';
import { getAllergenKeyDisplayLabel, mapAllergenKeysToDisplayLabels } from './catalogAllergenChip';

// ── Profil ekranındaki 10 anahtar — BİREBİR AYNI etiketler ──────────────────
for (const option of allergenOptions) {
  assert.equal(
    getAllergenKeyDisplayLabel(option.key),
    option.label,
    `${option.key} profil ekranıyla aynı etikete sahip olmalı`,
  );
}

// ── Cihaz raporundaki tam örnek ───────────────────────────────────────────
assert.deepEqual(
  mapAllergenKeysToDisplayLabels(['egg', 'gluten_wheat', 'milk', 'tree_nuts', 'peanut']),
  ['Yumurta', 'Gluten / Buğday', 'Süt', 'Fındık / Ağaç yemişleri', 'Fıstık'],
);

// ── Modellenmemiş zorunlu alerjenler (bare ve OFF 'en:' biçimi) ─────────────
assert.equal(getAllergenKeyDisplayLabel('celery'), 'kereviz');
assert.equal(getAllergenKeyDisplayLabel('en:celery'), 'kereviz');
assert.equal(getAllergenKeyDisplayLabel('mustard'), 'hardal');
assert.equal(getAllergenKeyDisplayLabel('en:mustard'), 'hardal');
assert.equal(getAllergenKeyDisplayLabel('sulphites'), 'sülfür dioksit ve sülfitler');
assert.equal(getAllergenKeyDisplayLabel('en:sulphur-dioxide-and-sulphites'), 'sülfür dioksit ve sülfitler');
assert.equal(getAllergenKeyDisplayLabel('lupin'), 'acı bakla (lupin)');
assert.equal(getAllergenKeyDisplayLabel('en:lupin'), 'acı bakla (lupin)');

// ── Tanınmayan değer OLDUĞU GİBİ kalır (veri gizlenmez/kaybolmaz) ───────────
assert.equal(getAllergenKeyDisplayLabel('Alerjen beyanı yok'), 'Alerjen beyanı yok');
assert.equal(getAllergenKeyDisplayLabel('unknown_future_key'), 'unknown_future_key');

console.log('ALLERGEN_KEY_DISPLAY_LABELS_SMOKE_OK');
