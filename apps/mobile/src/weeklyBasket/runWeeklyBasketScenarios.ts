/**
 * RafSkoru — Haftalık sepet saf senaryo çalıştırıcısı (Aşama 9).
 * src/weeklyBasket/runWeeklyBasketScenarios.ts
 *
 * AsyncStorage taklidi GEREKMEZ — yalnız saf fonksiyonları (`basketOperations.ts`,
 * `basketViewModel.ts`) doğrudan çağırır. Derleme/çalıştırma:
 *   cd apps/mobile
 *   npx tsc src/weeklyBasket/runWeeklyBasketScenarios.ts --outDir /tmp/rafskoru-weekly-basket \
 *     --module commonjs --target es2020 --moduleResolution node --esModuleInterop --strict
 *   node /tmp/rafskoru-weekly-basket/weeklyBasket/runWeeklyBasketScenarios.js
 */

import { clearBasketLines, mergeLineIntoBasket, removeLineFromBasket, setLineQuantity } from './basketOperations';
import { buildBasketLineSnapshotFromDecisionView, buildWeeklyBasketView } from './basketViewModel';
import { DEV_WEEKLY_BASKET_FIXTURES } from './basketDevFixtures';
import type { WeeklyBasketLineSnapshot, WeeklyBasketRecord } from './types';
import type { AllergenGateView, ConsumerDecisionView, DataTrustView } from '../consumerUx/types';

const NOW = '2026-09-19T12:00:00.000Z';

function allergenGate(tone: AllergenGateView['tone'], text: string): AllergenGateView {
  return { tone, lines: [{ tone, text }], criticalNotices: [], a11ySummary: text };
}

function dataTrust(status: DataTrustView['status'], sourceLabel = 'Open Food Facts'): DataTrustView {
  return { status, sourceLabel, freshnessText: null, missingLabels: [], isLocallyReviewedCandidate: false, conflict: null };
}

function snapshot(productName: string, tone: AllergenGateView['tone'], opts?: { healthScore?: number | null; contentScore?: number | null; dataStatus?: DataTrustView['status'] }): WeeklyBasketLineSnapshot {
  const health = opts && 'healthScore' in opts ? opts.healthScore! : 60;
  const content = opts && 'contentScore' in opts ? opts.contentScore! : 70;
  return {
    productName,
    imageUrl: null,
    allergenGate: allergenGate(tone, `${tone} metni`),
    dataTrust: dataTrust(opts?.dataStatus ?? 'usable'),
    healthScore: { isAvailable: health !== null, score: health },
    contentScore: { isAvailable: content !== null, score: content },
  };
}

const FORBIDDEN_CLAIMS = ['güvenli alternatif', 'alerjen içermez', 'ürün güvenlidir', 'garanti eder', 'sorun yok', 'sağlıklı alternatif', 'alerjensiz', 'sepet güvenli'];

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

// 1. Boş sepete ürün ekleme → sepet oluşturur, tek satır qty=1
scenario('1 boş sepete ekleme → basketId/weekStart/createdAt/updatedAt dolu, 1 satır qty=1', () => {
  const next = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  assertTrue('basketId', Boolean(next.basketId));
  assertTrue('weekStart', Boolean(next.weekStart));
  assertEqual('createdAt', next.createdAt, NOW);
  assertEqual('updatedAt', next.updatedAt, NOW);
  assertEqual('lines.length', next.lines.length, 1);
  assertEqual('qty', next.lines[0].quantity, 1);
});

// 2. Aynı GTIN tekrar eklenirse yeni satır açmaz, miktarı artırır
scenario('2 aynı GTIN tekrar eklenince yeni satır açılmaz, miktar artar', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  assertEqual('lines.length', basket.lines.length, 1);
  assertEqual('qty', basket.lines[0].quantity, 3);
});

// 3. Farklı GTIN → 2 ayrı satır
scenario('3 farklı GTIN eklenince 2 ayrı satır oluşur', () => {
  let basket: WeeklyBasketRecord | null = null;
  basket = mergeLineIntoBasket(basket, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  basket = mergeLineIntoBasket(basket, '8690000000002', snapshot('Ürün B', 'declared'), NOW);
  assertEqual('lines.length', basket.lines.length, 2);
});

// 4. setLineQuantity artırma/azaltma
scenario('4 setLineQuantity ile miktar değişir', () => {
  let basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  basket = setLineQuantity(basket, '8690000000001', 5, NOW);
  assertEqual('qty=5', basket.lines[0].quantity, 5);
  basket = setLineQuantity(basket, '8690000000001', 2, NOW);
  assertEqual('qty=2', basket.lines[0].quantity, 2);
});

// 5. setLineQuantity 0 veya negatif → en az 1'e kenetlenir (silme sayılmaz)
scenario('5 setLineQuantity 0/negatif değer en az 1e kenetlenir', () => {
  let basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  basket = setLineQuantity(basket, '8690000000001', 0, NOW);
  assertEqual('qty clamp 0→1', basket.lines[0].quantity, 1);
  basket = setLineQuantity(basket, '8690000000001', -3, NOW);
  assertEqual('qty clamp -3→1', basket.lines[0].quantity, 1);
});

// 6. removeLineFromBasket yalnız hedef satırı kaldırır
scenario('6 removeLineFromBasket yalnız hedef GTINi kaldırır, diğerleri kalır', () => {
  let basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  basket = mergeLineIntoBasket(basket, '8690000000002', snapshot('Ürün B', 'declared'), NOW);
  const next = removeLineFromBasket(basket, '8690000000001', NOW);
  assertEqual('lines.length', next.lines.length, 1);
  assertEqual('remaining gtin', next.lines[0].gtin, '8690000000002');
});

// 7. clearBasketLines lines'ı boşaltır, basketId/weekStart korunur
scenario('7 clearBasketLines lines boşaltır, basketId/weekStart korunur', () => {
  const basket = mergeLineIntoBasket(null, '8690000000001', snapshot('Ürün A', 'not_listed'), NOW);
  const cleared = clearBasketLines(basket, NOW);
  assertEqual('lines.length', cleared.lines.length, 0);
  assertEqual('basketId korunur', cleared.basketId, basket.basketId);
  assertEqual('weekStart korunur', cleared.weekStart, basket.weekStart);
});

// 8. Boş sepet görünümü → isEmpty true, dimensionCoverage boş, 4 alerjen grubu sıfır
scenario('8 buildWeeklyBasketView(null) → isEmpty, dimensionCoverage=[], 4 grup sayısı 0', () => {
  const view = buildWeeklyBasketView(null);
  assertTrue('isEmpty', view.isEmpty);
  assertEqual('dimensionCoverage.length', view.dimensionCoverage.length, 0);
  assertEqual('allergenSummary.groups.length', view.allergenSummary.groups.length, 4);
  for (const g of view.allergenSummary.groups) assertEqual(`group ${g.key} count`, g.count, 0);
});

// 9. Alerjen özeti: dört durum AYRI sayılır, birleştirilmez
scenario('9 alerjen özeti dört durumu ayrı sayar, isimlerle listeler', () => {
  let basket = mergeLineIntoBasket(null, '1', snapshot('Deklare Ürün', 'declared'), NOW);
  basket = mergeLineIntoBasket(basket, '2', snapshot('İz Ürünü', 'trace'), NOW);
  basket = mergeLineIntoBasket(basket, '3', snapshot('Bilinmeyen Ürün', 'unknown'), NOW);
  basket = mergeLineIntoBasket(basket, '4', snapshot('Belirtilmemiş Ürün', 'not_listed'), NOW);
  const view = buildWeeklyBasketView(basket);
  const byKey = Object.fromEntries(view.allergenSummary.groups.map((g) => [g.key, g]));
  assertEqual('declared count', byKey.declared.count, 1);
  assertEqual('declared name', byKey.declared.productNames[0], 'Deklare Ürün');
  assertEqual('trace count', byKey.trace.count, 1);
  assertEqual('unknown count', byKey.unknown.count, 1);
  assertEqual('not_listed count', byKey.not_listed.count, 1);
});

// 10. Boyut kapsamı: kısmi kullanılabilirlik → ortalama yalnız mevcut puanlardan, eksik sayılır (sıfır DEĞİL)
scenario('10 health boyutu: 2/3 üründe veri var, eksik ürün ortalamaya sıfır olarak katılmaz', () => {
  let basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed', { healthScore: 80 }), NOW);
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'not_listed', { healthScore: 60 }), NOW);
  basket = mergeLineIntoBasket(basket, '3', snapshot('C', 'not_listed', { healthScore: null }), NOW);
  const view = buildWeeklyBasketView(basket);
  const health = view.dimensionCoverage.find((d) => d.key === 'health')!;
  assertEqual('coveredCountText', health.coveredCountText, '2/3 ürün');
  assertEqual('averageText (80+60)/2=70', health.averageText, '70/100 ortalama');
  assertEqual('missingCountText', health.missingCountText, '1 üründe veri yok');
});

// 11. Boyut kapsamı: sıfır ürün mevcutsa "Bu boyut için veri yetersiz" durumuna düşer (isAvailable=false)
scenario('11 hiçbir üründe health verisi yoksa isAvailable=false, averageText=null', () => {
  let basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed', { healthScore: null }), NOW);
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'not_listed', { healthScore: null }), NOW);
  const view = buildWeeklyBasketView(basket);
  const health = view.dimensionCoverage.find((d) => d.key === 'health')!;
  assertTrue('isAvailable=false', !health.isAvailable);
  assertEqual('averageText=null', health.averageText, null);
});

// 12. Veri kapsamı boyutu: yalnız 'usable' durumundaki ürünler kapsanmış sayılır
scenario('12 veri kapsamı: yalnız usable durumundakiler kapsanmış sayılır', () => {
  let basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed', { dataStatus: 'usable' }), NOW);
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'not_listed', { dataStatus: 'partial' }), NOW);
  basket = mergeLineIntoBasket(basket, '3', snapshot('C', 'not_listed', { dataStatus: 'not_found' }), NOW);
  const view = buildWeeklyBasketView(basket);
  const coverage = view.dimensionCoverage.find((d) => d.key === 'dataCoverage')!;
  assertEqual('coveredCountText', coverage.coveredCountText, '1/3 ürün tam veri');
  assertEqual('missingCountText', coverage.missingCountText, '2 üründe veri eksik/doğrulanmamış');
});

// 13. Sepet genelinde tek/bağlamsız bir puan alanı YOK (yapısal denetim)
scenario('13 WeeklyBasketView yapısında tek bir "sepet puanı" alanı yok', () => {
  const basket = mergeLineIntoBasket(null, '1', snapshot('A', 'not_listed'), NOW);
  const view = buildWeeklyBasketView(basket) as unknown as Record<string, unknown>;
  const forbiddenKeys = ['overallScore', 'basketScore', 'totalScore', 'averageScore', 'score'];
  for (const key of forbiddenKeys) {
    if (key in view) throw new Error(`WeeklyBasketView içinde beklenmeyen alan: ${key}`);
  }
});

// 14. Yasaklı iddia taraması: view içindeki tüm metinler (JSON) taranır
scenario('14 yasaklı iddia taraması (basket view JSON)', () => {
  let basket = mergeLineIntoBasket(null, '1', snapshot('A', 'declared'), NOW);
  basket = mergeLineIntoBasket(basket, '2', snapshot('B', 'trace'), NOW);
  const view = buildWeeklyBasketView(basket);
  assertNoForbiddenClaims('buildWeeklyBasketView JSON', JSON.stringify(view));
});

// 15. buildBasketLineSnapshotFromDecisionView: mevcut projeksiyonu kopyalar, yeniden hesaplamaz
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

// 16. Dev fixture bütünlüğü: 8 zorunlu durum mevcut, hepsi isDevPreview=true
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
  }
  assertNoForbiddenClaims('DEV_WEEKLY_BASKET_FIXTURES JSON', JSON.stringify(DEV_WEEKLY_BASKET_FIXTURES));
});

console.log(`\n${passed}/${passed + failed} senaryo geçti.`);
if (failed > 0) process.exitCode = 1;
