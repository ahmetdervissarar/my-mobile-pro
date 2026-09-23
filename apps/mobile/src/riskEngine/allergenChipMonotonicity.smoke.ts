// Özellik testi (P0 güvenlik kapısı) — profil anahtarı eklemek çip sonucunu
// ASLA hafifletmemeli. "Çoklu profil birleştirme hatası" (bkz. görev raporu:
// profil {milk} → İçerir, profil {milk,lactose} → yanlışlıkla İçerebilir'e
// düşüyordu) için özellik-tabanlı regresyon koruması.
//
// Beklenen ciddiyet sırası (küçük sayı = daha ciddi), KULLANICI TARAFINDAN
// belirtildiği gibi, implementasyondaki SEVERITY_RANK'tan BAĞIMSIZ olarak
// burada ayrıca tanımlanır — böylece iki yerde aynı hata yapılırsa bile bu
// test yakalar:
//   declared_contains > içindekiler eşleşmesi (trace_may_contain'e
//   yükseltilir) > trace_may_contain > unknown_or_unverified >
//   not_listed_in_available_data
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../api/catalogTypes';
import type { AllergenBannerStatus, AllergenDisplayLevel } from '../ui/AllergenBanner';
import type { AllergenKey, UserSensitivityProfile } from '../userProfile/userProfileTypes';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel, getCatalogAllergenChipStatus } from './catalogAllergenChip';

const EXPECTED_RANK: Record<AllergenBannerStatus, number> = {
  declared_contains: 0,
  trace_may_contain: 1,
  unknown_or_unverified: 2,
  not_listed_in_available_data: 3,
};

// P1: basis/seviye sırası — declared > ingredients > trace > no_data > not_listed
// (KULLANICI TARAFINDAN belirtildiği gibi, implementasyondaki DISPLAY_LEVEL_RANK'tan
// BAĞIMSIZ olarak burada ayrıca tanımlanır).
const EXPECTED_LEVEL_RANK: Record<AllergenDisplayLevel, number> = {
  declared: 0,
  ingredients: 1,
  trace: 2,
  no_data: 3,
  not_listed: 4,
};

function displayLevelFor(data: CatalogAllergenData, profile: UserSensitivityProfile): AllergenDisplayLevel {
  const evaluation = evaluateCatalogAllergenDataForProfile(data, profile);
  const displayInfo = getAllergenDisplayLevel(evaluation.perKey);
  assert.ok(displayInfo, 'profil dolu iken getAllergenDisplayLevel null dönemez');
  return displayInfo!.level;
}

const ALL_KEYS: AllergenKey[] = [
  'egg', 'milk', 'lactose', 'gluten_wheat', 'soy', 'peanut', 'tree_nuts', 'sesame', 'fish', 'shellfish',
];

function baseData(overrides: Partial<CatalogAllergenData>): CatalogAllergenData {
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

function profileFor(keys: AllergenKey[]): UserSensitivityProfile {
  return { allergens: keys, chronicSensitivities: [], healthPreferences: [] };
}

// Kullanıcının bildirdiği tam senaryo: Dost %3.1 Yağlı Süt (declared=milk).
const dostSut = baseData({ declared: ['milk'] });

// Temsili senaryolar — her biri farklı bir tekil-anahtar durum karışımı üretir.
const SCENARIOS: { name: string; data: CatalogAllergenData }[] = [
  { name: 'declared=milk', data: dostSut },
  { name: 'traces=milk', data: baseData({ traces: ['milk'] }) },
  { name: 'present, hiçbiri eşleşmiyor', data: baseData({}) },
  { name: 'unknown_or_unverified', data: baseData({ dataStatus: 'unknown_or_unverified' }) },
  { name: 'partial', data: baseData({ dataStatus: 'partial', rawUnmapped: ['en:some-unknown-tag'] }) },
  {
    name: 'ingredients eşleşmesi (milk)',
    data: baseData({ ingredientsEvidence: { text: 'süt proteini içerir', lang: 'tr', source: 'off' } }),
  },
];

function* nonEmptySubsets<T>(items: T[]): Generator<T[]> {
  const n = items.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset: T[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(items[i]!);
    }
    yield subset;
  }
}

let checkedSubsets = 0;

for (const { name, data } of SCENARIOS) {
  // Her anahtarın TEK BAŞINA ürettiği durumu bir kez hesapla.
  const singleKeyStatus = new Map<AllergenKey, AllergenBannerStatus>();
  const singleKeyLevel = new Map<AllergenKey, AllergenDisplayLevel>();
  for (const key of ALL_KEYS) {
    singleKeyStatus.set(key, getCatalogAllergenChipStatus(data, profileFor([key])).status);
    singleKeyLevel.set(key, displayLevelFor(data, profileFor([key])));
  }

  for (const subset of nonEmptySubsets(ALL_KEYS)) {
    const actual = getCatalogAllergenChipStatus(data, profileFor(subset)).status;
    const expectedRank = Math.min(...subset.map((k) => EXPECTED_RANK[singleKeyStatus.get(k)!]));
    assert.equal(
      EXPECTED_RANK[actual],
      expectedRank,
      `[${name}] profil={${subset.join(',')}}: beklenen sıra ${expectedRank} (en ciddi tekil anahtar), gelen "${actual}" (sıra ${EXPECTED_RANK[actual]})`,
    );

    const actualLevel = displayLevelFor(data, profileFor(subset));
    const expectedLevelRank = Math.min(...subset.map((k) => EXPECTED_LEVEL_RANK[singleKeyLevel.get(k)!]));
    assert.equal(
      EXPECTED_LEVEL_RANK[actualLevel],
      expectedLevelRank,
      `[${name}] profil={${subset.join(',')}}: beklenen seviye sırası ${expectedLevelRank} (en ciddi tekil anahtar), gelen "${actualLevel}" (sıra ${EXPECTED_LEVEL_RANK[actualLevel]})`,
    );
    checkedSubsets++;
  }

  // Monotonluk: S ⊂ T ise rank(T) <= rank(S) — bir anahtar eklemek asla hafifletmez.
  for (const subset of nonEmptySubsets(ALL_KEYS)) {
    if (subset.length === ALL_KEYS.length) continue;
    const remaining = ALL_KEYS.filter((k) => !subset.includes(k));
    const extraKey = remaining[0]!;
    const superset = [...subset, extraKey];

    const statusSubset = getCatalogAllergenChipStatus(data, profileFor(subset)).status;
    const statusSuperset = getCatalogAllergenChipStatus(data, profileFor(superset)).status;

    assert.ok(
      EXPECTED_RANK[statusSuperset] <= EXPECTED_RANK[statusSubset],
      `[${name}] MONOTONLUK İHLALİ: {${subset.join(',')}}→"${statusSubset}" iken {${superset.join(',')}}→"${statusSuperset}" — anahtar eklemek hafifletti`,
    );

    const levelSubset = displayLevelFor(data, profileFor(subset));
    const levelSuperset = displayLevelFor(data, profileFor(superset));

    assert.ok(
      EXPECTED_LEVEL_RANK[levelSuperset] <= EXPECTED_LEVEL_RANK[levelSubset],
      `[${name}] SEVİYE MONOTONLUK İHLALİ: {${subset.join(',')}}→"${levelSubset}" iken {${superset.join(',')}}→"${levelSuperset}" — anahtar eklemek hafifletti`,
    );
  }
}

// Kullanıcının bildirdiği tam senaryo — açık regresyon kanıtı.
const r1 = getCatalogAllergenChipStatus(dostSut, profileFor(['milk']));
assert.equal(r1.status, 'declared_contains');
const r2 = getCatalogAllergenChipStatus(dostSut, profileFor(['milk', 'lactose']));
assert.equal(r2.status, 'declared_contains', 'profile={milk,lactose}: declared_contains KALMALI (İçerir)');
assert.ok(r2.note?.toLocaleLowerCase('tr-TR').includes('laktoz'), 'lactose notu declared_contains yanında da görünmeli');
// TGK: milk declared iken lactose de declared'a yükselir ama not metni
// "laktoz içerir" gibi laktozun kendisi hakkında kesin bir iddia ETMEZ.
assert.ok(!r2.note?.toLocaleLowerCase('tr-TR').includes('laktoz içerir'), 'not metni "laktoz içerir" DEMEMELİ (TGK kuralı)');

console.log(`MOBILE_ALLERGEN_CHIP_MONOTONICITY_SMOKE_OK (${SCENARIOS.length} senaryo × ${checkedSubsets / SCENARIOS.length} alt küme)`);
