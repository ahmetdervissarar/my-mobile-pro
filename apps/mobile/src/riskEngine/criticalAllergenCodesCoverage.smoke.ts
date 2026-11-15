/**
 * RafSkoru — Kritik alerjen kod listesi kapsamı
 * src/riskEngine/criticalAllergenCodesCoverage.smoke.ts
 *
 * Profildeki HER alerjen anahtarı için risk motorunun ürettiği eşleşme kodu
 * (PROFILE_*_ALLERGEN_MATCH) CRITICAL_ALLERGEN_CODES içinde olmalıdır; aksi
 * hâlde o alerjenin uyarısı ürün sayfasında kritik banda çıkmaz. Liste elle
 * tutulduğu için yumurta kodu eksik kalmıştı; bu test, profile yeni bir
 * alerjen eklendiğinde aynı eksiğin sessizce tekrarlanmasını engeller.
 *
 * Risk motoru bu testle DEĞİŞMEZ; yalnız çıktısı gözlenir.
 */
import assert from 'node:assert/strict';

import { getAllergenBannerData } from '../features/productResult/helpers';
import type { AllergenKey } from '../userProfile/userProfileTypes';
import { allergenOptions } from '../userProfile/userProfileTypes';
import { CRITICAL_ALLERGEN_CODES } from './criticalAllergenCodes';
import { evaluateProductRisks } from './riskEngine';

/** Her anahtar için içindekiler metninde o alerjeni açıkça anan bir örnek. */
const INGREDIENT_SAMPLES: Record<AllergenKey, string> = {
  egg: 'Buğday unu, yumurta, şeker',
  milk: 'Süt, şeker',
  lactose: 'Şeker, laktoz',
  gluten_wheat: 'Buğday unu, tuz',
  soy: 'Şeker, soya lesitini',
  peanut: 'Yer fıstığı, tuz',
  tree_nuts: 'Fındık, şeker',
  sesame: 'Susam, tuz',
  fish: 'Ton balığı, tuz',
  shellfish: 'Karides, tuz',
};

const profileKeys = allergenOptions.map((option) => option.key);

assert.deepEqual(
  [...profileKeys].sort(),
  Object.keys(INGREDIENT_SAMPLES).sort(),
  'profildeki her alerjen için bir örnek tanımlı olmalı (yeni alerjen eklendiyse buraya da ekleyin)',
);

for (const key of profileKeys) {
  const result = evaluateProductRisks({
    name: 'Test ürünü',
    ingredients: INGREDIENT_SAMPLES[key],
    allergens: [],
    additives: [],
    novaGroup: null,
    trafficLight: null,
    nutriScore: null,
    userProfile: { allergens: [key], chronicSensitivities: [], healthPreferences: [] },
  });

  const matchCodes = result.warnings
    .map((warning) => warning.code)
    .filter((code) => code.startsWith('PROFILE_') && code.endsWith('_ALLERGEN_MATCH'));

  assert.ok(matchCodes.length > 0, `${key}: içindekilerde açıkça geçen alerjen için eşleşme uyarısı üretilmeli`);

  for (const code of matchCodes) {
    assert.ok(CRITICAL_ALLERGEN_CODES.includes(code), `${key}: ${code} kritik kod listesinde olmalı`);
  }

  // Aynı uyarı ürün sayfasının kritik bandına ulaşmalı.
  const banner = getAllergenBannerData({ productFacts: null, riskWarnings: result.warnings });
  assert.ok(banner.criticalMatches.length > 0, `${key}: eşleşme uyarısı kritik banda çıkmalı`);
}

// Listede risk motorunun üretmediği, yanlış yazılmış bir kod olmamalı.
for (const code of CRITICAL_ALLERGEN_CODES) {
  assert.match(code, /^PROFILE_[A-Z_]+_ALLERGEN_MATCH$/, `${code} bir eşleşme kodu olmalı`);
}
assert.equal(new Set(CRITICAL_ALLERGEN_CODES).size, CRITICAL_ALLERGEN_CODES.length, 'listede yinelenen kod olmamalı');

// Kategoriye dayalı ihtiyat uyarısı eşleşme değildir; kritik sayılmaz.
assert.ok(!CRITICAL_ALLERGEN_CODES.includes('PROFILE_EGG_PRECAUTION'));

console.log('CRITICAL_ALLERGEN_CODES_COVERAGE_SMOKE_OK');
