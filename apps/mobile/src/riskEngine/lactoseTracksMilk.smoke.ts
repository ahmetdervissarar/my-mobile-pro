// P0-4: TGK Etiketleme Yönetmeliği — "süt ve süt ürünleri (laktoz dahil)".
// Laktoz OFF'ta ayrı bir kanonik etiket olmadığından SÜTÜN DURUMUNU İZLER.
// Bkz. görev onayı: milk declared→lactose declared (ama rozet/not "laktoz
// içerir" DEMEZ); milk trace→lactose trace; present+milk-yok→lactose
// not_listed; veri yok→ikisi de no_data; ingredients "laktoz"→ayrıca uyarı
// (bilinen "laktozsuz" yanlış pozitifiyle birlikte, bkz. ADR-004).
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../api/catalogTypes';
import type { UserSensitivityProfile } from '../userProfile/userProfileTypes';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel } from './catalogAllergenChip';

function data(overrides: Partial<CatalogAllergenData>): CatalogAllergenData {
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

function profile(allergens: UserSensitivityProfile['allergens']): UserSensitivityProfile {
  return { allergens, chronicSensitivities: [], healthPreferences: [] };
}

function lactosePerKey(evaluation: ReturnType<typeof evaluateCatalogAllergenDataForProfile>) {
  const result = evaluation.perKey.find((k) => k.key === 'lactose');
  assert.ok(result, 'lactose perKey sonucu bulunmalı');
  return result!;
}

// 1) Dost %3.1 Yağlı Süt tipi — declared=milk. Lactose 'declared' seviyesine
// yükselir AMA not/rozet metni "laktoz içerir" DEMEZ.
{
  const dost = data({ declared: ['milk'] });
  const evaluation = evaluateCatalogAllergenDataForProfile(dost, profile(['lactose']));
  const lactose = lactosePerKey(evaluation);
  assert.equal(lactose.status, 'declared_contains');
  assert.equal(lactose.basis, 'declared');
  assert.ok(!lactose.note?.toLocaleLowerCase('tr-TR').includes('laktoz içerir'), 'not "laktoz içerir" DEMEMELİ');

  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);
  assert.ok(displayInfo);
  assert.equal(displayInfo!.level, 'declared');
  assert.ok(!displayInfo!.text.toLocaleLowerCase('tr-TR').includes('laktoz'), `rozet "laktoz" İÇERMEMELİ: "${displayInfo!.text}"`);
  assert.equal(displayInfo!.text, 'Süt içerir (beyan)');
}

// 2) Arbella Makarna tipi — present, milk declared/traces'ta YOK (ör. buğday
// ürünü, süt beyanı hiç yok). Lactose not_listed_in_available_data olmalı
// (önceki davranışta yanlışlıkla unknown_or_unverified'a düşüyordu).
{
  const arbella = data({ declared: ['gluten_wheat'], dataStatus: 'present' });
  const evaluation = evaluateCatalogAllergenDataForProfile(arbella, profile(['lactose']));
  const lactose = lactosePerKey(evaluation);
  assert.equal(lactose.status, 'not_listed_in_available_data');
  assert.equal(lactose.basis, 'not_listed');
}

// 3) Etiketsiz ürün (dataStatus unknown_or_unverified, milk hiç bilinmiyor)
// → milk VE lactose İKİSİ DE no_data olmalı.
{
  const unlabeled = data({ dataStatus: 'unknown_or_unverified' });
  const evaluation = evaluateCatalogAllergenDataForProfile(unlabeled, profile(['milk', 'lactose']));
  const milk = evaluation.perKey.find((k) => k.key === 'milk')!;
  const lactose = lactosePerKey(evaluation);
  assert.equal(milk.basis, 'no_data');
  assert.equal(lactose.basis, 'no_data');
  assert.equal(milk.status, 'unknown_or_unverified');
  assert.equal(lactose.status, 'unknown_or_unverified');
}

// 4) milk trace → lactose trace (mirror), rozet "laktoz" içermez.
{
  const traceMilk = data({ traces: ['milk'] });
  const evaluation = evaluateCatalogAllergenDataForProfile(traceMilk, profile(['lactose']));
  const lactose = lactosePerKey(evaluation);
  assert.equal(lactose.status, 'trace_may_contain');
  assert.equal(lactose.basis, 'trace');
  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);
  assert.equal(displayInfo!.text, 'Eser miktarda süt içerebilir');
}

// 5) İçindekilerde "laktoz" geçiyorsa (milk sinyali yokken) ayrıca uyarı —
// basis 'ingredients', status trace_may_contain.
{
  const withIngredients = data({
    dataStatus: 'present',
    ingredientsEvidence: { text: 'laktoz içerir', lang: 'tr', source: 'off' },
  });
  const evaluation = evaluateCatalogAllergenDataForProfile(withIngredients, profile(['lactose']));
  const lactose = lactosePerKey(evaluation);
  assert.equal(lactose.status, 'trace_may_contain');
  assert.equal(lactose.basis, 'ingredients');
}

// 6) BİLİNEN yanlış pozitif: "laktozsuz" (lactose-free) metni de riskEngine'in
// naif alt-dizge eşleşmesi yüzünden "laktoz" uyarısını TETİKLER. Bu, D1'in
// temkinli yönünde kabul edilen bir davranıştır (fazla uyarmak az uyarmaktan
// güvenlidir) — riskEngine'in kelime listesine DOKUNULMAZ (bkz. ADR-004).
{
  const lactoseFree = data({
    dataStatus: 'present',
    ingredientsEvidence: { text: 'laktozsuz süt tozu içerir', lang: 'tr', source: 'off' },
  });
  const evaluation = evaluateCatalogAllergenDataForProfile(lactoseFree, profile(['lactose']));
  const lactose = lactosePerKey(evaluation);
  assert.equal(
    lactose.basis,
    'ingredients',
    'BİLİNEN yanlış pozitif: "laktozsuz" metni "laktoz" alt dizgesini içerdiği için uyarı tetikler (kabul edilen, temkinli yön)',
  );
}

// 7) Eşit seviyede sıra: milk VE lactose aynı worst seviyede iken rozette
// süt laktozdan ÖNCE gösterilir (alerji > intolerans).
{
  const bothDeclared = data({ declared: ['milk'] });
  const evaluation = evaluateCatalogAllergenDataForProfile(bothDeclared, profile(['lactose', 'milk']));
  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);
  assert.ok(displayInfo);
  // Her ikisi de basis='declared' ve label='Süt'e mirror olduğundan dedupe
  // sonrası tek "Süt" kalır — çift "Süt, Süt" YAZILMAZ.
  assert.equal(displayInfo!.text, 'Süt içerir (beyan)');
}

// 8) no_data seviyesinde süt+laktoz birlikte: sıra süt önce, tek ":" değil
// parantezli biçim, çift ":" YOK.
{
  const noData = data({ dataStatus: 'unknown_or_unverified' });
  const evaluation = evaluateCatalogAllergenDataForProfile(noData, profile(['lactose', 'milk']));
  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);
  assert.ok(displayInfo);
  assert.equal(displayInfo!.level, 'no_data');
  assert.equal(displayInfo!.text, 'Alerjen verisi yok (süt, laktoz) — etiketi kontrol edin');
  assert.equal((displayInfo!.text.match(/:/g) ?? []).length, 0, 'no_data rozet metninde ":" olmamalı');
}

console.log('LACTOSE_TRACKS_MILK_SMOKE_OK (8 senaryo)');
