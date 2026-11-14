/**
 * RafSkoru — Intake DB sözleşmesi
 * apps/backend/src/intake/db.smoke.ts
 *
 * node:sqlite Node'a yerleşik olduğundan (mobile'daki AsyncStorage'ın
 * aksine) bu test GERÇEK bir :memory: veritabanı üzerinden çalışır —
 * sahte/enjekte edilmiş bir depo gerekmez.
 */
import assert from 'node:assert/strict';

import {
  __resetIntakeDbForTesting,
  createSubmission,
  DuplicateBarcodeError,
  findSubmissionByBarcode,
  getAdminStats,
  getCategoryBreakdown,
  getLocalMarketBreakdown,
  getPendingSubmissions,
  getVolunteerProgress,
  isVersionAtLeast,
  markSlotReceived,
} from './db.js';

// ── Sürüm karşılaştırma mantığı ─────────────────────────────────────────
assert.equal(isVersionAtLeast('22.5.0', '22.5.0'), true, 'eşit sürüm yeterli sayılmalı');
assert.equal(isVersionAtLeast('22.6.0', '22.5.0'), true, 'daha yeni patch yeterli sayılmalı');
assert.equal(isVersionAtLeast('23.0.0', '22.5.0'), true, 'daha yeni major yeterli sayılmalı');
assert.equal(isVersionAtLeast('22.4.9', '22.5.0'), false, 'daha eski patch yetersiz sayılmalı');
assert.equal(isVersionAtLeast('20.10.0', '22.5.0'), false, 'daha eski major yetersiz sayılmalı');

__resetIntakeDbForTesting(':memory:');

const baseInput = {
  barcode: '8691004000029',
  volunteerCode: 'MRS-01',
  marketChain: 'migros',
  city: 'istanbul',
  category: 'sut-urunleri',
  status: 'new' as const,
  requestedSlots: ['front', 'ingredients', 'nutrition'],
  clientCreatedAt: new Date().toISOString(),
};

// ── Kayıt oluşturma ──────────────────────────────────────────────────────
{
  const submission = createSubmission(baseInput);
  assert.equal(submission.barcode, baseInput.barcode);
  assert.equal(submission.status, 'new');
  assert.deepEqual(submission.receivedSlots, [], 'yeni kayıtta hiç foto alınmamış olmalı');

  const fetched = findSubmissionByBarcode(baseInput.barcode);
  assert.ok(fetched, 'barkodla bulunabilmeli');
  assert.equal(fetched!.id, submission.id);
}

// ── Mükerrer barkod: UNIQUE ihlali DuplicateBarcodeError'a çevrilmeli ────
{
  assert.throws(
    () => createSubmission({ ...baseInput, volunteerCode: 'MRS-02', clientCreatedAt: new Date().toISOString() }),
    DuplicateBarcodeError,
    'aynı barkodla ikinci kayıt DuplicateBarcodeError fırlatmalı (yarış durumu kilidi)',
  );
}

// ── Slot işaretleme + bekleyen kayıt listesi ─────────────────────────────
{
  const submission = findSubmissionByBarcode(baseInput.barcode)!;
  assert.equal(getPendingSubmissions().length, 1, 'hiç foto gelmemiş kayıt bekleyen sayılmalı');

  markSlotReceived(submission.id, 'front');
  markSlotReceived(submission.id, 'front'); // idempotent — iki kez işaretleme listeyi büyütmemeli
  const afterOneSlot = findSubmissionByBarcode(baseInput.barcode)!;
  assert.deepEqual(afterOneSlot.receivedSlots, ['front']);
  assert.equal(getPendingSubmissions().length, 1, 'eksik slot varken hâlâ bekleyen sayılmalı');

  markSlotReceived(submission.id, 'ingredients');
  markSlotReceived(submission.id, 'nutrition');
  assert.equal(getPendingSubmissions().length, 0, 'tüm slotlar gelince bekleyen listesinden düşmeli');
}

// ── İkinci gönüllü, ikinci ürün — sayaçlar ───────────────────────────────
{
  createSubmission({
    barcode: '8691004000036',
    volunteerCode: 'MRS-02',
    marketChain: 'a101',
    city: 'ankara',
    category: 'atistirmalik',
    status: 'missing_fields',
    requestedSlots: ['ingredients'],
    clientCreatedAt: new Date().toISOString(),
  });

  const progressMrs01 = getVolunteerProgress('MRS-01');
  assert.equal(progressMrs01.total, 1);
  assert.equal(progressMrs01.today, 1, 'bugün oluşturulan kayıt today sayacına girmeli');

  const stats = getAdminStats();
  assert.equal(stats.totalSubmissions, 2);
  assert.equal(stats.todaySubmissions, 2);
  assert.deepEqual(
    stats.byVolunteer.map((row: { key: string; count: number }) => row.key).sort(),
    ['MRS-01', 'MRS-02'],
  );
  assert.equal(stats.dailyTrend.length, 14, 'günlük seyir tam 14 gün olmalı');
  assert.equal(stats.dailyTrend[13].count, 2, 'bugünün satırı (sondaki) 2 kayıt göstermeli');
}

// ── "yerel" market + kategori/market kırılımı ────────────────────────────
{
  createSubmission({
    barcode: '8691004000043',
    volunteerCode: 'MRS-02',
    marketChain: 'yerel',
    marketChainOther: 'Ayşe Manav',
    city: 'ankara',
    category: 'atistirmalik',
    status: 'new',
    requestedSlots: ['front'],
    clientCreatedAt: new Date().toISOString(),
  });

  const yerelSubmission = findSubmissionByBarcode('8691004000043')!;
  assert.equal(yerelSubmission.marketChain, 'yerel');
  assert.equal(yerelSubmission.marketChainOther, 'Ayşe Manav', 'serbest ad geri okunabilmeli');

  const nonLocalSubmission = findSubmissionByBarcode(baseInput.barcode)!;
  assert.equal(nonLocalSubmission.marketChainOther, null, 'yerel olmayan kayıtlarda serbest ad hep null olmalı');

  const categoryBreakdown = getCategoryBreakdown();
  const atistirmalikRow = categoryBreakdown.find((row) => row.category === 'atistirmalik')!;
  assert.equal(atistirmalikRow.total, 2, 'MRS-02nin iki kaydı da atistirmalik kategorisinde');
  assert.equal(atistirmalikRow.pending, 2, 'ikisi de eksik slotlu (hiç foto yüklenmedi)');

  const localMarketBreakdown = getLocalMarketBreakdown();
  assert.deepEqual(localMarketBreakdown, [{ key: 'Ayşe Manav', count: 1 }]);
}

console.log('INTAKE_DB_SMOKE_OK');
