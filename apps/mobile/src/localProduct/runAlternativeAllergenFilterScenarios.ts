/**
 * RafSkoru — Alternatif aday alerjen filtresi senaryo kontrolü (geliştirici terminali).
 * src/localProduct/runAlternativeAllergenFilterScenarios.ts
 *
 * Çalıştırma (yeni bağımlılık gerektirmez):
 *   cd apps/mobile
 *   npx tsc src/localProduct/runAlternativeAllergenFilterScenarios.ts --outDir /tmp/rafskoru-alt-filter \
 *     --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --strict
 *   node /tmp/rafskoru-alt-filter/localProduct/runAlternativeAllergenFilterScenarios.js
 *
 * Kapsam: `isAlternativeCandidateCriticalMatch` — declared ("içerir") ve trace ("içerebilir")
 * eşleşmelerinin AYRI korunduğunu, eşleşen adayın gizlendiğini, eşleşmeyenin (yalnız kategori
 * ihtiyatı olsa bile) gizlenmediğini doğrular (proje sahibi düzeltmesi, 2026-09-18).
 */

declare const process: { exitCode?: number };

import { isAlternativeCandidateCriticalMatch } from './alternativeAllergenFilter';
import { CRITICAL_ALLERGEN_CODES } from './criticalAllergenCodes';
import { emptyUserSensitivityProfile } from '../userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../userProfile/userProfileTypes';
import type { AlternativeCandidateSignals } from '../price/types';

type Check = { name: string; run: () => void };
const checks: Check[] = [];
function scenario(name: string, run: () => void): void {
  checks.push({ name, run });
}
function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

const milkProfile: UserSensitivityProfile = { ...emptyUserSensitivityProfile, allergens: ['milk'] };
const eggProfile: UserSensitivityProfile = { ...emptyUserSensitivityProfile, allergens: ['egg'] };
const treeNutsProfile: UserSensitivityProfile = { ...emptyUserSensitivityProfile, allergens: ['tree_nuts'] };
const shellfishProfile: UserSensitivityProfile = { ...emptyUserSensitivityProfile, allergens: ['shellfish'] };

scenario('1 Declared eşleşme → kritik, aday gizlenmeli', () => {
  const signals: AlternativeCandidateSignals = { allergens: ['milk'] };
  assert(isAlternativeCandidateCriticalMatch(signals, 'süt ürünü', milkProfile), 'declared süt eşleşmesi kritik olmalı');
});

scenario('2 Yalnız trace eşleşme → kritik, aday gizlenmeli (bu turun ana düzeltmesi)', () => {
  const signals: AlternativeCandidateSignals = { allergens: [], traceAllergens: ['milk'] };
  assert(isAlternativeCandidateCriticalMatch(signals, 'kraker', milkProfile), 'trace süt eşleşmesi de kritik olmalı');
  const declaredOnly: AlternativeCandidateSignals = { allergens: ['gluten'], traceAllergens: ['milk'] };
  assert(isAlternativeCandidateCriticalMatch(declaredOnly, 'kraker', milkProfile), 'declared başka alerjen + trace süt yine kritik');
});

scenario('3 Ne declared ne trace eşleşme → kritik değil, aday görünür kalmalı', () => {
  const signals: AlternativeCandidateSignals = { allergens: ['gluten'], traceAllergens: ['soybeans'] };
  assert(!isAlternativeCandidateCriticalMatch(signals, 'ekmek', milkProfile), 'süt profiliyle eşleşmeyen aday gizlenmemeli');
});

scenario('4 Aday sinyali hiç yok (signals=undefined) → kritik değil, "veri yok" güvenli sayılmaz ama gizlenmez', () => {
  assert(!isAlternativeCandidateCriticalMatch(undefined, 'ürün', milkProfile), 'signals yokken eşleşme üretilmemeli (motor MISSING_* üretir, bunlar kritik listede değil)');
});

scenario('5 Yumurta: declared ve trace ayrı test edilir', () => {
  assert(isAlternativeCandidateCriticalMatch({ allergens: ['eggs'] }, 'ürün', eggProfile), 'declared eggs kritik olmalı');
  assert(isAlternativeCandidateCriticalMatch({ allergens: [], traceAllergens: ['eggs'] }, 'ürün', eggProfile), 'trace eggs kritik olmalı');
  assert(!isAlternativeCandidateCriticalMatch({ allergens: [], traceAllergens: [] }, 'ürün', eggProfile), 'yumurta beyanı yokken kritik olmamalı');
});

scenario('6 Genel OFF etiketi "nuts" (tam eşleşme) kritik; "peanuts" tree_nuts ile kritik DEĞİL (regresyon)', () => {
  assert(isAlternativeCandidateCriticalMatch({ allergens: ['nuts'] }, 'kuruyemiş', treeNutsProfile), 'declared "nuts" tree_nuts profiliyle kritik olmalı');
  assert(isAlternativeCandidateCriticalMatch({ allergens: [], traceAllergens: ['nuts'] }, 'kuruyemiş', treeNutsProfile), 'trace "nuts" da kritik olmalı');
  assert(!isAlternativeCandidateCriticalMatch({ allergens: ['peanuts'] }, 'fıstık ezmesi', treeNutsProfile), '"peanuts" tree_nuts profiliyle kritik olmamalı (fıstık ayrı alerjendir)');
});

scenario('7 Genel OFF etiketleri "crustaceans"/"molluscs" → shellfish profiliyle kritik', () => {
  assert(isAlternativeCandidateCriticalMatch({ allergens: [], traceAllergens: ['crustaceans', 'molluscs'] }, 'deniz ürünü', shellfishProfile), 'trace crustaceans/molluscs kritik olmalı');
});

scenario('8 Yalnız kategori ihtiyatı (PROFILE_EGG_PRECAUTION) → kritik listede değil, aday gizlenmemeli', () => {
  // İçerik/beyan bazlı yumurta eşleşmesi yok; yalnız ürün adı "tatlı" kategorisine giriyor.
  const signals: AlternativeCandidateSignals = { allergens: [], traceAllergens: [] };
  assert(!isAlternativeCandidateCriticalMatch(signals, 'çikolatalı gofret', eggProfile), 'kategori ihtiyatı tek başına kritik sayılmamalı, alternatif gizlenmemeli');
});

scenario('9 CRITICAL_ALLERGEN_CODES yalnız *_ALLERGEN_MATCH / *_TRACE_MATCH kodları içerir', () => {
  for (const code of CRITICAL_ALLERGEN_CODES) {
    assert(code.endsWith('_ALLERGEN_MATCH') || code.endsWith('_TRACE_MATCH'), `kategori/tercih kodu kritik listede olmamalı: ${code}`);
  }
  assert(CRITICAL_ALLERGEN_CODES.includes('PROFILE_EGG_ALLERGEN_MATCH'), 'egg declared kodu listede olmalı');
  assert(CRITICAL_ALLERGEN_CODES.includes('PROFILE_EGG_TRACE_MATCH'), 'egg trace kodu listede olmalı');
});

let passed = 0;
for (const check of checks) {
  try {
    check.run();
    passed += 1;
    console.log(`PASS  ${check.name}`);
  } catch (error) {
    console.log(`FAIL  ${check.name}\n      ${(error as Error).message}`);
  }
}
console.log(`\n${passed}/${checks.length} alternative-allergen-filter scenarios passed`);
if (passed !== checks.length) process.exitCode = 1;
