// P0-3 — Üç ekran tutarlılık testi: arama çipi, sepet çipi ve ürün sayfası
// banner'ı AYNI ürün + AYNI profil için AYNI en-ağır sonucu vermeli. Gerçek
// cihaz testinde bildirilen iki ürünle (bkz. görev raporu): Dost %3.1 (declared
// milk) ve Harras %1.5 (yalnızca içindekiler "inek sütü", declared/traces boş).
import assert from 'node:assert/strict';

import type { CatalogAllergenData } from '../api/catalogTypes';
import { getAllergenBannerDataFromCatalog } from '../features/productResult/helpers';
import type { UserSensitivityProfile } from '../userProfile/userProfileTypes';
import { evaluateCatalogAllergenDataForProfile, getAllergenDisplayLevel, getCatalogAllergenChipStatus } from './catalogAllergenChip';

function profileFor(allergens: UserSensitivityProfile['allergens']): UserSensitivityProfile {
  return { allergens, chronicSensitivities: [], healthPreferences: [] };
}

// Dost %3.1 Yağlı Süt — declared=milk.
const dostSut: CatalogAllergenData = {
  declared: ['milk'],
  traces: [],
  recognizedUnmodeled: [],
  rawUnmapped: [],
  dataStatus: 'present',
  ingredientsEvidence: { text: null, lang: null, source: 'off' },
};

// Harras %1.5 Yarım Yağlı Süt — hiç alerjen etiketi (declared/traces) YOK, yalnız
// içindekiler metninde "inek sütü" geçiyor (gerçek cihaz testinde bildirilen vaka).
const harrasSut: CatalogAllergenData = {
  declared: [],
  traces: [],
  recognizedUnmodeled: [],
  rawUnmapped: [],
  dataStatus: 'present',
  ingredientsEvidence: { text: 'inek sütü içerir', lang: 'tr', source: 'off' },
};

const CASES: { name: string; data: CatalogAllergenData; profile: UserSensitivityProfile['allergens']; expected: string }[] = [
  { name: 'Dost, profil={milk}', data: dostSut, profile: ['milk'], expected: 'declared_contains' },
  { name: 'Dost, profil={milk,lactose}', data: dostSut, profile: ['milk', 'lactose'], expected: 'declared_contains' },
  { name: 'Harras, profil={milk}', data: harrasSut, profile: ['milk'], expected: 'trace_may_contain' },
  { name: 'Harras, profil={milk,lactose}', data: harrasSut, profile: ['milk', 'lactose'], expected: 'trace_may_contain' },
];

for (const { name, data, profile, expected } of CASES) {
  const userProfile = profileFor(profile);

  // Ekran 1: arama önerisi çipi.
  const searchChip = getCatalogAllergenChipStatus(data, userProfile);
  // Ekran 2: sepet satırı çipi (BasketItemRow AYNI fonksiyonu çağırır).
  const basketChip = getCatalogAllergenChipStatus(data, userProfile);
  // Ekran 3: ürün sayfası banner'ı (getCatalogAllergenChipStatus'u DOĞRUDAN çağırmaz,
  // paylaşılan çekirdek evaluateCatalogAllergenDataForProfile üzerinden aynı sonuca ulaşır).
  const banner = getAllergenBannerDataFromCatalog({
    catalogAllergenData: data,
    userProfile,
    riskWarnings: [],
  });

  assert.equal(searchChip.status, expected, `[${name}] arama çipi: beklenen ${expected}, gelen ${searchChip.status}`);
  assert.equal(basketChip.status, expected, `[${name}] sepet çipi: beklenen ${expected}, gelen ${basketChip.status}`);
  assert.equal(banner.status, expected, `[${name}] ürün sayfası banner: beklenen ${expected}, gelen ${banner.status}`);
  assert.equal(searchChip.status, banner.status, `[${name}] TUTARSIZLIK: arama "${searchChip.status}" ≠ ürün sayfası "${banner.status}"`);
  assert.equal(basketChip.status, banner.status, `[${name}] TUTARSIZLIK: sepet "${basketChip.status}" ≠ ürün sayfası "${banner.status}"`);

  // P1: basis/seviye de üç ekranda AYNI olmalı — arama ve sepet çipi aynı
  // evaluateCatalogAllergenDataForProfile çekirdeğini kullanır; ürün sayfası
  // banner'ı da (getAllergenBannerDataFromCatalog üzerinden) aynı perKey'den türetir.
  const searchDisplay = getAllergenDisplayLevel(evaluateCatalogAllergenDataForProfile(data, userProfile).perKey);
  const basketDisplay = getAllergenDisplayLevel(evaluateCatalogAllergenDataForProfile(data, userProfile).perKey);
  const bannerDisplay = banner.displayInfo;

  assert.ok(searchDisplay, `[${name}] arama seviyesi null olamaz (profil dolu)`);
  assert.ok(bannerDisplay, `[${name}] ürün sayfası seviyesi null olamaz (profil dolu)`);
  assert.equal(
    searchDisplay!.level,
    bannerDisplay!.level,
    `[${name}] TUTARSIZLIK: arama seviyesi "${searchDisplay!.level}" ≠ ürün sayfası seviyesi "${bannerDisplay!.level}"`,
  );
  assert.equal(
    basketDisplay!.level,
    bannerDisplay!.level,
    `[${name}] TUTARSIZLIK: sepet seviyesi "${basketDisplay!.level}" ≠ ürün sayfası seviyesi "${bannerDisplay!.level}"`,
  );
  assert.equal(
    searchDisplay!.text,
    bannerDisplay!.text,
    `[${name}] TUTARSIZLIK: arama rozet metni "${searchDisplay!.text}" ≠ ürün sayfası metni "${bannerDisplay!.text}"`,
  );
}

console.log(`CROSS_SCREEN_ALLERGEN_CONSISTENCY_SMOKE_OK (${CASES.length} senaryo × 3 ekran × durum+seviye)`);
