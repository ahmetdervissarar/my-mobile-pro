/**
 * RafSkoru — Etiket onay ekranı uç noktaları sözleşmesi (İş 1.5a)
 * apps/backend/src/labelStore/reviewRoutes.smoke.ts
 *
 * Korunan kurallar:
 *   - yönetici anahtarı olmadan hiçbir uç nokta çalışmaz
 *   - fotoğraf yalnız adayın kendi listesinden ve kök dizin içinden sunulur
 *   - onayda alanlar ve ürün türü açıkça gönderilir; içindekiler doluysa
 *     "fotoğrafla karşılaştırdım" işareti şarttır; fotoğrafsız bölümden alan yok
 *   - ret sabit bir nedenle yapılır; "başka bir neden" açıklama ister
 *   - uyarılar adayın verisinden çıkar ve veriyi değiştirmez
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';

import { ADMIN_KEY_HEADER } from '../intake/auth.js';
import {
  __resetLabelStoreDbForTesting,
  createCandidate,
  getCandidate,
  getCurrentVerified,
  recordExtraction,
  recordVerification,
} from './db.js';
import { labelReviewFlags } from './review.js';
import { createLabelReviewRouter } from './reviewRoutes.js';
import type { CreateCandidateInput, LabelFields, LabelRead } from './types.js';

__resetLabelStoreDbForTesting(':memory:');

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-label-review-'));
const photoRoot = join(fixtureDir, 'data');
mkdirSync(join(photoRoot, 'label-store', 'batch'), { recursive: true });
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
writeFileSync(join(photoRoot, 'label-store', 'batch', 'ingredients.jpg'), JPEG_BYTES);
writeFileSync(join(fixtureDir, 'secret.jpg'), JPEG_BYTES);

const ADMIN_KEY = 'test-admin-key';

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

const crackerFields: LabelFields = {
  ...emptyFields,
  productName: 'Kraker',
  ingredientsText: 'Buğday unu, bitkisel yağ, tuz,',
  ingredientsLang: 'tr',
  allergenStatementText: 'Gluten içerir. Laktoz içermez.',
  nutritionPer100: {
    basis: '100g',
    energyKcal: 480,
    fat: 20,
    saturatedFat: 9,
    carbohydrates: 65,
    sugars: 4,
    fiber: null,
    protein: 8,
    salt: 1.2,
  },
};

function read(fields: LabelFields, notes: string | null = null): LabelRead {
  return { reader: 'desktop_session', model: 'label-reader', readAt: '2026-11-18T10:00:00.000Z', fields, unreadableFields: [], notes };
}

function makeCandidate(input: Partial<CreateCandidateInput> & { barcode: string }, first: LabelRead, second: LabelRead, differing: string[] = []) {
  const created = createCandidate({
    photoSource: 'off_photo',
    photos: [{ slot: 'ingredients', ref: 'label-store/batch/ingredients.jpg', attribution: 'OFF — CC BY-SA' }],
    observedAt: '2026-11-10T09:30:00.000Z',
    ...input,
  });
  recordExtraction(created.id, first);
  return recordVerification(created.id, second, differing);
}

const cracker = makeCandidate({ barcode: '8690000000012' }, read(crackerFields, 'değerler kaymış'), read(crackerFields));
const tracesOnly = makeCandidate(
  { barcode: '8690000000029' },
  read({ ...emptyFields, productName: 'Cips', traceStatementText: 'Soya içerebilir.' }),
  read({ ...emptyFields, productName: 'Cips', traceStatementText: 'Soya içerebilir.' }),
);
const frontOnly = makeCandidate(
  { barcode: '8690000000036', photos: [{ slot: 'front', ref: 'label-store/batch/ingredients.jpg', attribution: null }] },
  read({ ...emptyFields, productName: 'Islak Havlu' }),
  read({ ...emptyFields, productName: 'Islak Mendil' }),
  ['productName'],
);
const escaping = makeCandidate(
  { barcode: '8690000000043', photos: [{ slot: 'ingredients', ref: '../secret.jpg', attribution: null }, { slot: 'nutrition', ref: 'label-store/batch/notes.txt', attribution: null }] },
  read({ ...emptyFields, productName: 'Kaçış' }),
  read({ ...emptyFields, productName: 'Kaçış' }),
);

// ── Uyarılar (saf) ───────────────────────────────────────────────────────
{
  const codes = labelReviewFlags(cracker).map((flag) => flag.code);
  assert.deepEqual(
    codes.sort(),
    ['ingredients_may_be_incomplete', 'manufacturer_free_from_claim', 'nutrition_without_nutrition_photo', 'reader_notes'].sort(),
  );
  assert.deepEqual(labelReviewFlags(tracesOnly).map((flag) => flag.code), ['statements_without_ingredients']);
  assert.deepEqual(labelReviewFlags(frontOnly).map((flag) => flag.code), ['reads_differ']);
  assert.equal(getCandidate(cracker.id)!.status, 'agreed', 'uyarı hesabı adayı değiştirmemeli');
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = express();
  app.use('/api/label-review', createLabelReviewRouter({ photoRootDir: photoRoot }));
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server address not available.');
    return await run(`http://127.0.0.1:${address.port}/api/label-review`);
  } finally {
    await new Promise<void>((resolvePromise, reject) => server.close((err) => (err ? reject(err) : resolvePromise())));
  }
}

const auth = { [ADMIN_KEY_HEADER]: ADMIN_KEY };
const jsonAuth = { ...auth, 'Content-Type': 'application/json' };

await withServer(async (base) => {
  // ── Kimlik doğrulama ───────────────────────────────────────────────────
  delete process.env.INTAKE_ADMIN_KEY;
  assert.equal((await fetch(`${base}/candidates`, { headers: auth })).status, 503, 'anahtar tanımlı değilse kapalı');
  process.env.INTAKE_ADMIN_KEY = ADMIN_KEY;
  assert.equal((await fetch(`${base}/candidates`)).status, 401);
  assert.equal((await fetch(`${base}/candidates`, { headers: { [ADMIN_KEY_HEADER]: 'wrong-key' } })).status, 401);
  assert.equal((await fetch(`${base}/candidates/${cracker.id}/photos/0`)).status, 401, 'fotoğraf da anahtar ister');

  // ── Liste ve ayrıntı ───────────────────────────────────────────────────
  const meta = await (await fetch(`${base}/meta`, { headers: auth })).json();
  assert.ok(meta.productKinds.some((kind: { key: string | null }) => kind.key === 'alcoholic_beverage'));
  assert.ok(meta.productKinds.some((kind: { key: string | null }) => kind.key === 'non_food'), 'gıda dışı ürün seçeneği olmalı');
  assert.ok(meta.productKinds.some((kind: { key: string | null }) => kind.key === null), '"Bilinmiyor" seçeneği olmalı');

  const list = await (await fetch(`${base}/candidates`, { headers: auth })).json();
  assert.deepEqual(
    list.candidates.map((item: { id: string }) => item.id),
    [cracker.id, tracesOnly.id, frontOnly.id, escaping.id],
  );
  assert.equal((await fetch(`${base}/candidates?status=bilinmeyen`, { headers: auth })).status, 400);

  const detail = await (await fetch(`${base}/candidates/${cracker.id}`, { headers: auth })).json();
  assert.equal(detail.candidate.extractRead.notes, 'değerler kaymış');
  assert.equal(detail.offCatalog, null);
  assert.equal(detail.currentVerified, null);
  assert.deepEqual(detail.photos, [{ index: 0, slot: 'ingredients', attribution: 'OFF — CC BY-SA' }]);
  assert.equal((await fetch(`${base}/candidates/olmayan`, { headers: auth })).status, 404);

  // ── Fotoğraf ───────────────────────────────────────────────────────────
  const photo = await fetch(`${base}/candidates/${cracker.id}/photos/0`, { headers: auth });
  assert.equal(photo.status, 200);
  assert.equal(photo.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), JPEG_BYTES);
  assert.equal((await fetch(`${base}/candidates/${cracker.id}/photos/1`, { headers: auth })).status, 404);
  assert.equal((await fetch(`${base}/candidates/${cracker.id}/photos/x`, { headers: auth })).status, 404);
  assert.equal((await fetch(`${base}/candidates/${escaping.id}/photos/0`, { headers: auth })).status, 400, 'kök dışına çıkılmamalı');
  assert.equal((await fetch(`${base}/candidates/${escaping.id}/photos/1`, { headers: auth })).status, 400, 'yalnız resim dosyası');

  // ── Onay ───────────────────────────────────────────────────────────────
  const approve = (id: string, body: unknown) =>
    fetch(`${base}/candidates/${id}/approve`, { method: 'POST', headers: jsonAuth, body: JSON.stringify(body) });

  const missingKind = await approve(cracker.id, { approvedBy: 'proje-sahibi', fields: crackerFields, ingredientsChecked: true });
  assert.equal(missingKind.status, 400, 'ürün türü açıkça seçilmeli');
  assert.equal(
    (await approve(cracker.id, { approvedBy: 'proje-sahibi', fields: crackerFields, productKind: 'general' })).status,
    400,
    'içindekiler fotoğrafla karşılaştırılmadan onay yok',
  );
  assert.equal(
    (await approve(cracker.id, { approvedBy: 'proje-sahibi', fields: crackerFields, productKind: 'yemek', ingredientsChecked: true })).status,
    400,
  );
  assert.equal((await approve(cracker.id, { approvedBy: '  ', fields: crackerFields, productKind: 'general', ingredientsChecked: true })).status, 400);
  assert.equal((await approve(cracker.id, { approvedBy: 'proje-sahibi', productKind: 'general' })).status, 400, 'alanlar gönderilmeli');
  assert.equal(
    (await approve(frontOnly.id, { approvedBy: 'proje-sahibi', fields: { ...emptyFields, productName: 'Islak Havlu', nutritionPer100: crackerFields.nutritionPer100 }, productKind: null })).status,
    400,
    'fotoğrafı olmayan bölümden alan onaylanmamalı',
  );
  assert.equal(getCurrentVerified(cracker.barcode), null, 'hatalı isteklerden kayıt oluşmamalı');

  const approved = await approve(cracker.id, {
    approvedBy: 'proje-sahibi',
    fields: crackerFields,
    productKind: 'general',
    ingredientsChecked: true,
  });
  assert.equal(approved.status, 200);
  const verified = getCurrentVerified(cracker.barcode)!;
  assert.equal(verified.approvedBy, 'proje-sahibi');
  assert.equal(verified.productKind, 'general');
  assert.equal(verified.productKindSource, 'approver');
  assert.equal((await approve(cracker.id, { approvedBy: 'proje-sahibi', fields: crackerFields, productKind: 'general', ingredientsChecked: true })).status, 409);

  const unknownKind = await approve(tracesOnly.id, {
    approvedBy: 'proje-sahibi',
    fields: { ...emptyFields, productName: 'Cips', traceStatementText: 'Soya içerebilir.' },
    productKind: null,
  });
  assert.equal(unknownKind.status, 200, 'içindekiler boşsa karşılaştırma işareti gerekmez; tür "bilinmiyor" olabilir');
  assert.equal(getCurrentVerified(tracesOnly.barcode)!.productKind, null);

  // ── Ret ────────────────────────────────────────────────────────────────
  const reject = (id: string, body: unknown) =>
    fetch(`${base}/candidates/${id}/reject`, { method: 'POST', headers: jsonAuth, body: JSON.stringify(body) });
  assert.equal((await reject(frontOnly.id, { rejectedBy: 'proje-sahibi' })).status, 400, 'neden seçilmeli');
  assert.equal((await reject(frontOnly.id, { rejectedBy: 'proje-sahibi', reasonCode: 'other' })).status, 400, 'açıklama gerekli');
  const rejected = await reject(frontOnly.id, { rejectedBy: 'proje-sahibi', reasonCode: 'not_food', note: 'ıslak havlu' });
  assert.equal(rejected.status, 200);
  assert.equal(getCandidate(frontOnly.id)!.rejectionReason, 'not_food: Gıda değil — ıslak havlu');
  assert.equal(getCurrentVerified(frontOnly.barcode), null, 'ret kayıt üretmemeli');
  assert.equal((await reject(frontOnly.id, { rejectedBy: 'proje-sahibi', reasonCode: 'not_food' })).status, 409);

  const rejectedList = await (await fetch(`${base}/candidates?status=rejected`, { headers: auth })).json();
  assert.deepEqual(rejectedList.candidates.map((item: { id: string }) => item.id), [frontOnly.id]);
});

rmSync(fixtureDir, { recursive: true, force: true });
console.log('LABEL_REVIEW_ROUTES_SMOKE_OK');
