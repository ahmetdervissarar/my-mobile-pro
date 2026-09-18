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
 *
 * 10-14: `isAlternativeCandidateSafeForAllergyProfile` — uçtan uca kanıt-eksikliği düzeltmesi
 * (proje sahibi, 2026-09-18, dördüncü tur). Gerçek backend/seed verisi `traceAllergens` HİÇ
 * taşımadığı için, mobil tip değişikliğinin (üçüncü tur) gerçek veride etkisiz kaldığını ve bu
 * turun fail-closed gizleme davranışıyla düzeltildiğini kanıtlar. Senaryo 14 GERÇEK
 * `apps/backend/data/seed-candidates.json` dosyasını okur — yalnız elle kurulmuş nesnelerle
 * sınırlı kalmaz.
 */

declare const process: { exitCode?: number; cwd: () => string };

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isAlternativeCandidateCriticalMatch,
  isAlternativeCandidateSafeForAllergyProfile,
} from './alternativeAllergenFilter';
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

interface RealSeedCandidate {
  productName: string;
  signals?: AlternativeCandidateSignals;
  [key: string]: unknown;
}

/**
 * GERÇEK `apps/backend/data/seed-candidates.json` dosyasını okur (BOM temizlenir) — bu senaryo
 * elle kurulmuş mobil nesnelerle sınırlı KALMAMALI (proje sahibi talebi, madde 7, 2026-09-18).
 * Bu, backend'e yeni bir bağımlılık/veri hattı EKLEMEZ; yalnız var olan dosyayı okur.
 */
function loadRealSeedCandidates(): RealSeedCandidate[] {
  const candidatePaths = [
    resolve(process.cwd(), '../backend/data/seed-candidates.json'),
    resolve(process.cwd(), 'apps/backend/data/seed-candidates.json'),
    resolve(__dirname, '../../../backend/data/seed-candidates.json'),
  ];
  const seedPath = candidatePaths.find((path) => existsSync(path));
  if (!seedPath) {
    throw new Error(
      `Gerçek seed-candidates.json bulunamadı (denenen yollar: ${candidatePaths.join(', ')}). ` +
        'Bu senaryo "cd apps/mobile" içinden çalıştırılmalıdır.',
    );
  }
  const raw = readFileSync(seedPath, 'utf8').replace(/^﻿/, '');
  const parsed = JSON.parse(raw) as unknown;
  const list = Array.isArray(parsed) ? parsed : (parsed as { candidates?: unknown }).candidates;
  if (!Array.isArray(list)) {
    throw new Error('seed-candidates.json beklenen dizi biçiminde değil');
  }
  return list as RealSeedCandidate[];
}

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

// ── 10-14: isAlternativeCandidateSafeForAllergyProfile (uçtan uca kanıt-eksikliği düzeltmesi) ──

scenario('10 Alerji profili + signals yok → aday gizli (kanıt eksik, "iz yok" sayılmaz)', () => {
  assert(
    isAlternativeCandidateSafeForAllergyProfile(undefined, 'ürün', milkProfile) === false,
    'signals=undefined iken alerji profilli kullanıcıya aday görünür OLMAMALI',
  );
});

scenario('11 Alerji profili + traceAllergens undefined → aday gizli (declared dolu olsa bile)', () => {
  const signals: AlternativeCandidateSignals = { allergens: ['gluten'] };
  assert(
    isAlternativeCandidateSafeForAllergyProfile(signals, 'ürün', milkProfile) === false,
    'traceAllergens tanımsızken kanıt eksik sayılmalı, aday gizlenmeli (declared süt eşleşmesi olmasa bile)',
  );
});

scenario('12 Alerji profili + trace eşleşmesi (kanıt eksiksiz ama çakışıyor) → aday gizli', () => {
  const signals: AlternativeCandidateSignals = { allergens: [], traceAllergens: ['milk'] };
  assert(
    isAlternativeCandidateSafeForAllergyProfile(signals, 'kraker', milkProfile) === false,
    'kanıt eksiksiz olsa bile trace süt eşleşmesi varsa aday gizlenmeli',
  );
});

scenario('13 Doğrulanmış declared/trace verisi ve çakışma yok → aday görünür', () => {
  const signals: AlternativeCandidateSignals = { allergens: ['gluten'], traceAllergens: ['soybeans'] };
  assert(
    isAlternativeCandidateSafeForAllergyProfile(signals, 'ekmek', milkProfile) === true,
    'her iki alan da dizi olarak mevcut VE süt profiliyle çakışma yoksa aday görünür olmalı',
  );
});

scenario('14 Alerji profili yok → mevcut alternatif davranışı korunur (GERÇEK seed-candidates.json)', () => {
  const seedCandidates = loadRealSeedCandidates();
  const milkCandidate = seedCandidates.find(
    (candidate) =>
      candidate?.signals &&
      Array.isArray(candidate.signals.allergens) &&
      candidate.signals.allergens.includes('süt'),
  );
  if (!milkCandidate || !milkCandidate.signals) {
    throw new Error('gerçek seed dosyasında süt beyan eden en az bir aday bulunmalı (test öncüşartı)');
  }

  const realSignals: AlternativeCandidateSignals = milkCandidate.signals;
  assert(
    realSignals.traceAllergens === undefined,
    'BOŞLUĞU KANITLA: gerçek backend/seed verisi bugün traceAllergens alanını hiç taşımıyor',
  );

  const emptyProfile: UserSensitivityProfile = { ...emptyUserSensitivityProfile, allergens: [] };
  assert(
    isAlternativeCandidateSafeForAllergyProfile(realSignals, milkCandidate.productName, emptyProfile) === true,
    'alerji profili olmayan kullanıcı için gerçek aday görünür kalmalı (mevcut davranış korunmalı)',
  );

  assert(
    isAlternativeCandidateSafeForAllergyProfile(realSignals, milkCandidate.productName, milkProfile) === false,
    'DÜZELTME KANITI: süt alerjisi profilli kullanıcı için gerçek (kanıtsız) süt adayı fail-closed gizlenmeli',
  );
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
