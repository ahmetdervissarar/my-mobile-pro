/**
 * RafSkoru — Haftalık sepet saf senaryo çalıştırıcısı (Aşama 9 + odaklı düzeltme turu).
 * src/weeklyBasket/runWeeklyBasketScenarios.ts
 *
 * AsyncStorage taklidi GEREKMEZ — yalnız saf fonksiyonları (`basketOperations.ts`,
 * `basketViewModel.ts`, `basketStorage.ts::isValidBasketRecordShape`) doğrudan çağırır.
 * Derleme/çalıştırma:
 *   cd apps/mobile
 *   npx tsc src/weeklyBasket/runWeeklyBasketScenarios.ts --outDir /tmp/rafskoru-weekly-basket \
 *     --module commonjs --target es2020 --moduleResolution node --esModuleInterop --strict
 *   node /tmp/rafskoru-weekly-basket/weeklyBasket/runWeeklyBasketScenarios.js
 */

import { clearBasketLines, mergeLineIntoBasket, removeLineFromBasket, setLineQuantity, startNewWeek } from './basketOperations';
import { buildBasketLineSnapshotFromDecisionView, buildWeeklyBasketView } from './basketViewModel';
import { DEV_WEEKLY_BASKET_FIXTURES } from './basketDevFixtures';
import { isValidBasketRecordShape } from './basketShapeValidation';
import type { WeeklyBasketLineSnapshot, WeeklyBasketRecord } from './types';
import type { AllergenGateLine, AllergenGateView, ConsumerDecisionView, CriticalAllergenNotice, DataTrustView } from '../consumerUx/types';

const WEEK1_NOW = '2026-09-14T09:00:00.000Z'; // Pazartesi
const WEEK1_LATER_SAME_WEEK = '2026-09-18T09:00:00.000Z'; // aynı hafta, Cuma
const WEEK2_NOW = '2026-09-22T09:00:00.000Z'; // sonraki hafta, Salı

function allergenGate(tone: AllergenGateView['tone'], text: string, criticalNotices: CriticalAllergenNotice[] = []): AllergenGateView {
  return { tone, lines: [{ tone, text }], criticalNotices, a11ySummary: text };
}

function dataTrust(status: DataTrustView['status'], sourceLabel = 'Open Food Facts'): DataTrustView {
  return { status, sourceLabel, freshnessText: null, missingLabels: [], isLocallyReviewedCandidate: false, conflict: null };
}

function snapshot(
  productName: string,
  tone: AllergenGateView['tone'],
  opts?: { healthScore?: number | null; contentScore?: number | null; dataStatus?: DataTrustView['status']; criticalNotices?: CriticalAllergenNotice[] },
): WeeklyBasketLineSnapshot {
  const health = opts && 'healthScore' in opts ? opts.healthScore! : 60;
  const content = opts && 'contentScore' in opts ? opts.contentScore! : 70;
  return {
    productName,
    imageUrl: null,
    allergenGate: allergenGate(tone, `${tone} metni`, opts?.criticalNotices ?? []),
    dataTrust: dataTrust(opts?.dataStatus ?? 'usable'),
    healthScore: { isAvailable: health !== null, score: health },
    contentScore: { isAvailable: content !== null, score: content },
  };
}

/** Birden fazla alerjen kapısı satırı taşıyan ürünler için (declared + trace bir arada). */
function snapshotWithLines(productName: string, gateLines: AllergenGateLine[]): WeeklyBasketLineSnapshot {
  return {
    productName,
    imageUrl: null,
    allergenGate: { tone: gateLines[0].tone, lines: gateLines, criticalNotices: [], a11ySummary: gateLines.map((l) => l.text).join(' ') },
    dataTrust: dataTrust('usable'),
    healthScore: { isAvailable: true, score: 60 },
    contentScore: { isAvailable: true, score: 70 },
  };
}

const FORBIDDEN_CLAIMS = ['güvenli alternatif', 'alerjen içermez', 'ürün güvenlidir', 'garanti eder', 'sorun yok', 'sağlıklı alternatif', 'alerjensiz', 'sepet güvenli', 'çakışması görünmüyor'];

function assertNoForbiddenClaims(label: string, haystack: string): void {
  for (const claim of FORBIDDEN_CLAIMS) {
    if (haystack.toLocaleLowerCase('tr-TR').includes(claim.toLocaleLowerCase('tr-TR'))) {
      throw new Error(`${label}: yasaklı ifade bulundu: "${claim}"`);
    }
  }
}

let passed = 0;
let failed = 0;

function scenario(id: string, fn: () => void): void {
  try {
    fn();
    console.log(`OK   ${id}`);
    passed += 1;
  } catch (err) {
    console.log(`FAIL ${id} — ${(err as Error).message}`);
    failed += 1;
  }
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`${label}: beklenen ${JSON.stringify(expected)}, gelen ${JSON.stringify(actual)}`);
  }
}

function assertTrue(label: string, cond: boolean): void {
  if (!cond) throw new Error(`${label}: koşul sağlanmadı`);
}

// ── 1. Boş sepete ekleme → sepet oluşturur, tek satır qty=1 ────────────────────────────
scenario('1 boş sepete ekleme → basketId/weekStart/createdAt/updatedAt dolu, 1 satır qty=1', () => {
  const outcome = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW);
  assertEqual('status', outcome.status, 'added');
  const next = outcome.basket;
  assertTrue('basketId', Boolean(next.basketId));
  assertTrue('weekStart', Boolean(next.weekStart));
  assertEqual('createdAt', next.createdAt, WEEK1_NOW);
  assertEqual('updatedAt', next.updatedAt, WEEK1_NOW);
  assertEqual('lines.length', next.lines.length, 1);
  assertEqual('qty', next.lines[0].quantity, 1);
});

// ── 2. Aynı GTIN tekrar eklenirse yeni satır açmaz, miktarı artırır ─────────────────────
scenario('2 aynı GTIN tekrar eklenince yeni satır açılmaz, miktar artar', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  assertEqual('lines.length', basket.lines.length, 1);
  assertEqual('qty', basket.lines[0].quantity, 3);
});

// ── 3. Farklı GTIN → 2 ayrı satır ───────────────────────────────────────────────────────
scenario('3 farklı GTIN eklenince 2 ayrı satır oluşur', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '8690000000002', snapshot('Ürün B', 'declared'), WEEK1_NOW).basket;
  assertEqual('lines.length', basket.lines.length, 2);
});

// ── 4. setLineQuantity artırma/azaltma ──────────────────────────────────────────────────
scenario('4 setLineQuantity ile miktar değişir', () => {
  let basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  basket = setLineQuantity(basket, '8690000000001', 5, WEEK1_NOW);
  assertEqual('qty=5', basket.lines[0].quantity, 5);
  basket = setLineQuantity(basket, '8690000000001', 2, WEEK1_NOW);
  assertEqual('qty=2', basket.lines[0].quantity, 2);
});

// ── 5. setLineQuantity 0/negatif → en az 1'e kenetlenir ─────────────────────────────────
scenario('5 setLineQuantity 0/negatif değer en az 1e kenetlenir', () => {
  let basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  basket = setLineQuantity(basket, '8690000000001', 0, WEEK1_NOW);
  assertEqual('qty clamp 0→1', basket.lines[0].quantity, 1);
  basket = setLineQuantity(basket, '8690000000001', -3, WEEK1_NOW);
  assertEqual('qty clamp -3→1', basket.lines[0].quantity, 1);
});

// ── 6. removeLineFromBasket yalnız hedef satırı kaldırır ────────────────────────────────
scenario('6 removeLineFromBasket yalnız hedef GTINi kaldırır, diğerleri kalır', () => {
  let basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '8690000000002', snapshot('Ürün B', 'declared'), WEEK1_NOW).basket;
  const next = removeLineFromBasket(basket, '8690000000001', WEEK1_NOW);
  assertEqual('lines.length', next.lines.length, 1);
  assertEqual('remaining gtin', next.lines[0].gtin, '8690000000002');
});

// ── 7. clearBasketLines lines'ı boşaltır, basketId/weekStart korunur ───────────────────
scenario('7 clearBasketLines lines boşaltır, basketId/weekStart korunur', () => {
  const basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), WEEK1_NOW).basket;
  const cleared = clearBasketLines(basket, WEEK1_NOW);
  assertEqual('lines.length', cleared.lines.length, 0);
  assertEqual('basketId korunur', cleared.basketId, basket.basketId);
  assertEqual('weekStart korunur', cleared.weekStart, basket.weekStart);
});

// ── 8. Boş sepet görünümü → isEmpty true, dimensionCoverage boş, 4 alerjen grubu sıfır ──
scenario('8 buildWeeklyBasketView(null) → isEmpty, dimensionCoverage=[], 4 grup sayısı 0', () => {
  const view = buildWeeklyBasketView(null, { now: WEEK1_NOW });
  assertTrue('isEmpty', view.isEmpty);
  assertEqual('dimensionCoverage.length', view.dimensionCoverage.length, 0);
  assertEqual('allergenSummary.groups.length', view.allergenSummary.groups.length, 4);
  for (const g of view.allergenSummary.groups) assertEqual(`group ${g.key} count`, g.count, 0);
});

// ── 9. Alerjen özeti: dört BEYAN durumu AYRI sayılır, birleştirilmez ────────────────────
scenario('9 alerjen özeti dört durumu ayrı sayar, isimlerle listeler', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '1', snapshot('Deklare Ürün', 'declared'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '2', snapshot('İz Ürünü', 'trace'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '3', snapshot('Bilinmeyen Ürün', 'unknown'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '4', snapshot('Belirtilmemiş Ürün', 'not_listed'), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  const byKey = Object.fromEntries(view.allergenSummary.groups.map((g) => [g.key, g]));
  assertEqual('declared count', byKey.declared.count, 1);
  assertEqual('declared name', byKey.declared.productNames[0], 'Deklare Ürün');
  assertEqual('trace count', byKey.trace.count, 1);
  assertEqual('unknown count', byKey.unknown.count, 1);
  assertEqual('not_listed count', byKey.not_listed.count, 1);
  // Yeniden adlandırılmış grup etiketleri, profil iddiası taşımamalı.
  assertEqual('declared label', byKey.declared.label, 'Beyan edilmiş alerjen bulunan ürünler');
  assertEqual('not_listed label', byKey.not_listed.label, 'Mevcut kayıtta alerjen belirtilmemiş ürünler');
});

// ── 10. Boyut kapsamı: eksik ürün ortalamaya sıfır olarak katılmaz, "hesaplanamadı" yazar ─
scenario('10 health boyutu: 2/3 üründe veri var, eksik ürün "hesaplanamadı" ile ayrı sayılır', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '1', snapshot('A', 'not_listed', { healthScore: 80 }), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'not_listed', { healthScore: 60 }), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '3', snapshot('C', 'not_listed', { healthScore: null }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  const health = view.dimensionCoverage.find((d) => d.key === 'health')!;
  assertEqual('coveredCountText', health.coveredCountText, '2/3 ürün');
  assertEqual('averageText (80+60)/2=70', health.averageText, '70/100 ortalama');
  assertEqual('missingCountText "hesaplanamadı"', health.missingCountText, '1 üründe bu boyut hesaplanamadı');
});

// ── 11. Boyut kapsamı: sıfır ürün mevcutsa "Bu boyut için veri yetersiz" ────────────────
scenario('11 hiçbir üründe health verisi yoksa isAvailable=false, averageText=null', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '1', snapshot('A', 'not_listed', { healthScore: null }), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'not_listed', { healthScore: null }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  const health = view.dimensionCoverage.find((d) => d.key === 'health')!;
  assertTrue('isAvailable=false', !health.isAvailable);
  assertEqual('averageText=null', health.averageText, null);
});

// ── 12. Veri kapsamı: beş kategori AYRI sayılır (kullanılabilir/kısmi/çatışma/aday/bulunamadı) ─
scenario('12 veri kapsamı: 5 kategori ayrı sayılır, "kullanılabilir veri" etiketi kullanılır', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '1', snapshot('A', 'not_listed', { dataStatus: 'usable' }), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'not_listed', { dataStatus: 'partial' }), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '3', snapshot('C', 'not_listed', { dataStatus: 'conflict' }), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '4', snapshot('D', 'not_listed', { dataStatus: 'locally_reviewed_candidate' }), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '5', snapshot('E', 'not_listed', { dataStatus: 'not_found' }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  const coverage = view.dimensionCoverage.find((d) => d.key === 'dataCoverage')!;
  assertEqual('coveredCountText', coverage.coveredCountText, '1/5 ürün kullanılabilir veri');
  assertTrue('breakdown var', Array.isArray(coverage.breakdown));
  const byKey = Object.fromEntries((coverage.breakdown ?? []).map((b) => [b.key, b.count]));
  assertEqual('usable', byKey.usable, 1);
  assertEqual('partial', byKey.partial, 1);
  assertEqual('conflict', byKey.conflict, 1);
  assertEqual('locally_reviewed_candidate', byKey.locally_reviewed_candidate, 1);
  assertEqual('not_found_or_unloaded', byKey.not_found_or_unloaded, 1);
});

// ── 13. Sepet genelinde tek/bağlamsız bir puan alanı YOK (yapısal denetim) ──────────────
scenario('13 WeeklyBasketView yapısında tek bir "sepet puanı" alanı yok', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW }) as unknown as Record<string, unknown>;
  const forbiddenKeys = ['overallScore', 'basketScore', 'totalScore', 'averageScore', 'score'];
  for (const key of forbiddenKeys) {
    if (key in view) throw new Error(`WeeklyBasketView içinde beklenmeyen alan: ${key}`);
  }
});

// ── 14. Yasaklı iddia taraması (basket view JSON) ───────────────────────────────────────
scenario('14 yasaklı iddia taraması (basket view JSON)', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '1', snapshot('A', 'declared'), WEEK1_NOW).basket;
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'trace'), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  assertNoForbiddenClaims('buildWeeklyBasketView JSON', JSON.stringify(view));
});

// ── 15. buildBasketLineSnapshotFromDecisionView: mevcut projeksiyonu kopyalar ───────────
scenario('15 buildBasketLineSnapshotFromDecisionView mevcut ConsumerDecisionView alanlarını kopyalar', () => {
  const decisionView: ConsumerDecisionView = {
    identity: { name: 'Test Ürünü', barcode: '8690000000099', imageUrl: 'https://example.invalid/x.png', isLoading: false },
    allergenGate: allergenGate('declared', 'Beyana göre içerir: gluten'),
    decisionSummary: { tone: 'caution', headline: 'x', supportingLine: 'y' },
    dataTrust: dataTrust('usable'),
    scoreDimensions: [],
    missingDataAction: { visible: false, headline: '', body: '' },
    alternatives: { title: 'Aynı gruptan seçenekler', items: [], emptyNotice: null },
    basket: { addLabel: 'Sepete ekle', openLabel: 'Sepete git' },
    isDevPreview: false,
  };
  const snap = buildBasketLineSnapshotFromDecisionView(decisionView, { status: 'ok', score: 55 }, { status: 'unavailable', score: null });
  assertEqual('productName kopyalanır', snap.productName, 'Test Ürünü');
  assertEqual('imageUrl kopyalanır', snap.imageUrl, 'https://example.invalid/x.png');
  assertEqual('allergenGate.tone kopyalanır', snap.allergenGate.tone, 'declared');
  assertEqual('dataTrust.status kopyalanır', snap.dataTrust.status, 'usable');
  assertTrue('healthScore.isAvailable=true (status ok, score dolu)', snap.healthScore.isAvailable);
  assertEqual('healthScore.score', snap.healthScore.score, 55);
  assertTrue('contentScore.isAvailable=false (status unavailable)', !snap.contentScore.isAvailable);
});

// ── 16. Dev fixture bütünlüğü: 8 zorunlu durum mevcut, hepsi isDevPreview=true ──────────
scenario('16 DEV_WEEKLY_BASKET_FIXTURES: 8 zorunlu durum + hepsi isDevPreview=true', () => {
  const requiredKeys = [
    'empty_basket',
    'multi_item_basket',
    'declared_match',
    'trace_warning',
    'missing_allergen_data',
    'partial_score_coverage',
    'same_gtin_quantity_increment',
    'persistence_error',
  ];
  assertEqual('fixture count', DEV_WEEKLY_BASKET_FIXTURES.length, 8);
  for (const key of requiredKeys) {
    const entry = DEV_WEEKLY_BASKET_FIXTURES.find((f) => f.key === key);
    assertTrue(`fixture bulunur: ${key}`, Boolean(entry));
    assertTrue(`fixture isDevPreview=true: ${key}`, entry!.view.isDevPreview);
    assertTrue(`fixture isCurrentWeek=true (NOW ile aynı hafta): ${key}`, entry!.view.isCurrentWeek);
  }
  assertNoForbiddenClaims('DEV_WEEKLY_BASKET_FIXTURES JSON', JSON.stringify(DEV_WEEKLY_BASKET_FIXTURES));
});

// ══════════════════════════════════════════════════════════════════════════════════════
// Düzeltme turu — Sorun 1: Gerçek hafta geçişi
// ══════════════════════════════════════════════════════════════════════════════════════

// ── 17. Aynı haftada ekleme çalışır ─────────────────────────────────────────────────────
scenario('17 [hafta] aynı haftada ikinci ekleme normal çalışır', () => {
  const first = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW);
  assertEqual('ilk ekleme status', first.status, 'added');
  const second = mergeLineIntoBasket(first.basket, '2', snapshot('B', 'declared'), WEEK1_LATER_SAME_WEEK);
  assertEqual('aynı hafta içinde ikinci ekleme status', second.status, 'added');
  assertEqual('lines.length', second.basket.lines.length, 2);
});

// ── 18. Hafta değişince ekleme reddedilir, eski kayıt DEĞİŞMEZ ─────────────────────────
scenario('18 [hafta] hafta değişince ekleme reddedilir (week_mismatch), eski kayıt korunur', () => {
  const first = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW);
  const week1Basket = first.basket;
  const attempt = mergeLineIntoBasket(week1Basket, '2', snapshot('B', 'declared'), WEEK2_NOW);
  assertEqual('status', attempt.status, 'week_mismatch');
  assertEqual('basket DEĞİŞMEDİ (referans/lines aynı)', attempt.basket.lines.length, 1);
  assertEqual('basket DEĞİŞMEDİ (updatedAt aynı)', attempt.basket.updatedAt, week1Basket.updatedAt);
  assertEqual('basket DEĞİŞMEDİ (aynı obje)', attempt.basket, week1Basket);
});

// ── 19. Kullanıcı onayından sonra yeni haftalık boş sepet oluşur ───────────────────────
scenario('19 [hafta] startNewWeek onay sonrası yeni, boş, mevcut haftaya ait sepet oluşturur', () => {
  const oldWeekBasket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const fresh = startNewWeek(WEEK2_NOW);
  assertEqual('yeni sepet boş', fresh.lines.length, 0);
  assertTrue('yeni sepet farklı haftaya ait', fresh.weekStart !== oldWeekBasket.weekStart);
  assertEqual('yeni sepet mevcut (WEEK2) haftasına ait', fresh.weekStart, mergeLineIntoBasket(null, 'x', snapshot('X', 'not_listed'), WEEK2_NOW).basket.weekStart);
});

// ── 20. Yeni ürünü ancak startNewWeek'ten SONRA eklemek mümkün olur ─────────────────────
scenario('20 [hafta] startNewWeek sonrası yeni ürün eklemek artık mümkün', () => {
  const oldWeekBasket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const rejected = mergeLineIntoBasket(oldWeekBasket, '2', snapshot('B', 'declared'), WEEK2_NOW);
  assertEqual('startNewWeek öncesi ekleme reddedilir', rejected.status, 'week_mismatch');
  const fresh = startNewWeek(WEEK2_NOW);
  const afterNewWeek = mergeLineIntoBasket(fresh, '2', snapshot('B', 'declared'), WEEK2_NOW);
  assertEqual('startNewWeek sonrası ekleme kabul edilir', afterNewWeek.status, 'added');
  assertEqual('yeni sepette 1 satır', afterNewWeek.basket.lines.length, 1);
});

// ── 21. buildWeeklyBasketView: eski hafta banner sinyali (isCurrentWeek) ───────────────
scenario('21 [hafta] buildWeeklyBasketView farklı haftadaki kaydı isCurrentWeek=false ile işaretler', () => {
  const oldWeekBasket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const viewSameWeek = buildWeeklyBasketView(oldWeekBasket, { now: WEEK1_LATER_SAME_WEEK });
  assertTrue('aynı hafta içinde isCurrentWeek=true', viewSameWeek.isCurrentWeek);
  const viewNextWeek = buildWeeklyBasketView(oldWeekBasket, { now: WEEK2_NOW });
  assertTrue('sonraki haftada isCurrentWeek=false', !viewNextWeek.isCurrentWeek);
  assertTrue('weekRangeText hâlâ gösterilir', Boolean(viewNextWeek.weekRangeText));
});

// ══════════════════════════════════════════════════════════════════════════════════════
// Düzeltme turu — Sorun 2: Depolama okuma hatası saf şekil doğrulaması
// ══════════════════════════════════════════════════════════════════════════════════════

scenario('22 [depolama] isValidBasketRecordShape: geçerli kayıt kabul edilir', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  assertTrue('geçerli kayıt', isValidBasketRecordShape(basket));
});

scenario('23 [depolama] isValidBasketRecordShape: eksik/boş gtin reddedilir', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const corrupted = { ...basket, lines: [{ ...basket.lines[0], gtin: '' }] };
  assertTrue('boş gtin reddedilir', !isValidBasketRecordShape(corrupted));
});

scenario('24 [depolama] isValidBasketRecordShape: pozitif olmayan quantity reddedilir', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const zeroQty = { ...basket, lines: [{ ...basket.lines[0], quantity: 0 }] };
  const negativeQty = { ...basket, lines: [{ ...basket.lines[0], quantity: -2 }] };
  const floatQty = { ...basket, lines: [{ ...basket.lines[0], quantity: 1.5 }] };
  assertTrue('quantity=0 reddedilir', !isValidBasketRecordShape(zeroQty));
  assertTrue('quantity=-2 reddedilir', !isValidBasketRecordShape(negativeQty));
  assertTrue('quantity=1.5 reddedilir', !isValidBasketRecordShape(floatQty));
});

scenario('25 [depolama] isValidBasketRecordShape: eksik alan/yanlış tip/dizi-olmayan lines reddedilir', () => {
  assertTrue('null reddedilir', !isValidBasketRecordShape(null));
  assertTrue('boş obje reddedilir', !isValidBasketRecordShape({}));
  assertTrue('weekStart formatı yanlışsa reddedilir', !isValidBasketRecordShape({ basketId: 'x', weekStart: 'not-a-date', createdAt: 'x', updatedAt: 'x', lines: [] }));
  assertTrue('lines dizi değilse reddedilir', !isValidBasketRecordShape({ basketId: 'x', weekStart: '2026-09-14', createdAt: 'x', updatedAt: 'x', lines: 'nope' }));
});

// ══════════════════════════════════════════════════════════════════════════════════════
// Düzeltme turu — Sorun 3: Ürün beyanı ile profil çakışmasını ayır
// ══════════════════════════════════════════════════════════════════════════════════════

scenario('26 [profil] süt beyanı var, profilde yalnız yer fıstığı → beyan grubunda GÖRÜNÜR, kritik bölümde GÖRÜNMEZ', () => {
  // criticalNotices BOŞ: riskEngine, kullanıcının profilinde (yalnız yer fıstığı) süt eşleşmesi üretmedi.
  const basket = mergeLineIntoBasket(null, '1', snapshot('Süt Kremalı Bisküvi', 'declared', { criticalNotices: [] }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  const declaredGroup = view.allergenSummary.groups.find((g) => g.key === 'declared')!;
  assertEqual('beyan grubunda görünür', declaredGroup.count, 1);
  assertEqual('beyan grubunda ürün adı', declaredGroup.productNames[0], 'Süt Kremalı Bisküvi');
  assertTrue('kritik/profil bölümü boş', view.criticalAllergen.isEmpty);
  assertEqual('kritik/profil bölümünde ürün yok', view.criticalAllergen.items.length, 0);
});

scenario('27 [profil] criticalNotices bulunan ürün profil uyarısı bölümünde görünür', () => {
  const notice: CriticalAllergenNotice = { code: 'PROFILE_MILK_ALLERGEN_MATCH', title: 'Süt alerjisi uyarısı', message: 'Profilinizle eşleşen süt beyanı.' };
  const basket = mergeLineIntoBasket(null, '1', snapshot('Süt Kremalı Bisküvi', 'declared', { criticalNotices: [notice] }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  assertTrue('kritik bölüm dolu', !view.criticalAllergen.isEmpty);
  assertEqual('1 ürün listelenir', view.criticalAllergen.items.length, 1);
  assertEqual('ürün adı', view.criticalAllergen.items[0].productName, 'Süt Kremalı Bisküvi');
  assertEqual('notice title kopyalanır', view.criticalAllergen.items[0].notices[0].title, 'Süt alerjisi uyarısı');
});

scenario('28 [profil] kritik uyarı olmayan sepet için güvenlik sonucu YAZILMAZ (yasaklı iddia taraması)', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed', { criticalNotices: [] }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  assertTrue('kritik bölüm boş', view.criticalAllergen.isEmpty);
  assertNoForbiddenClaims('criticalAllergen (boş) JSON', JSON.stringify(view.criticalAllergen));
  // Olumsuzlama çerçevesi korunmalı: "güvenli" kelimesi yalnız "...anlamına gelmez" negasyonunda geçebilir.
  assertTrue('emptyNotice "güvenli" kelimesini yalnız negasyonla kullanır', view.criticalAllergen.emptyNotice.includes('anlamına gelmez'));
});

scenario('29 [profil] eski "çakışması görünmüyor" ifadesi tamamen kaldırıldı', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  assertNoForbiddenClaims('allergenSummary JSON', JSON.stringify(view.allergenSummary));
});

// ══════════════════════════════════════════════════════════════════════════════════════
// Düzeltme turu — Sorun 4: Veri kapsamı ve ortalama dili
// ══════════════════════════════════════════════════════════════════════════════════════

scenario('30 [dil] dimensionMethodologyNote "basit ortalama" ve "miktar/tüketim sıklığı" ifadelerini taşır', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  assertTrue('not boş değil', Boolean(view.dimensionMethodologyNote));
  assertTrue('"basit ortalama" geçer', view.dimensionMethodologyNote!.includes('basit ortalama'));
  assertTrue('"miktar ve tüketim sıklığı hesaba katılmaz" geçer', view.dimensionMethodologyNote!.includes('miktar ve tüketim sıklığı hesaba katılmaz'));
});

scenario('31 [dil] per-satır dataStatusLabel: usable → "Kullanılabilir veri" (ARTIK "tam veri" değil)', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed', { dataStatus: 'usable' }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  assertEqual('dataStatusLabel', view.lines[0].dataStatusLabel, 'Kullanılabilir veri');
});

// ══════════════════════════════════════════════════════════════════════════════════════
// Odaklı düzeltme turu — Alerjen sayım düzeltmesi (dominant tone → lines bazlı gruplama)
// ══════════════════════════════════════════════════════════════════════════════════════

scenario('32 [alerjen sayım] declared VE trace satırı olan ürün İKİ grupta da tam birer kez görünür', () => {
  const dualLine = snapshotWithLines('Karışık Beyan Ürünü', [
    { tone: 'declared', text: 'Beyana göre içerir: milk' },
    { tone: 'trace', text: 'İçerebilir: nuts' },
  ]);
  const basket = mergeLineIntoBasket(null, '1', dualLine, WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  const byKey = Object.fromEntries(view.allergenSummary.groups.map((g) => [g.key, g]));
  assertEqual('declared grubunda 1 kez', byKey.declared.count, 1);
  assertEqual('declared grubunda ürün adı', byKey.declared.productNames[0], 'Karışık Beyan Ürünü');
  assertEqual('trace grubunda 1 kez', byKey.trace.count, 1);
  assertEqual('trace grubunda ürün adı', byKey.trace.productNames[0], 'Karışık Beyan Ürünü');
  assertEqual('unknown grubunda yok', byKey.unknown.count, 0);
  assertEqual('not_listed grubunda yok', byKey.not_listed.count, 0);
  assertTrue('disclaimer "birbirini dışlamaz" içerir', view.allergenSummary.disclaimer.includes('birbirini dışlamaz'));
});

scenario('33 [alerjen sayım] kritik profil uyarısı yoksa olumlu güvenlik sonucu üretilmez (zaman açısından kesin metin)', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed', { criticalNotices: [] }), WEEK1_NOW).basket;
  const view = buildWeeklyBasketView(basket, { now: WEEK1_NOW });
  assertEqual(
    'emptyNotice birebir yeni metin',
    view.criticalAllergen.emptyNotice,
    'Sepete eklenme anında kaydedilmiş kritik profil uyarısı yok. Bu, ürünlerin güvenli olduğu anlamına gelmez; profilinizi değiştirdiyseniz ürünleri ve güncel etiketleri yeniden kontrol edin.',
  );
  assertNoForbiddenClaims('criticalAllergen (boş) JSON', JSON.stringify(view.criticalAllergen));
});

console.log(`\n${passed}/${passed + failed} senaryo geçti.`);
if (failed > 0) process.exitCode = 1;
