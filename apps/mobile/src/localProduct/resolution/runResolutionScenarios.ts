/**
 * RafSkoru — İçerik çözümleme senaryo kontrolü (geliştirici terminali; ADR-005).
 * src/localProduct/resolution/runResolutionScenarios.ts
 *
 * Çalıştırma (yeni bağımlılık gerektirmez):
 *   cd apps/mobile
 *   npx tsc src/localProduct/resolution/runResolutionScenarios.ts --outDir /tmp/rafskoru-resolution \
 *     --module commonjs --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck --strict
 *   node /tmp/rafskoru-resolution/localProduct/resolution/runResolutionScenarios.js
 *
 * Senaryo 1–11 proje sahibinin zorunlu listesidir; 12–15 gerçek kaydedilmiş OFF kanıtı ve
 * ürün-geneli güven değeri yokluğunu doğrular. Hiçbir senaryo fixture'ı gerçek başarı saymaz.
 */

declare const process: { exitCode?: number };

import { deriveAllergenState } from '../../contracts/generated';
import type { AllergenDeclaration, VerifiedLocalProduct } from '../../contracts/generated';
import { isAlternativeCandidateSafeForAllergyProfile } from '../alternativeAllergenFilter';
import { createContributionDraft } from '../contributionDraft';
import type { ContributionDraft, OcrCandidate, ProductFactsWire } from '../types';
import { emptyUserSensitivityProfile } from '../../userProfile/userProfileTypes';
import { buildIdentityKey, classifyMatch, isSameGtin, normalizeGtin } from './identity';
import { mergeCandidates } from './mergeEngine';
import { createContributionDraftProvider, createOffProvider, createVerifiedLocalProvider, draftCandidate, emptyVerifiedLocalStore, offCandidateFromProductFacts, verifiedCandidateFromRecord } from './providers';
import { RECORDED_NEGATIVE_CONTROL, RECORDED_NOT_FOUND_GTIN, recordedAlbeniComplete, recordedCokokremPartial, recordedTorkuSearchSample, recordedWefoodNoAllergenTags } from './recordedEvidence';
import { applyHumanFieldChecks, buildReviewItems } from './review';
import { runProductResolution } from './resolve';
import type { ResolutionCandidate } from './types';
import { deriveResolutionUiState, RESOLUTION_UI_COPY } from './uiState';

type Check = { name: string; run: () => Promise<void> | void };
const checks: Check[] = [];
function scenario(name: string, run: () => Promise<void> | void): void {
  checks.push({ name, run });
}
function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

const NOW = '2026-09-18T20:00:00.000Z';
const now = () => NOW;
const FORBIDDEN = ['güvenli alternatif', 'alerjen içermez', 'ürün güvenlidir', 'garanti eder', 'sağlıklı alternatif'];

function ocr(field: OcrCandidate['field'], text: string | null): OcrCandidate {
  return { field, text, entryMethod: text ? 'manual' : 'none', isFixture: false, source: 'user_ocr', verified: false };
}
function makeDraft(gtin: string, candidates: OcrCandidate[], withPhotos = true): ContributionDraft {
  const photos = withPhotos
    ? (['front', 'barcode', 'ingredients', 'allergen'] as const).map((kind) => ({ kind, localUri: `file:///cache/${kind}.jpg`, takenAt: '2026-09-18T18:00:00.000Z' }))
    : [];
  return createContributionDraft({ gtin, photos, skippedSteps: [], candidates, packagingVersion: 'SKT 12.2027', now: NOW });
}
const providersFor = (facts: ProductFactsWire | null, draft: ContributionDraft | null) => [
  createOffProvider(async () => facts),
  createVerifiedLocalProvider(emptyVerifiedLocalStore),
  createContributionDraftProvider(async (gtin) => (draft && draft.gtin === gtin ? draft : null)),
];

scenario('1 OFF tam kayıt → exact_gtin_match; alanlar OFF kökenli; çatışma yok', async () => {
  const attempt = await runProductResolution({ gtin: '8690504034506', identityHint: null }, providersFor(recordedAlbeniComplete, null), { now });
  assert(attempt.uiState === 'exact_gtin_match', `beklenen exact_gtin_match, gelen ${attempt.uiState}`);
  assert(attempt.merged.fields.productName.value === 'Albeni', 'ürün adı OFF kaydından gelmeli');
  assert(attempt.merged.fieldSources.productName?.source === 'off', 'alan kökeni off olmalı');
  assert(attempt.merged.conflicts.length === 0, 'çatışma olmamalı');
  assert(attempt.providerResults.some((r) => r.providerId === 'manufacturer_official' && r.status === 'not_implemented'), 'üretici sağlayıcısı not_implemented olarak GÖRÜNÜR olmalı (sahte adapter yok)');
  assert(attempt.providerResults.some((r) => r.providerId === 'verified_local' && r.status === 'not_found'), 'doğrulanmış yerel depo boş → not_found');
});

scenario('2 OFF kısmi (NOVA yok) + üretici kaynağı adayı eksik alanı tamamlar; mevcut alan korunur', () => {
  const off = offCandidateFromProductFacts('8690504121336', recordedCokokremPartial);
  // Motor testi için elle kurulmuş üretici adayı (çalışan adapter YOKTUR; bu yalnız birleştirme kuralını sınar).
  const manufacturer: ResolutionCandidate = {
    id: 'test:manufacturer',
    providerId: 'manufacturer_official',
    sourceKind: 'manufacturer',
    matchLevel: 'exact_gtin',
    identity: { gtin: '8690504121336', productName: 'Çokokrem Kakaolu Fındık Kreması', brand: 'Ülker', variant: null, netQuantityText: '400 g' },
    identityKey: null,
    packagingEvidenceIds: [],
    fields: [
      { id: 'test:manufacturer:novaGroup', field: 'novaGroup', structuredValue: 4, rawText: null, source: { source: 'manufacturer', confidence: 'medium', fetchedAt: NOW, reference: 'https://example.invalid/test' }, candidateId: 'test:manufacturer', entryMethod: 'structured', isFixture: true, verified: false, supersededByEvidenceId: null },
      { id: 'test:manufacturer:productName', field: 'productName', structuredValue: 'Çokokrem Kakaolu Fındık Kreması', rawText: null, source: { source: 'manufacturer', confidence: 'medium', fetchedAt: NOW }, candidateId: 'test:manufacturer', entryMethod: 'structured', isFixture: true, verified: false, supersededByEvidenceId: null },
    ],
    reference: null, fetchedAt: NOW, sourceModifiedAt: null, observedAt: null, isSynthetic: true, sourceCompleteness: null,
  };
  const merged = mergeCandidates('8690504121336', [off, manufacturer]);
  assert(merged.fields.novaGroup.value === 4 && merged.fieldSources.novaGroup?.source === 'manufacturer', 'eksik NOVA üretici kanıtıyla tamamlanmalı (single_candidate)');
  assert(merged.fields.nutriScoreGrade.value === 'E' && merged.fieldSources.nutriScoreGrade?.source === 'off', 'mevcut OFF alanı korunmalı');
  const nameConflict = merged.conflicts.find((c) => c.field === 'productName');
  assert(nameConflict && nameConflict.state === 'unresolved', 'farklı ürün adı çatışması SAKLANMAMALI (unresolved)');
  assert(merged.fields.productName.value === 'Ülker Çokokrem 400 G', 'çatışmada mevcut OFF adı korunmalı, otomatik üzerine yazılmamalı');
});

scenario('3 OFF yok + aynı GTIN ambalaj kanıtı → user_ocr kanıtı düşük güven; alerjen beyanı okunabilir DEĞİL', async () => {
  const gtin = RECORDED_NOT_FOUND_GTIN;
  const draft = makeDraft(gtin, [ocr('productName', 'Örnek Ürün 250 g'), ocr('ingredientsText', 'Su, tuz.'), ocr('allergenDeclaration', 'Süt içerebilir')]);
  const attempt = await runProductResolution({ gtin, identityHint: null }, providersFor(null, draft), { now });
  assert(attempt.uiState === 'ocr_candidate_pending_review', `beklenen ocr_candidate_pending_review, gelen ${attempt.uiState}`);
  assert(attempt.merged.matchLevel === 'exact_gtin', 'taslak aynı GTIN → exact');
  assert(attempt.merged.fieldSources.productName?.source === 'user_ocr' && attempt.merged.fieldSources.productName?.confidence === 'low', 'user_ocr kanıtı düşük güven taşımalı');
  assert(attempt.merged.allergenDeclaration.status !== 'readable', 'OCR alerjen metni beyanı okunabilir yapamaz');
  assert(attempt.merged.allergenCandidateText === 'Süt içerebilir', 'alerjen aday metni ayrı alanda görünür kalmalı');
  assert(attempt.providerResults.find((r) => r.providerId === 'off')?.status === 'not_found', 'OFF not_found nedeni kaydedilmeli');
});

scenario('4 Farklı GTIN’li benzer adlar birleştirilmez', () => {
  const offOther = offCandidateFromProductFacts('8690504034506', recordedAlbeniComplete); // Albeni
  assert(offOther.matchLevel === 'exact_gtin', 'kendi GTIN’iyle exact');
  const merged = mergeCandidates('8690504034513', [{ ...offOther, matchLevel: classifyMatch('8690504034513', offOther.identity) }]);
  assert(merged.excludedCandidateIds.includes(offOther.id), 'farklı GTIN adayı dışarıda kalmalı');
  assert(merged.fields.productName.value === null, 'farklı GTIN’den alan taşınmamalı');
  assert(!isSameGtin('8690504034506', '8690504034513'), 'benzer GTIN eşit sayılmamalı');
  assert(isSameGtin('08690504034506', '8690504034506') && normalizeGtin('8690504034506') === '08690504034506', 'aynı GTIN 14 haneye normalize edilip eşleşmeli');
});

scenario('5 Barkodsuz benzer ürün yalnız ADAY kalır; kimlik parçası eksikse aday bile olamaz (gerçek arama örneklemi)', () => {
  const full = { gtin: null, brand: 'Torku', productName: 'Nefis Ayran', variant: 'sade', netQuantityText: '2l' };
  assert(classifyMatch(null, full) === 'candidate_no_gtin', 'dört parça tam → candidate_no_gtin');
  assert(buildIdentityKey({ ...full, brand: 'torku', netQuantityText: '2 L' }) === buildIdentityKey(full), 'normalize anahtar marka/miktar yazımından bağımsız');
  const noName = recordedTorkuSearchSample[2];
  assert(classifyMatch(null, { gtin: null, brand: noName.brands, productName: noName.product_name, variant: 'x', netQuantityText: '100 g' }) === 'none', 'adı olmayan gerçek OFF kaydı aday olamaz');
  const candidate: ResolutionCandidate = { id: 'search:8690120138725', providerId: 'off', sourceKind: 'off', matchLevel: 'candidate_no_gtin', identity: { gtin: null, brand: 'torku', productName: 'tortu tam kraker', variant: 'tam', netQuantityText: '120gr' }, identityKey: buildIdentityKey({ gtin: null, brand: 'torku', productName: 'tortu tam kraker', variant: 'tam', netQuantityText: '120gr' }), packagingEvidenceIds: [], fields: [{ id: 'search:name', field: 'productName', structuredValue: 'tortu tam kraker', rawText: null, source: { source: 'off', confidence: 'medium' }, candidateId: 'search:8690120138725', entryMethod: 'structured', isFixture: false, verified: false, supersededByEvidenceId: null }], reference: null, fetchedAt: NOW, sourceModifiedAt: null, observedAt: null, isSynthetic: false, sourceCompleteness: null };
  const merged = mergeCandidates(null, [candidate]);
  assert(merged.matchLevel === 'candidate_no_gtin' && merged.excludedCandidateIds.includes(candidate.id), 'barkodsuz aday birleştirmeye girmez');
  assert(merged.fields.productName.value === null, 'barkodsuz adaydan alan taşınmaz');
});

scenario('6 Kaynak çatışması görünür kalır: OFF adı korunur, güncel ambalaj kanıtı displayHint; durum official_source_conflict', async () => {
  const draft = makeDraft('8690504034506', [ocr('productName', 'Albeni Karamel Yeni Ambalaj')]);
  const attempt = await runProductResolution({ gtin: '8690504034506', identityHint: null }, providersFor(recordedAlbeniComplete, draft), { now });
  const f = attempt.merged.fields.productName;
  assert(f.conflict === 'unresolved' && f.value === 'Albeni', 'çatışma unresolved; mevcut OFF değeri korunur');
  assert(f.displayHint?.reason === 'newer_packaging_observation', 'güncel ambalaj kanıtı gösterilmeli');
  assert(attempt.merged.hasUnresolvedConflict && attempt.uiState === 'official_source_conflict', `durum official_source_conflict olmalı (gelen ${attempt.uiState})`);
});

scenario('7 OCR alerjen metni doğrulanmış sayılmaz — inceleme "Doğrula" dese bile', () => {
  const draft = makeDraft('8690000000010', [ocr('allergenDeclaration', 'İçerir: süt, fındık. İçerebilir: yer fıstığı.')]);
  const record = applyHumanFieldChecks(draft, { allergenDeclaration: { decision: 'confirmed' } }, NOW);
  assert(record.status === 'locally_reviewed_candidate', 'sonuç yerel incelenmiş aday olmalı');
  assert(record.allergenDeclaration.status === 'unreadable' && record.allergenState === 'unknown_or_unverified', 'kullanıcı beyanı readable olamaz; durum unknown_or_unverified');
  assert(record.allergenDeclaration.status !== 'readable', 'readable yasağı');
  assert((record as { status: string }).status !== 'rafskoru_verified', 'hiçbir yolla rafskoru_verified olmaz');
});

scenario('8 declared_contains ve trace_may_contain ayrımı (gerçek Albeni etiketi); listede olmayan asla "güvenli" değil', () => {
  const off = offCandidateFromProductFacts('8690504034506', recordedAlbeniComplete);
  const merged = mergeCandidates('8690504034506', [off]);
  const d = merged.allergenDeclaration;
  assert(d.status === 'readable', 'OFF yapılandırılmış etiketi okunabilir beyan üretir');
  assert(deriveAllergenState(d, 'milk') === 'declared_contains', 'milk → declared_contains');
  assert(deriveAllergenState(d, 'gluten') === 'declared_contains', 'gluten declared VE trace → declared öncelikli');
  assert(deriveAllergenState(d, 'nuts') === 'declared_contains', 'nuts declared');
  if (d.status !== 'readable') throw new Error('beklenmeyen durum');
  const albeniTraceOnly: AllergenDeclaration = { status: 'readable', declaredTags: ['milk'], traceTags: ['nuts'], source: d.source };
  assert(deriveAllergenState(albeniTraceOnly, 'nuts') === 'trace_may_contain', 'yalnız iz → trace_may_contain');
  assert(deriveAllergenState(d, 'eggs') === 'not_listed_in_available_data', 'listede yok → not_listed (güvenli değil)');
});

scenario('9 Okunamayan alan unknown_or_unverified kalır; değer üretilmez', () => {
  const draft = makeDraft('8690000000010', [ocr('ingredientsText', 'bulanık metin'), ocr('allergenDeclaration', null)]);
  const record = applyHumanFieldChecks(draft, { ingredientsText: { decision: 'unreadable' }, allergenDeclaration: { decision: 'unreadable' } }, NOW);
  const check = record.checks.find((c) => c.field === 'ingredientsText');
  assert(check?.decision === 'unreadable' && check.reviewedText === null && check.resultingEvidenceId === null, 'okunamayan alanda doğrulanmış değer olamaz');
  assert(record.allergenState === 'unknown_or_unverified', 'alerjen durumu unknown_or_unverified');
  const state = deriveResolutionUiState({ attempt: null, isSearching: false, hasPackagingPhotos: true, review: record });
  assert(state === 'field_unreadable', `tümü okunamıyor → field_unreadable (gelen ${state})`);
});

scenario('10 Alerji profili varken eksik kanıtlı aday alternatif olarak gösterilmez (aynı kapı)', () => {
  const milkProfile = { ...emptyUserSensitivityProfile, allergens: ['milk' as const] };
  assert(isAlternativeCandidateSafeForAllergyProfile(undefined, 'ürün', milkProfile) === false, 'signals yok → gizli');
  assert(isAlternativeCandidateSafeForAllergyProfile({ allergens: [] }, 'ürün', milkProfile) === false, 'traceAllergens undefined → gizli');
  // Yerel incelenmiş aday da aynı kapıdan geçer: alerjen kanıtı yok → alternatif olamaz.
  const draft = makeDraft('8690000000010', [ocr('allergenDeclaration', 'süt')]);
  const record = applyHumanFieldChecks(draft, { allergenDeclaration: { decision: 'confirmed' } }, NOW);
  assert(record.allergenDeclaration.status !== 'readable', 'incelenmiş aday beyanı okunabilir değil → alternatif kapısından geçemez');
});

scenario('11 Kullanıcı düzeltmesi kanıt ve önceki değer geçmişini silmez', () => {
  const draft = makeDraft('8690000000010', [ocr('productName', 'Örnek Ürün 250 g'), ocr('ingredientsText', 'Su, tuz.')]);
  const record = applyHumanFieldChecks(draft, { productName: { decision: 'corrected', correctedText: 'Örnek Ürün Sade 250 g' }, ingredientsText: { decision: 'confirmed' } }, NOW);
  const original = record.evidence.find((e) => e.field === 'productName' && e.entryMethod !== 'human_review');
  const corrected = record.evidence.find((e) => e.field === 'productName' && e.entryMethod === 'human_review');
  assert(original && corrected, 'eski ve yeni kanıt birlikte durmalı');
  assert(original!.supersededByEvidenceId === corrected!.id, 'eski kanıt yeni kanıta bağlanmalı, silinmemeli');
  assert(original!.rawText === 'Örnek Ürün 250 g' && corrected!.rawText === 'Örnek Ürün Sade 250 g', 'her iki değer korunmalı');
  const check = record.checks.find((c) => c.field === 'productName');
  assert(check?.candidateText === 'Örnek Ürün 250 g' && check.reviewedText === 'Örnek Ürün Sade 250 g', 'kontrol kaydı önceki ve yeni değeri taşımalı');
  assert(corrected!.verified === false && corrected!.source.source === 'user_ocr', 'düzeltme user_ocr, verified=false kalır');
});

scenario('12 Gerçek kayıt: Çokokrem (NOVA yok) → off_partial; wefood (alerjen etiketi boş) → beyan absent, negatif kanıt değil', async () => {
  const a = await runProductResolution({ gtin: '8690504121336', identityHint: null }, providersFor(recordedCokokremPartial, null), { now });
  assert(a.uiState === 'off_partial', `Çokokrem beklenen off_partial, gelen ${a.uiState}`);
  assert(a.merged.missingFields.includes('novaGroup'), 'NOVA eksik listede görünmeli');
  const w = await runProductResolution({ gtin: '8683347030866', identityHint: null }, providersFor(recordedWefoodNoAllergenTags, null), { now });
  assert(w.merged.allergenDeclaration.status === 'absent', 'boş allergens_tags → absent (unknown), "temiz" değil');
  assert(deriveAllergenState(w.merged.allergenDeclaration, 'gluten') === 'unknown_or_unverified', '"glutensiz" adına rağmen durum unknown_or_unverified (ad çıkarımı yok, D3)');
});

scenario('13 Gerçek kayıt: OFF 404 + fotoğraf yok → packaging_photo_needed; negatif kontrol kimliği yalnız kaynaktan', async () => {
  const a = await runProductResolution({ gtin: RECORDED_NOT_FOUND_GTIN, identityHint: null }, providersFor(null, null), { now });
  assert(a.uiState === 'packaging_photo_needed', `beklenen packaging_photo_needed, gelen ${a.uiState}`);
  assert(a.merged.matchLevel === 'none' && a.merged.missingFields.length === 10, 'hiçbir alan uydurulmamalı');
  assert(RECORDED_NEGATIVE_CONTROL.allergensTags.length === 0 && RECORDED_NEGATIVE_CONTROL.productName.length > 0, 'negatif kontrol: kimlik OFF yanıtından, alerjen etiketi yok');
});

scenario('14 Ürün-geneli güven değeri yok; köken alan bazlı; user_ocr tavanı low', () => {
  const off = offCandidateFromProductFacts('8690504121336', recordedCokokremPartial);
  const draft = draftCandidate('8690504121336', makeDraft('8690504121336', [ocr('netQuantity', '400 g')]));
  const merged = mergeCandidates('8690504121336', [off, draft]) as unknown as Record<string, unknown>;
  for (const key of ['confidence', 'overallConfidence', 'productConfidence', 'score']) assert(!(key in merged), `ürün-geneli '${key}' üretilmemeli`);
  const m = merged as unknown as ReturnType<typeof mergeCandidates>;
  assert(m.fields.netQuantity.candidateText === '400 g' && m.fields.netQuantity.value === null && m.fieldSources.netQuantity?.confidence === 'low', 'yapılandırılmamış OCR miktarı aday metin olarak, düşük güvenle kalır');
});

scenario('15 Ekran metinleri: on durum ayrı; olumlu güvenlik iddiası yok; inceleme öğelerinde alerjen ilk sırada', () => {
  const states = Object.keys(RESOLUTION_UI_COPY);
  assert(states.length === 10 && new Set(Object.values(RESOLUTION_UI_COPY).map((c) => c.title)).size === 10, 'on ayrı durum başlığı');
  for (const copy of Object.values(RESOLUTION_UI_COPY)) {
    const text = `${copy.title} ${copy.body} ${copy.nextAction}`.toLowerCase();
    for (const bad of FORBIDDEN) assert(!text.includes(bad), `yasak ifade: ${bad}`);
  }
  const draft = makeDraft('8690000000010', [ocr('productName', 'x'), ocr('allergenDeclaration', 'süt')]);
  const items = buildReviewItems(draft, null);
  assert(items[0].isAllergen && items[0].photo?.kind === 'allergen', 'alerjen öğesi ilk sırada ve fotoğrafla eşleşmiş');
});

scenario('16 Aynı GTIN: OFF readable beyan + rafskoru_verified readable beyan → doğrulanmış olan seçilir (sağlayıcı sırasından bağımsız)', () => {
  const off = offCandidateFromProductFacts('8690504034506', recordedAlbeniComplete);
  const verifiedRecord: VerifiedLocalProduct = {
    id: 'vlp-test-1',
    gtin: '8690504034506',
    status: 'verified',
    claims: [
      {
        field: 'allergenDeclaration',
        value: {
          status: 'readable',
          declaredTags: ['milk', 'nuts'],
          traceTags: ['soybeans'],
          source: { source: 'rafskoru_verified', confidence: 'high', observedAt: '2026-09-10T10:00:00.000Z', evidenceId: 'ev-test-1' },
        },
        evidenceId: 'ev-test-1',
        verificationRecordId: 'vr-test-1',
        provenance: { source: 'rafskoru_verified', confidence: 'high', observedAt: '2026-09-10T10:00:00.000Z', evidenceId: 'ev-test-1' },
      },
    ],
    evidenceIds: ['ev-test-1'],
    verificationRecordIds: ['vr-test-1'],
    createdAt: NOW,
    updatedAt: NOW,
  };
  const verified = verifiedCandidateFromRecord('8690504034506', verifiedRecord);
  assert(verified, 'doğrulanmış aday üretilmeli');
  for (const order of [[off, verified!], [verified!, off]]) {
    const merged = mergeCandidates('8690504034506', order);
    assert(merged.fieldSources.allergenDeclaration?.source === 'rafskoru_verified', 'beyan kökeni rafskoru_verified olmalı (sıra: ' + order.map((c) => c.providerId).join('>') + ')');
    assert(merged.allergenDeclaration.status === 'readable' && merged.allergenDeclaration.traceTags.includes('soybeans'), 'gösterilen beyan doğrulanmış kaydın beyanı olmalı');
    const conflict = merged.conflicts.find((c) => c.field === 'allergenDeclaration');
    assert(conflict?.state === 'resolved' && conflict.rule === 'verified_over_unverified' && conflict.preferredEvidenceId === merged.fields.allergenDeclaration.selectedEvidenceId, 'çatışma kaydı ile seçilen kanıt tutarlı olmalı');
  }
});

(async () => {
  let passed = 0;
  for (const check of checks) {
    try {
      await check.run();
      passed += 1;
      console.log(`PASS  ${check.name}`);
    } catch (error) {
      console.log(`FAIL  ${check.name}\n      ${(error as Error).message}`);
    }
  }
  console.log(`\n${passed}/${checks.length} resolution scenarios passed`);
  if (passed !== checks.length) process.exitCode = 1;
})();
