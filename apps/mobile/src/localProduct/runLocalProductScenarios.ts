/**
 * RafSkoru — Yerel ürün kurtarma senaryo kontrolü (geliştirici terminali; RN runtime'a girmez).
 * src/localProduct/runLocalProductScenarios.ts
 *
 * Çalıştırma (yeni bağımlılık gerektirmez):
 *   cd apps/mobile
 *   npx tsc src/localProduct/runLocalProductScenarios.ts --outDir /tmp/rafskoru-local-product \
 *     --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --strict
 *   node /tmp/rafskoru-local-product/localProduct/runLocalProductScenarios.js
 *
 * Kabul şablonu (allergen-safety): GIVEN profil × ürün alerjen durumu → THEN uyarı kodu +
 * görünürlük + olumlu güvenlik iddiası yok.
 */

declare const process: { exitCode?: number };

import { deriveAllergenState } from '../contracts/generated';
import { evaluateProductRisks } from '../riskEngine/riskEngine';
import { emptyUserSensitivityProfile } from '../userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../userProfile/userProfileTypes';
import {
  createContributionDraft,
  PACKAGE_CAPTURE_STEPS,
  summarizeContributionDraft,
} from './contributionDraft';
import { FIXTURE_LABEL, ocrCandidateFixture, productFactsFixtures } from './fixtures';
import { describeGtinValidationError, isValidGtin, validateGtin } from './gtin';
import { describeAllergenDeclaration, deriveProductDataView, evaluateRecoveryRisk, findProfileDeclarationMatches, toRiskInputFromProductFacts } from './productDataState';

// CLAUDE.md P5 yasaklı ifadeleri + yaygın türevleri. Bare "temiz" kasıtlı olarak yok: "önbellek
// temizlenirse" gibi ilgisiz kelimelerle çakışıyordu (yanlış pozitif); "ürün temiz" hâlâ yakalanır.
const FORBIDDEN_CLAIMS = ['güvenli alternatif', 'alerjen içermez', 'ürün güvenlidir', 'garanti eder', 'sorun yok', 'ürün temiz'];

type Check = { name: string; run: () => void };
const checks: Check[] = [];
function scenario(name: string, run: () => void): void {
  checks.push({ name, run });
}
function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}
function assertNoForbiddenClaims(texts: string[]): void {
  for (const text of texts) {
    const lower = text.toLocaleLowerCase('tr');
    for (const claim of FORBIDDEN_CLAIMS) {
      assert(!lower.includes(claim), `olumlu iddia bulundu: "${claim}" → "${text}"`);
    }
  }
}

const milkProfile: UserSensitivityProfile = { ...emptyUserSensitivityProfile, allergens: ['milk'] };
const peanutProfile: UserSensitivityProfile = { ...emptyUserSensitivityProfile, allergens: ['peanut'] };

scenario('1 Tam OFF ürünü → usable, üç yetenek açık, beyan readable', () => {
  const view = deriveProductDataView({ facts: productFactsFixtures.full_off, isLoading: false, resolveCompleted: true });
  assert(view.state === 'usable', `state usable bekleniyor, ${view.state}`);
  assert(view.capabilities.risk && view.capabilities.health && view.capabilities.content, 'yetenekler açık olmalı');
  assert(view.allergenDeclaration.status === 'readable', 'beyan readable olmalı');
  assert(view.missingLabels.length === 0, 'eksik alan olmamalı');
  const input = toRiskInputFromProductFacts(productFactsFixtures.full_off, null, milkProfile);
  assert(input !== null, 'risk girdisi üretilmeli');
  const risk = evaluateProductRisks(input!);
  assert(risk.warnings.some((w) => w.code === 'PROFILE_MILK_ALLERGEN_MATCH'), 'süt profili eşleşmesi görünmeli');
  assertNoForbiddenClaims([view.summary, ...describeAllergenDeclaration(view.allergenDeclaration).lines]);
});

scenario('2 Görsel/Nutri-Score eksik, alerjen kullanılabilir → partial, kayıt düşmez, süt uyarısı üretilir', () => {
  const facts = productFactsFixtures.partial_allergen_usable;
  const view = deriveProductDataView({ facts, isLoading: false, resolveCompleted: true });
  assert(view.state === 'partial', `state partial bekleniyor, ${view.state}`);
  assert(view.capabilities.risk === true, 'risk yeteneği açık olmalı');
  assert(view.missingLabels.includes('Ürün görseli') && view.missingLabels.includes('Nutri-Score'), 'eksik alanlar listelenmeli');
  assert(view.fields.find((f) => f.field === 'allergenDeclaration')?.present === true, 'alerjen beyanı mevcut görünmeli');
  const input = toRiskInputFromProductFacts(facts, null, milkProfile);
  assert(input !== null, 'kısmi kayıt risk motoruna girmeli (D2)');
  const risk = evaluateProductRisks(input!);
  assert(risk.warnings.some((w) => w.code === 'PROFILE_MILK_ALLERGEN_MATCH'), 'kısmi kayıtta beyan edilen süt profil uyarısı üretmeli');
  assert(!risk.warnings.some((w) => w.code === 'MISSING_ALLERGEN_INFO'), 'alerjen beyanı varken eksik uyarısı üretilmemeli');
  assert(deriveAllergenState(view.allergenDeclaration, 'peanut') === 'not_listed_in_available_data', 'fıstık: listelenmemiş, güvenli değil');
  assertNoForbiddenClaims([view.summary, ...describeAllergenDeclaration(view.allergenDeclaration).lines]);
});

scenario('3 Yalnız "içerebilir" beyanı → trace_may_contain; içerir beyanı yok; olumlu iddia yok', () => {
  const facts = productFactsFixtures.trace_only;
  const view = deriveProductDataView({ facts, isLoading: false, resolveCompleted: true });
  assert(view.state === 'partial', `state partial bekleniyor, ${view.state}`);
  assert(view.allergenDeclaration.status === 'readable', 'beyan readable');
  assert(deriveAllergenState(view.allergenDeclaration, 'milk') === 'trace_may_contain', 'süt: içerebilir');
  assert(deriveAllergenState(view.allergenDeclaration, 'peanut') === 'not_listed_in_available_data', 'fıstık: listelenmemiş');
  const desc = describeAllergenDeclaration(view.allergenDeclaration);
  assert(desc.tone === 'trace', 'ton trace olmalı');
  assert(desc.lines.some((l) => l.startsWith('İçerebilir')), '"İçerebilir" metni görünmeli');
  assert(!desc.lines.some((l) => l.startsWith('Beyana göre içerir')), '"içerir" kesinlik dili olmamalı');
  // ADR-004: trace beyanı artık motora geçer (traceAllergens=['milk','sesame-seeds']). Profil
  // (peanut) bunlarla eşleşmiyor → hiçbir PROFILE_*_TRACE_MATCH tetiklenmez; ama trace beyanı
  // mevcut olduğu için "eksik alerjen bilgisi" de tetiklenmez (hasAllergenInfo artık true).
  const risk = evaluateProductRisks(toRiskInputFromProductFacts(facts, null, peanutProfile)!);
  assert(!risk.warnings.some((w) => w.code === 'MISSING_ALLERGEN_INFO' || w.code === 'PROFILE_ALLERGEN_INFO_MISSING'), 'trace beyanı mevcutken "eksik" uyarısı üretilmemeli (ADR-004)');
  assert(!risk.warnings.some((w) => w.code.endsWith('_TRACE_MATCH')), 'fıstık profiliyle trace_only fixture eşleşmez');
  // Aynı fixture, süt profiliyle: PROFILE_MILK_TRACE_MATCH tetiklenmeli.
  const milkRisk = evaluateProductRisks(toRiskInputFromProductFacts(facts, null, milkProfile)!);
  assert(milkRisk.warnings.some((w) => w.code === 'PROFILE_MILK_TRACE_MATCH'), 'süt profiliyle trace eşleşmesi tetiklenmeli');
  assert(!milkRisk.warnings.some((w) => w.code === 'PROFILE_MILK_ALLERGEN_MATCH'), 'declared eşleşme tetiklenmemeli (yalnız trace var)');
  assertNoForbiddenClaims([view.summary, ...desc.lines, ...milkRisk.warnings.map((w) => w.message)]);
});

scenario('4 OFF\'ta olmayan ürün → not_found, risk girdisi yok, tahmin yok', () => {
  const view = deriveProductDataView({ facts: productFactsFixtures.not_found, isLoading: false, resolveCompleted: true });
  assert(view.state === 'not_found', `state not_found bekleniyor, ${view.state}`);
  assert(view.allergenDeclaration.status === 'absent', 'beyan absent');
  assert(deriveAllergenState(view.allergenDeclaration, 'milk') === 'unknown_or_unverified', 'bilinmeyen');
  assert(toRiskInputFromProductFacts(null, 'Bir Ürün', milkProfile) === null, 'risk girdisi üretilmemeli');
  const inferred = { ...productFactsFixtures.full_off!, dataSource: 'beta_inference' as const };
  assert(deriveProductDataView({ facts: inferred, isLoading: false, resolveCompleted: true }).state === 'not_found', 'beta_inference ürün verisi olarak gösterilmez (D3)');
  assert(toRiskInputFromProductFacts(inferred, null, milkProfile) === null, 'beta_inference risk motoruna girmez');
  assertNoForbiddenClaims([view.summary]);
});

scenario('4b Eski yanıt: completeness yok + isComplete=false → backend ile aynı: not_found; ham allergens beyansız motora girmez', () => {
  const legacy = { ...productFactsFixtures.partial_allergen_usable!, completeness: undefined, capabilities: undefined };
  assert(deriveProductDataView({ facts: legacy, isLoading: false, resolveCompleted: true }).state === 'not_found', 'backend selectUsableProductFacts ile hizalı (yalnız isComplete)');
  assert(toRiskInputFromProductFacts(legacy, null, milkProfile) === null, 'atılan kayıt motora girmez');
  const rawOnly = { ...productFactsFixtures.full_off!, allergenInfo: undefined };
  const input = toRiskInputFromProductFacts(rawOnly, null, milkProfile);
  assert(input !== null && input.allergens?.length === 0, 'allergenInfo yokken ham allergens dizisi motora geçmez');
  const risk = evaluateProductRisks(input!);
  assert(risk.warnings.some((w) => w.code === 'MISSING_ALLERGEN_INFO' || w.code === 'PROFILE_ALLERGEN_INFO_MISSING'), 'beyansız kayıt eksik alerjen uyarısı üretir (fail-closed)');
});

scenario('5 Katkı taslağı: okunamayan alerjen alanı → unknown_or_unverified; gönderim kapalı', () => {
  const now = '2026-09-18T12:00:00.000Z';
  const draft = createContributionDraft({
    gtin: '8690000000041',
    photos: [
      { kind: 'front', localUri: 'file:///tmp/front.jpg', takenAt: '2026-09-18T11:58:00.000Z' },
      { kind: 'barcode', localUri: 'file:///tmp/barcode.jpg', takenAt: '2026-09-18T11:58:30.000Z' },
    ],
    skippedSteps: ['allergen', 'nutrition', 'quantity'],
    candidates: ocrCandidateFixture.map((c) => ({ ...c })),
    packagingVersion: 'SKT 12.2027 / parti A1',
    now,
  });
  assert(draft.status === 'candidate', 'taslak candidate');
  assert(draft.allergenState === 'unknown_or_unverified', 'alerjen durumu unknown_or_unverified');
  assert(draft.allergenDeclaration.status === 'absent', 'alerjen metni yokken beyan absent');
  assert(draft.missingFields.includes('allergenDeclaration'), 'alerjen alanı eksik listelenmeli');
  assert(draft.observedAt === '2026-09-18T11:58:00.000Z', 'gözlem zamanı ilk fotoğraf');
  assert(draft.submission.status === 'not_submitted' && draft.submission.boundary === 'no_upload_in_this_build', 'gönderim kapalı');
  const summary = summarizeContributionDraft(draft);
  assert(summary.some((l) => l.includes('GELİŞTİRME FIXTURE')), 'fixture etiketi özetten kaybolmamalı');
  assert(summary.some((l) => l.includes('doğrulanmamış')), 'doğrulanmamış dili görünmeli');
  assertNoForbiddenClaims(summary);

  // Kullanıcı alerjen metni yazsa bile beyan readable olamaz → durum yine unknown_or_unverified.
  const typed = createContributionDraft({
    gtin: '8690000000041',
    photos: [],
    skippedSteps: [],
    candidates: [{ field: 'allergenDeclaration', text: 'İçerir: süt. İçerebilir: fındık.', entryMethod: 'manual', isFixture: false, source: 'user_ocr', verified: false }],
    packagingVersion: null,
    now,
  });
  assert(typed.allergenDeclaration.status === 'unreadable', 'elle yazılan beyan unreadable (aday)');
  assert(typed.allergenState === 'unknown_or_unverified', 'elle yazılan beyan da doğrulanmamış');
  assert(deriveAllergenState(typed.allergenDeclaration, 'milk') === 'unknown_or_unverified', 'sözleşme türevi de unknown');
});

scenario('6 Adım metinleri: her adımda neden + atlama sonucu var; olumlu iddia yok', () => {
  assert(PACKAGE_CAPTURE_STEPS.length === 6, '6 adım');
  for (const step of PACKAGE_CAPTURE_STEPS) {
    assert(step.why.length > 10 && step.skipConsequence.length > 10, `adım metni kısa: ${step.kind}`);
  }
  assert(PACKAGE_CAPTURE_STEPS.find((s) => s.kind === 'barcode')?.required === true, 'barkod zorunlu');
  assertNoForbiddenClaims(PACKAGE_CAPTURE_STEPS.flatMap((s) => [s.title, s.why, s.skipConsequence]));
  assert(FIXTURE_LABEL.includes('FIXTURE'), 'fixture etiketi');
});

scenario('7 Bayrak açık, OFF dışı ama isComplete=true kayıt → eski yola düşmez; fail-closed "değerlendirilemedi"', () => {
  const inferred = { ...productFactsFixtures.full_off!, dataSource: 'beta_inference' as const, isComplete: true, completeness: 'complete' as const };
  const risk = evaluateRecoveryRisk({ facts: inferred, fallbackName: 'Bir Ürün', userProfile: milkProfile, trafficLight: null });
  assert(risk.isEvaluated === false, 'değerlendirilemedi olmalı');
  assert(!risk.warnings.some((w) => w.code === 'PROFILE_MILK_ALLERGEN_MATCH'), 'beta_inference verisinden profil eşleşmesi üretilmemeli');
  assert(risk.warnings.length === 1 && risk.warnings[0].code === 'FOOD_ANALYSIS_UNAVAILABLE', 'boş uyarı listesi gösterilmez');
  const none = evaluateRecoveryRisk({ facts: null, fallbackName: null, userProfile: milkProfile, trafficLight: null });
  assert(none.isEvaluated === false, 'kayıt yokken de değerlendirilemedi');
  assertNoForbiddenClaims(risk.warnings.map((w) => w.message));
});

scenario('8 Declared+trace karışık: profil (milk) yalnız iz listesinde → motor PROFILE_MILK_TRACE_MATCH üretir (ADR-004), declared üretmez', () => {
  const mixed = { ...productFactsFixtures.trace_only!, allergens: ['gluten'], allergenInfo: { dataStatus: 'present' as const, declaredAllergens: ['gluten'], traceAllergens: ['milk'], source: 'off_structured' as const } };
  const view = deriveProductDataView({ facts: mixed, isLoading: false, resolveCompleted: true });
  const risk = evaluateRecoveryRisk({ facts: mixed, fallbackName: null, userProfile: milkProfile, trafficLight: null });
  // ADR-004 (allergen-safety-reviewer F2 kapatıldı): trace beyanı artık merkezi motora girer.
  assert(!risk.warnings.some((w) => w.code === 'PROFILE_MILK_ALLERGEN_MATCH'), 'declared eşleşme üretilmemeli (gluten declared, süt değil)');
  assert(risk.warnings.some((w) => w.code === 'PROFILE_MILK_TRACE_MATCH'), 'motor trace eşleşmesini merkezi olarak üretmeli');
  assert(risk.warnings.some((w) => w.message.includes('içerebilir') || w.message.includes('eser miktarda')), 'mesaj ihtiyatlı dil taşımalı');
  const matches = findProfileDeclarationMatches(view.allergenDeclaration, milkProfile.allergens);
  assert(matches.trace.some((m) => m.profileKey === 'milk' && m.tag === 'milk'), 'ekran projeksiyonu iz eşleşmesini de göstermeli (motorla tutarlı)');
  assert(matches.declared.length === 0, 'declared eşleşme yok');
  assert(findProfileDeclarationMatches({ status: 'absent', declaredTags: [], traceTags: [], source: null }, milkProfile.allergens).trace.length === 0, 'beyan yokken eşleşme üretilmez');
});

scenario('9 GTIN doğrulama: uzunluk + kontrol basamağı (proje sahibi düzeltmesi)', () => {
  // Ölçülmüş gerçek GTIN'ler (turkey-weekly-price-source-spike, 2026-09-18): geçerli.
  assert(isValidGtin('8690504011521'), 'gerçek 13 haneli GTIN geçerli olmalı');
  assert(isValidGtin('8690504410911'), 'gerçek 13 haneli GTIN geçerli olmalı');
  // Depodaki eski örnek kodlar: kontrol basamağı hatalı (bilinen geçersiz).
  assert(!isValidGtin('8690000000001'), 'geçersiz kontrol basamaklı kod reddedilmeli');
  assert(validateGtin('8690000000001').reason === 'check_digit', 'reddedilme nedeni check_digit olmalı');
  assert(!isValidGtin('869000'), '6 haneli kod (geçersiz uzunluk) reddedilmeli');
  assert(validateGtin('869000').reason === 'length', 'reddedilme nedeni length olmalı');
  assert(!isValidGtin('869050401152a'), 'rakam olmayan karakter reddedilmeli');
  assert(validateGtin('869050401152a').reason === 'non_digit', 'reddedilme nedeni non_digit olmalı');
  assert(!isValidGtin(''), 'boş barkod reddedilmeli');
  assert(!isValidGtin(null), 'null barkod reddedilmeli');
  assert(isValidGtin('96385074'), '8 haneli EAN-8 geçerliyse kabul edilmeli');
  assert(describeGtinValidationError('8690504011521') === null, 'geçerli GTIN için hata metni olmamalı');
  assert(typeof describeGtinValidationError('8690000000001') === 'string', 'geçersiz GTIN için Türkçe hata metni dönmeli');
  assertNoForbiddenClaims([describeGtinValidationError('8690000000001') ?? '']);
});

scenario('10 Geçici fotoğraf uyarısı: fotoğraf varsa özet metninde görünür, yoksa görünmez', () => {
  const withPhoto = createContributionDraft({
    gtin: '8690504011521',
    photos: [{ kind: 'front', localUri: 'file:///cache/front.jpg', takenAt: '2026-09-18T12:00:00.000Z' }],
    skippedSteps: [],
    candidates: [],
    packagingVersion: null,
    now: '2026-09-18T12:00:00.000Z',
  });
  const withoutPhoto = createContributionDraft({
    gtin: '8690504011521',
    photos: [],
    skippedSteps: ['front'],
    candidates: [],
    packagingVersion: null,
    now: '2026-09-18T12:00:00.000Z',
  });
  assert(summarizeContributionDraft(withPhoto).some((l) => l.includes('geçici önbellek')), 'fotoğraf varken geçicilik uyarısı görünmeli');
  assert(!summarizeContributionDraft(withoutPhoto).some((l) => l.includes('geçici önbellek')), 'fotoğraf yokken uyarı gösterilmemeli');
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
console.log(`\n${passed}/${checks.length} local-product scenarios passed`);
if (passed !== checks.length) process.exitCode = 1;
