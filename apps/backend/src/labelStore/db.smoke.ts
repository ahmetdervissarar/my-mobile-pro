/**
 * RafSkoru — Etiket okuma deposu sözleşmesi (ADR-009)
 * apps/backend/src/labelStore/db.smoke.ts
 *
 * Gerçek bir :memory: veritabanı üzerinde çalışır. Korunan kurallar:
 *   - kanıtsız aday açılmaz (barkod + fotoğraf + gözlem zamanı)
 *   - "okunamadı" yalnız null'dır; boş metin ve varsayılan değer yok
 *   - iki okuma yapılmadan onay yok; ayrışmada onaylayan alanları açıkça verir
 *   - onaylı kayıt gözlem zamanı + fotoğraf + onaylayanı her zaman taşır
 *   - eski sürüm silinmez; aday kayıt doğrulanmış kayıt gibi dönmez
 */
import assert from 'node:assert/strict';

import {
  __resetLabelStoreDbForTesting,
  approveCandidate,
  createCandidate,
  getCandidate,
  getCurrentVerified,
  getVerifiedHistory,
  LabelCandidateNotFoundError,
  LabelStoreStateError,
  LabelStoreValidationError,
  labelFieldsHaveContent,
  listCandidatesByStatus,
  listCandidatesForBarcode,
  recordExtraction,
  recordVerification,
  rejectCandidate,
} from './db.js';
import type { CreateCandidateInput, LabelFields, LabelRead } from './types.js';

__resetLabelStoreDbForTesting(':memory:');

const BARCODE = '8691004000022';
const OTHER_BARCODE = '8690000000012';

const baseCandidate: CreateCandidateInput = {
  barcode: BARCODE,
  photoSource: 'intake',
  photos: [
    { slot: 'ingredients', ref: 'photos/abc-ingredients.jpg', attribution: null },
    { slot: 'nutrition', ref: 'photos/abc-nutrition.jpg', attribution: null },
  ],
  observedAt: '2026-11-10T09:30:00.000Z',
};

const emptyFields: LabelFields = {
  productName: null,
  brand: null,
  quantityText: null,
  ingredientsText: null,
  ingredientsLang: null,
  allergenStatementText: null,
  traceStatementText: null,
  nutritionPer100: null,
};

const milkFields: LabelFields = {
  ...emptyFields,
  productName: 'Tam Yağlı Süt',
  quantityText: '1 L',
  ingredientsText: 'Pastörize inek sütü',
  ingredientsLang: 'tr',
  allergenStatementText: 'Süt ürünüdür.',
  nutritionPer100: {
    basis: '100ml',
    energyKcal: 61,
    fat: 3.3,
    saturatedFat: 2.1,
    carbohydrates: 4.7,
    sugars: 4.7,
    fiber: null,
    protein: 3,
    salt: 0.1,
  },
};

function read(fields: LabelFields, unreadableFields: string[] = []): LabelRead {
  return { reader: 'desktop_session', model: null, readAt: '2026-11-14T12:00:00.000Z', fields, unreadableFields };
}

// ── Aday açma: kanıt şartları ────────────────────────────────────────────
assert.throws(
  () => createCandidate({ ...baseCandidate, barcode: '8691004000028' }),
  LabelStoreValidationError,
  'kontrol hanesi tutmayan barkod reddedilmeli',
);
assert.throws(
  () => createCandidate({ ...baseCandidate, photos: [] }),
  LabelStoreValidationError,
  'fotoğrafsız aday açılmamalı',
);
assert.throws(
  () => createCandidate({ ...baseCandidate, photos: [{ slot: 'ingredients', ref: '  ', attribution: null }] }),
  LabelStoreValidationError,
  'boş fotoğraf göstergesi reddedilmeli',
);
assert.throws(
  () => createCandidate({ ...baseCandidate, observedAt: 'dün' }),
  LabelStoreValidationError,
  'geçersiz gözlem zamanı reddedilmeli',
);
assert.throws(
  () => createCandidate({ ...baseCandidate, photoSource: 'market_sitesi' as never }),
  LabelStoreValidationError,
  'izinli olmayan fotoğraf kaynağı reddedilmeli',
);

const first = createCandidate(baseCandidate);
assert.equal(first.status, 'awaiting_read');
assert.equal(first.observedAt, baseCandidate.observedAt, 'gözlem zamanı kayıt zamanıyla değiştirilmemeli');
assert.equal(first.extractRead, null);
assert.equal(first.differingFields, null);
assert.equal(getCurrentVerified(BARCODE), null, 'aday kayıt doğrulanmış kayıt gibi dönmemeli');

// ── Durum sırası: okuma → doğrulama → onay ───────────────────────────────
assert.throws(
  () => recordVerification(first.id, read(milkFields), []),
  LabelStoreStateError,
  'çıkarım yapılmadan doğrulama kaydedilmemeli',
);
assert.throws(
  () => approveCandidate(first.id, { approvedBy: 'proje-sahibi' }),
  LabelStoreStateError,
  'okuma yapılmadan onay verilmemeli',
);
assert.throws(
  () => recordExtraction('yok-boyle-bir-aday', read(milkFields)),
  LabelCandidateNotFoundError,
);

// ── Okuma girdisi: boş metin ve geçersiz değer yok ───────────────────────
assert.throws(
  () => recordExtraction(first.id, read({ ...milkFields, ingredientsText: '' })),
  LabelStoreValidationError,
  'boş metin kabul edilmemeli — okunamayan alan null olmalı',
);
assert.throws(
  () => recordExtraction(first.id, read({ ...milkFields, nutritionPer100: { ...milkFields.nutritionPer100!, salt: -1 } })),
  LabelStoreValidationError,
  'negatif besin değeri reddedilmeli',
);
assert.throws(
  () => recordExtraction(first.id, { ...read(milkFields), readAt: 'bugün' }),
  LabelStoreValidationError,
);
assert.equal(getCandidate(first.id)!.status, 'awaiting_read', 'reddedilen girdi durumu değiştirmemeli');

const extracted = recordExtraction(first.id, {
  ...read({ ...milkFields, brand: null }, ['brand']),
  // Bilinmeyen anahtar depoya girmemeli.
  ...({ uydurmaAlan: 'x' } as object),
});
assert.equal(extracted.status, 'read');
assert.equal(extracted.extractRead!.fields.brand, null, 'okunamayan alan null kalmalı');
assert.deepEqual(extracted.extractRead!.unreadableFields, ['brand']);
assert.equal(extracted.extractRead!.fields.nutritionPer100!.fiber, null, 'okunmayan besin değeri 0 ile doldurulmamalı');
assert.equal('uydurmaAlan' in extracted.extractRead!, false, 'bilinmeyen anahtar atılmalı');

assert.throws(
  () => recordExtraction(first.id, read(milkFields)),
  LabelStoreStateError,
  'çıkarım ikinci kez kaydedilmemeli',
);
assert.throws(
  () => approveCandidate(first.id, { approvedBy: 'proje-sahibi' }),
  LabelStoreStateError,
  'doğrulama okuması yapılmadan onay verilmemeli',
);

// ── Uyuşan okumalar → agreed → onay ──────────────────────────────────────
const agreed = recordVerification(first.id, read({ ...milkFields, brand: null }, ['brand']), []);
assert.equal(agreed.status, 'agreed');
assert.deepEqual(agreed.differingFields, []);
assert.deepEqual(listCandidatesByStatus('agreed').map((c) => c.id), [first.id]);
assert.equal(getCurrentVerified(BARCODE), null, 'uyuşmuş ama onaylanmamış aday doğrulanmış sayılmamalı');

assert.throws(
  () => approveCandidate(first.id, { approvedBy: '   ' }),
  LabelStoreValidationError,
  'onaylayan boş olamaz',
);

const v1 = approveCandidate(first.id, { approvedBy: 'proje-sahibi' });
assert.equal(v1.version, 1);
assert.equal(v1.barcode, BARCODE);
assert.equal(v1.approvedBy, 'proje-sahibi');
assert.equal(v1.observedAt, baseCandidate.observedAt, 'onaylı kayıt gözlem zamanını taşımalı');
assert.equal(v1.photos.length, 2, 'onaylı kayıt etiket fotoğrafı kanıtını taşımalı');
assert.equal(v1.candidateId, first.id);
assert.equal(v1.supersededAt, null);
assert.equal(v1.fields.ingredientsText, 'Pastörize inek sütü');
assert.equal(v1.fields.brand, null, 'onay, okunamayan alanı doldurmamalı');
assert.ok(!Number.isNaN(Date.parse(v1.approvedAt)));

const approvedCandidate = getCandidate(first.id)!;
assert.equal(approvedCandidate.status, 'approved');
assert.equal(approvedCandidate.decidedBy, 'proje-sahibi');

assert.throws(
  () => approveCandidate(first.id, { approvedBy: 'proje-sahibi' }),
  LabelStoreStateError,
  'aynı aday ikinci kez onaylanmamalı',
);
assert.throws(
  () => rejectCandidate(first.id, { rejectedBy: 'proje-sahibi', reason: 'vazgeçtim' }),
  LabelStoreStateError,
  'onaylanmış aday reddedilememeli',
);

// ── Ayrışan okumalar → disagreed → açık alanlarla onay → yeni sürüm ──────
const second = createCandidate({
  ...baseCandidate,
  photoSource: 'user_app',
  photos: [{ slot: 'ingredients', ref: 'uploads/def-ingredients.jpg', attribution: null }],
  observedAt: '2026-11-13T17:05:00.000Z',
});
recordExtraction(second.id, read({ ...milkFields, ingredientsText: 'Pastörize inek sütü, D vitamini' }));
const disagreed = recordVerification(second.id, read(milkFields), ['ingredientsText']);
assert.equal(disagreed.status, 'disagreed');
assert.deepEqual(disagreed.differingFields, ['ingredientsText']);

assert.throws(
  () => approveCandidate(second.id, { approvedBy: 'proje-sahibi' }),
  LabelStoreValidationError,
  'ayrışmada çıkarım okuması sessizce seçilmemeli',
);
assert.throws(
  () => approveCandidate(second.id, { approvedBy: 'proje-sahibi', fields: emptyFields }),
  LabelStoreValidationError,
  'tamamen boş kayıt onaylanmamalı',
);
assert.equal(getCurrentVerified(BARCODE)!.version, 1, 'başarısız onay güncel sürümü değiştirmemeli');
assert.equal(getCandidate(second.id)!.status, 'disagreed', 'başarısız onay aday durumunu değiştirmemeli');

const resolvedFields: LabelFields = { ...milkFields, ingredientsText: 'Pastörize inek sütü, D vitamini' };
const v2 = approveCandidate(second.id, { approvedBy: 'proje-sahibi', fields: resolvedFields });
assert.equal(v2.version, 2);
assert.equal(v2.observedAt, '2026-11-13T17:05:00.000Z');
assert.equal(v2.photoSource, 'user_app');
assert.equal(getCurrentVerified(BARCODE)!.version, 2, 'güncel kayıt en son onaylanan sürüm olmalı');

const history = getVerifiedHistory(BARCODE);
assert.deepEqual(history.map((v) => v.version), [1, 2], 'eski sürüm silinmemeli');
assert.notEqual(history[0]!.supersededAt, null, 'eski sürüm yerine geçildi olarak işaretlenmeli');
assert.equal(history[0]!.fields.ingredientsText, 'Pastörize inek sütü', 'eski sürümün içeriği değişmemeli');
assert.equal(history[1]!.supersededAt, null);
assert.equal(
  getCandidate(second.id)!.extractRead!.fields.ingredientsText,
  'Pastörize inek sütü, D vitamini',
  'çıkarım okuması aday kayıtta değişmeden kalmalı',
);

// ── Ret: doğrulanmış kayıt oluşmaz ───────────────────────────────────────
const third = createCandidate({ ...baseCandidate, barcode: OTHER_BARCODE });
recordExtraction(third.id, read(emptyFields, ['ingredientsText', 'nutritionPer100']));
assert.throws(
  () => rejectCandidate(third.id, { rejectedBy: 'proje-sahibi', reason: '' }),
  LabelStoreValidationError,
  'ret gerekçesi boş olamaz',
);
const rejected = rejectCandidate(third.id, { rejectedBy: 'proje-sahibi', reason: 'Fotoğraf bulanık' });
assert.equal(rejected.status, 'rejected');
assert.equal(rejected.rejectionReason, 'Fotoğraf bulanık');
assert.equal(getCurrentVerified(OTHER_BARCODE), null, 'reddedilen aday doğrulanmış kayıt üretmemeli');
assert.deepEqual(getVerifiedHistory(OTHER_BARCODE), []);
assert.throws(
  () => recordVerification(third.id, read(emptyFields), []),
  LabelStoreStateError,
  'reddedilmiş aday üzerinde işlem yapılmamalı',
);

// ── Listeleme ve yardımcılar ─────────────────────────────────────────────
assert.deepEqual(
  listCandidatesForBarcode(BARCODE).map((c) => c.id),
  [first.id, second.id],
);
assert.deepEqual(listCandidatesByStatus('awaiting_read'), []);
assert.equal(labelFieldsHaveContent(emptyFields), false);
assert.equal(labelFieldsHaveContent({ ...emptyFields, traceStatementText: 'Eser miktarda fındık içerebilir.' }), true);
assert.equal(
  labelFieldsHaveContent({
    ...emptyFields,
    nutritionPer100: { ...milkFields.nutritionPer100!, basis: null, energyKcal: null, fat: null, saturatedFat: null, carbohydrates: null, sugars: null, protein: null, salt: null },
  }),
  false,
  'bütün değerleri boş bir besin tablosu içerik sayılmamalı',
);

console.log('LABEL_STORE_DB_SMOKE_OK');
