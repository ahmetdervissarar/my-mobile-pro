/**
 * RafSkoru — Tüketici karar akışı V2 view-model saf senaryo kontrolü (Aşama 8).
 * src/consumerUx/runConsumerDecisionViewModelScenarios.ts
 *
 * Yalnız saf, I/O'suz `decisionViewModel.ts`'i test eder; RN runtime'a girmez.
 *
 * Çalıştırma (yeni bağımlılık gerektirmez):
 *   cd apps/mobile
 *   npx tsc src/consumerUx/runConsumerDecisionViewModelScenarios.ts --outDir /tmp/rafskoru-consumer-ux \
 *     --module commonjs --target es2020 --moduleResolution node --esModuleInterop --strict
 *   node /tmp/rafskoru-consumer-ux/consumerUx/runConsumerDecisionViewModelScenarios.js
 */

import type { AllergenDeclaration } from '../contracts/generated';
import type { LocallyReviewedRecord } from '../localProduct/resolution/types';
import type { ProductDataView } from '../localProduct/types';
import type { ProductRiskResult } from '../riskEngine/riskEngine';
import { projectConsumerDecisionViewModel } from './decisionViewModel';
import type { ProjectConsumerDecisionViewModelInput } from './decisionViewModel';
import { DEV_CONSUMER_DECISION_FIXTURES } from './devFixtures';

type Check = { name: string; run: () => void };
const checks: Check[] = [];
function scenario(name: string, run: () => void): void {
  checks.push({ name, run });
}
function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

// CLAUDE.md P5 yasaklı ifadeleri.
const FORBIDDEN_CLAIMS = ['güvenli alternatif', 'alerjen içermez', 'ürün güvenlidir', 'garanti eder', 'sorun yok', 'sağlıklı alternatif', 'alerjensiz'];
function assertNoForbiddenClaims(texts: (string | null | undefined)[]): void {
  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const claim of FORBIDDEN_CLAIMS) assert(!lower.includes(claim), `olumlu iddia bulundu: "${claim}" → "${text}"`);
  }
}

const RISK_EMPTY: ProductRiskResult = { overallRisk: 'unknown', warnings: [], isEvaluated: true };
const OFF_SOURCE = { source: 'off' as const, confidence: 'medium' as const, reference: null, fetchedAt: null };
const ABSENT_DECLARATION: AllergenDeclaration = { status: 'absent', declaredTags: [], traceTags: [], source: null };

function readableDeclaration(declaredTags: string[], traceTags: string[]): AllergenDeclaration {
  return { status: 'readable', declaredTags, traceTags, source: OFF_SOURCE };
}

const USABLE_VIEW: ProductDataView = {
  state: 'usable',
  sourceLabel: 'Open Food Facts',
  fields: [],
  missingLabels: [],
  capabilities: { risk: true, health: true, content: true },
  allergenDeclaration: ABSENT_DECLARATION,
  summary: 'test',
};

function baseInput(): Omit<ProjectConsumerDecisionViewModelInput, 'allergenDeclaration' | 'productDataView'> {
  return {
    isLoading: false,
    identity: { name: 'Test Ürün', barcode: '8690000000010', imageUrl: null, isLoading: false },
    riskResult: RISK_EMPTY,
    criticalProfileWarnings: [],
    reviewedRecord: null,
    offProductName: null,
    rafScore: null,
    priceScore: null,
    healthScore: null,
    contentScore: null,
    sustainability: null,
    visibleAlternatives: [],
  };
}

// ── 1–4: dört alerjen durumu ──────────────────────────────────────────────────

scenario('1 declared_contains → "Beyana göre içerir" satırı, ton=declared', () => {
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: readableDeclaration(['gluten'], []), productDataView: USABLE_VIEW });
  assert(view.allergenGate.tone === 'declared', `declared bekleniyor, ${view.allergenGate.tone}`);
  assert(view.allergenGate.lines.some((l) => l.text === 'Beyana göre içerir: gluten'), 'declared satırı bulunamadı');
  assertNoForbiddenClaims(view.allergenGate.lines.map((l) => l.text));
});

scenario('2 trace_may_contain → "İçerebilir" satırı, ton=trace', () => {
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: readableDeclaration([], ['tree_nuts']), productDataView: USABLE_VIEW });
  assert(view.allergenGate.tone === 'trace', `trace bekleniyor, ${view.allergenGate.tone}`);
  assert(view.allergenGate.lines.some((l) => l.text === 'İçerebilir: tree_nuts'), 'trace satırı bulunamadı');
});

scenario('3 not_listed_in_available_data → sabit metin, "güvenli" çıkarımı yok', () => {
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: readableDeclaration([], []), productDataView: USABLE_VIEW });
  assert(view.allergenGate.tone === 'not_listed', `not_listed bekleniyor, ${view.allergenGate.tone}`);
  assert(
    view.allergenGate.lines[0].text ===
      'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.',
    'not_listed metni birebir eşleşmiyor',
  );
});

scenario('4 unknown_or_unverified (beyan absent) → sabit metin', () => {
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: ABSENT_DECLARATION, productDataView: USABLE_VIEW });
  assert(view.allergenGate.tone === 'unknown', `unknown bekleniyor, ${view.allergenGate.tone}`);
  assert(
    view.allergenGate.lines[0].text === 'Alerjen verisi yok veya doğrulanmamış. Güncel ambalaj etiketini kontrol edin.',
    'unknown metni birebir eşleşmiyor',
  );
});

scenario('4b unreadable beyan da unknown_or_unverified sayılır (absent ile aynı ton)', () => {
  const unreadable: AllergenDeclaration = { status: 'unreadable', declaredTags: [], traceTags: [], source: null };
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: unreadable, productDataView: USABLE_VIEW });
  assert(view.allergenGate.tone === 'unknown', `unreadable → unknown bekleniyor, ${view.allergenGate.tone}`);
});

// ── 5–6: ürün verisi durumları ────────────────────────────────────────────────

scenario('5 kısmi OFF verisi → dataTrust.status=partial, eksik alanlar listelenir', () => {
  const partial: ProductDataView = { ...USABLE_VIEW, state: 'partial', missingLabels: ['Ürün görseli', 'Nutri-Score'] };
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: ABSENT_DECLARATION, productDataView: partial });
  assert(view.dataTrust.status === 'partial', `partial bekleniyor, ${view.dataTrust.status}`);
  assert(view.dataTrust.missingLabels.length === 2, 'eksik alan listesi korunmalı');
});

scenario('6 OFF’ta bulunmayan ürün → dataTrust.status=not_found, missingDataAction görünür', () => {
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: ABSENT_DECLARATION, productDataView: null });
  assert(view.dataTrust.status === 'not_found', `not_found bekleniyor, ${view.dataTrust.status}`);
  assert(view.missingDataAction.visible === true, 'not_found durumunda eksik veri çağrısı görünür olmalı');
});

// ── 7–8: yerel inceleme adayı + kaynak çatışması ──────────────────────────────

function sampleReviewedRecord(overrides: Partial<LocallyReviewedRecord> = {}): LocallyReviewedRecord {
  return {
    id: 'r1',
    status: 'locally_reviewed_candidate',
    gtin: '8690000000010',
    draftId: 'd1',
    checks: [],
    evidence: [],
    allergenDeclaration: ABSENT_DECLARATION,
    allergenState: 'unknown_or_unverified',
    createdAt: '2026-09-19T10:00:00.000Z',
    boundary: { notVerified: 'not_rafskoru_verified', nextTask: 'rafskoru_verification', upload: 'no_upload_in_this_build' },
    ...overrides,
  };
}

scenario('7 yerel inceleme adayı → doğrulanmış ürün gibi SUNULMAZ, isLocallyReviewedCandidate=true', () => {
  const view = projectConsumerDecisionViewModel({
    ...baseInput(),
    allergenDeclaration: ABSENT_DECLARATION,
    productDataView: USABLE_VIEW,
    reviewedRecord: sampleReviewedRecord(),
  });
  assert(view.dataTrust.status === 'locally_reviewed_candidate', `locally_reviewed_candidate bekleniyor, ${view.dataTrust.status}`);
  assert(view.dataTrust.isLocallyReviewedCandidate === true, 'aday bayrağı true olmalı');
  assert(view.dataTrust.sourceLabel !== 'Open Food Facts', 'doğrulanmış OFF kaynağı gibi gösterilmemeli');
});

scenario('8 kaynak çatışması → OFF ve ambalaj değeri YAN YANA, otomatik kazanan yok', () => {
  const record = sampleReviewedRecord({
    checks: [
      {
        field: 'productName',
        decision: 'corrected',
        candidateEvidenceId: null,
        candidateText: 'Ambalaj Adı',
        reviewedText: 'Ambalaj Adı',
        photoEvidenceId: null,
        checkedAt: '2026-09-19T10:00:00.000Z',
        resultingEvidenceId: 'e1',
        ocrEvidence: null,
      },
    ],
  });
  const view = projectConsumerDecisionViewModel({
    ...baseInput(),
    allergenDeclaration: ABSENT_DECLARATION,
    productDataView: USABLE_VIEW,
    reviewedRecord: record,
    offProductName: 'OFF Adı',
  });
  assert(view.dataTrust.status === 'conflict', `conflict bekleniyor, ${view.dataTrust.status}`);
  assert(view.dataTrust.conflict !== null, 'conflict nesnesi dolu olmalı');
  assert(view.dataTrust.conflict!.offValue === 'OFF Adı', 'OFF değeri korunmalı');
  assert(view.dataTrust.conflict!.packagingValue === 'Ambalaj Adı', 'ambalaj değeri korunmalı');
});

scenario('8b aynı ad → çatışma YOK (yanlış pozitif üretmemeli)', () => {
  const record = sampleReviewedRecord({
    checks: [
      {
        field: 'productName',
        decision: 'confirmed',
        candidateEvidenceId: null,
        candidateText: 'Aynı Ad',
        reviewedText: 'Aynı Ad',
        photoEvidenceId: null,
        checkedAt: '2026-09-19T10:00:00.000Z',
        resultingEvidenceId: 'e2',
        ocrEvidence: null,
      },
    ],
  });
  const view = projectConsumerDecisionViewModel({
    ...baseInput(),
    allergenDeclaration: ABSENT_DECLARATION,
    productDataView: USABLE_VIEW,
    reviewedRecord: record,
    offProductName: 'Aynı Ad',
  });
  assert(view.dataTrust.status === 'locally_reviewed_candidate', `aynı adda conflict DEĞİL, locally_reviewed_candidate bekleniyor, ${view.dataTrust.status}`);
});

// ── Skor boyutları: sıfır puan yerine "veri yetersiz" ─────────────────────────

scenario('unavailable skor → scoreText=null, sıfır puan YOK', () => {
  const view = projectConsumerDecisionViewModel({
    ...baseInput(),
    allergenDeclaration: ABSENT_DECLARATION,
    productDataView: USABLE_VIEW,
    rafScore: { score: null, status: 'unavailable', confidence: 'low', weights: { price: 0.25, health: 0.25, content: 0.25, sustainability: 0.25 }, components: [], explanations: [], disclaimer: 'test' },
  });
  const raf = view.scoreDimensions.find((d) => d.key === 'raf')!;
  assert(raf.scoreText === null, `unavailable rafScore'da scoreText null olmalı, "${raf.scoreText}"`);
  assert(raf.isAvailable === false, 'isAvailable false olmalı');
  assert(!/\b0\/100\b/.test(raf.statusText), 'sıfır puan metni sızmamalı');
});

// ── Kritik alerjen uyarısı → karar özetini domine eder ────────────────────────

scenario('kritik profil uyarısı varsa karar özeti "caution" ve uyarıyı öne çıkarır', () => {
  const view = projectConsumerDecisionViewModel({
    ...baseInput(),
    allergenDeclaration: readableDeclaration(['peanuts'], []),
    productDataView: USABLE_VIEW,
    criticalProfileWarnings: [{ code: 'PROFILE_PEANUT_ALLERGEN_MATCH', title: 'Fıstık alerjisi uyarısı', message: 'Profilinizdeki fıstık alerjisiyle çakışıyor.', level: 'high' }],
  });
  assert(view.decisionSummary.tone === 'caution', `caution bekleniyor, ${view.decisionSummary.tone}`);
  assert(view.allergenGate.criticalNotices.length === 1, 'kritik uyarı görünür olmalı');
  assertNoForbiddenClaims([view.decisionSummary.headline, view.decisionSummary.supportingLine]);
});

// ── Alternatifler: başlık birebir, ek filtre yok ──────────────────────────────

scenario('alternatifler başlığı birebir "Aynı gruptan seçenekler"', () => {
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: ABSENT_DECLARATION, productDataView: USABLE_VIEW });
  assert(view.alternatives.title === 'Aynı gruptan seçenekler', `başlık beklenmedik: "${view.alternatives.title}"`);
});

// ── Dev fixture galerisi: 8 durum da isDevPreview taşır, üretime sızmaz ───────

scenario('devFixtures: 8 zorunlu durum mevcut ve hepsi isDevPreview=true', () => {
  assert(DEV_CONSUMER_DECISION_FIXTURES.length === 8, `8 fixture bekleniyor, ${DEV_CONSUMER_DECISION_FIXTURES.length}`);
  for (const entry of DEV_CONSUMER_DECISION_FIXTURES) {
    assert(entry.view.isDevPreview === true, `${entry.key}: isDevPreview true olmalı`);
  }
  const requiredKeys = [
    'declared_contains',
    'trace_may_contain',
    'not_listed_in_available_data',
    'unknown_or_unverified',
    'partial_off_data',
    'not_found',
    'locally_reviewed_candidate',
    'conflict',
  ];
  for (const key of requiredKeys) {
    assert(DEV_CONSUMER_DECISION_FIXTURES.some((e) => e.key === key), `fixture eksik: ${key}`);
  }
});

scenario('üretim view-model çıktısı her zaman isDevPreview=false', () => {
  const view = projectConsumerDecisionViewModel({ ...baseInput(), allergenDeclaration: ABSENT_DECLARATION, productDataView: USABLE_VIEW });
  assert(view.isDevPreview === false, 'üretim çıktısı isDevPreview=false olmalı');
});

// ── Koşucu ────────────────────────────────────────────────────────────────────

let failed = 0;
for (const check of checks) {
  try {
    check.run();
    console.log(`OK   ${check.name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${check.name}`);
    console.error(`     ${err instanceof Error ? err.message : String(err)}`);
  }
}
console.log(`\n${checks.length - failed}/${checks.length} senaryo geçti.`);
if (failed > 0) (process as { exitCode?: number }).exitCode = 1;
