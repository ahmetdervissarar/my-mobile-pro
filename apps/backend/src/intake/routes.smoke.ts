/**
 * RafSkoru — Intake auth uç noktaları sözleşmesi
 * apps/backend/src/intake/routes.smoke.ts
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';

import { ADMIN_KEY_HEADER, requireAdminAuth, VOLUNTEER_CODE_HEADER, VOLUNTEER_KEY_HEADER } from './auth.js';
import { __resetIntakeDbForTesting } from './db.js';
import { createIntakeRouter, createIntakeUnavailableRouter } from './routes.js';
import { __resetVolunteersCacheForTesting } from './volunteers.js';

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-intake-routes-'));
const volunteersPath = join(fixtureDir, 'volunteers.json');
writeFileSync(volunteersPath, JSON.stringify({ 'MRS-01': 'key-1', 'MRS-02': 'key-2' }));
// Gerçek apps/backend/data/intake/photos/ yerine geçici bir dizine yazar —
// testler ÜRETİM veri dizinini asla kirletmemeli.
const testPhotosDir = join(fixtureDir, 'photos');

// routes.ts kendi volunteersFilePath'ini config.ts'ten türetir; test burada
// INTAKE_VOLUNTEERS_JSON ile o yolu bypass edip sabit bir fixture'a bağlar.
__resetVolunteersCacheForTesting();
process.env.INTAKE_VOLUNTEERS_JSON = JSON.stringify({ 'MRS-01': 'key-1', 'MRS-02': 'key-2' });
__resetIntakeDbForTesting(':memory:');

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/0000000000000',
  observedAt: '2026-09-01T00:00:00.000Z',
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

function makeCatalogRecord(overrides: Partial<OffImportRecord>): OffImportRecord {
  return {
    gtin: '0000000000000',
    name: 'Test Ürünü',
    brand: 'Test Marka',
    quantity: null,
    categories: [],
    imageUrl: null,
    ingredientsText: null,
    ingredientsLang: null,
    allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'unknown_or_unverified' },
    nutriscoreGrade: null,
    offGradeRaw: null,
    novaGroup: null,
    nutrition100g: {
      energyKcal: null,
      fat: null,
      saturatedFat: null,
      carbohydrates: null,
      sugars: null,
      fiber: null,
      proteins: null,
      salt: null,
    },
    additives: [],
    provenance: BASE_PROVENANCE,
    missingFields: [],
    completeness: 'insufficient',
    ...overrides,
  };
}

const ALREADY_COMPLETE_GTIN = '8690504000037';
const MISSING_INGREDIENTS_ONLY_GTIN = '8690504000044';
const NEW_GTIN = '8690504000013';
const LOCAL_MARKET_GTIN = '8690504000051';
// Submissions bloğunda bir kez doldurulur, admin bloğu foto önizlemeyi
// GERÇEK bir submissionId ile test edebilsin diye modül seviyesinde tutulur.
let frontPhotoSubmissionId = '';
const catalogPath = join(fixtureDir, 'products.jsonl');
const completeRecord = makeCatalogRecord({
  gtin: ALREADY_COMPLETE_GTIN,
  imageUrl: 'https://example.com/front.jpg',
  ingredientsText: 'Su, şeker.',
  allergens: { declared: [], traces: [], rawDeclared: [], rawTraces: [], dataStatus: 'not_listed_in_available_data' },
  nutriscoreGrade: 'c',
  novaGroup: 2,
  nutrition100g: { energyKcal: 40, fat: 0, saturatedFat: 0, carbohydrates: 10, sugars: 10, fiber: 0, proteins: 0, salt: 0 },
});
// Yalnız 'ingredients' eksik: front (imageUrl) ve nutrition (nutriscore/nova/çekirdek besinler) zaten tam.
const missingIngredientsOnlyRecord = makeCatalogRecord({
  gtin: MISSING_INGREDIENTS_ONLY_GTIN,
  imageUrl: 'https://example.com/front.jpg',
  ingredientsText: null,
  allergens: { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' },
  nutriscoreGrade: 'c',
  novaGroup: 2,
  nutrition100g: { energyKcal: 40, fat: 0, saturatedFat: 0, carbohydrates: 10, sugars: 10, fiber: 0, proteins: 0, salt: 0 },
});
writeFileSync(catalogPath, `${JSON.stringify(completeRecord)}\n${JSON.stringify(missingIngredientsOnlyRecord)}\n`);
loadCatalog(catalogPath);

async function withServer<T>(app: express.Express, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server address not available.');
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolvePromise, reject) => {
      server.close((err) => (err ? reject(err) : resolvePromise()));
    });
  }
}

// ── POST /auth/verify ─────────────────────────────────────────────────────
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeRouter({ photosDir: testPhotosDir }));

  await withServer(app, async (baseUrl) => {
    const ok = await fetch(`${baseUrl}/api/intake/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'MRS-01', key: 'key-1' }),
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ok: true, volunteerCode: 'MRS-01' });

    const wrongKey = await fetch(`${baseUrl}/api/intake/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'MRS-01', key: 'yanlis' }),
    });
    assert.equal(wrongKey.status, 401);

    // GET /auth/ping başlıklardan doğrular (gövdeden DEĞİL).
    const pingOk = await fetch(`${baseUrl}/api/intake/auth/ping`, {
      headers: { [VOLUNTEER_CODE_HEADER]: 'MRS-01', [VOLUNTEER_KEY_HEADER]: 'key-1' },
    });
    assert.equal(pingOk.status, 200);

    const pingMissingHeaders = await fetch(`${baseUrl}/api/intake/auth/ping`);
    assert.equal(pingMissingHeaders.status, 401);
  });
}

// ── GET /lookup ────────────────────────────────────────────────────────────
// Karar mantığının tüm dalları lookup.smoke.ts'te doğrulanıyor; burada
// yalnızca HTTP katmanı (auth zorunluluğu, durum kodları, gövde biçimi)
// test edilir.
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeRouter({ photosDir: testPhotosDir }));
  const authHeaders = { [VOLUNTEER_CODE_HEADER]: 'MRS-01', [VOLUNTEER_KEY_HEADER]: 'key-1' };

  await withServer(app, async (baseUrl) => {
    const noAuth = await fetch(`${baseUrl}/api/intake/lookup?barcode=8690504000013`);
    assert.equal(noAuth.status, 401, 'lookup da kimlik doğrulama gerektirmeli');

    const missingBarcode = await fetch(`${baseUrl}/api/intake/lookup`, { headers: authHeaders });
    assert.equal(missingBarcode.status, 400);

    const invalidGtin = await fetch(`${baseUrl}/api/intake/lookup?barcode=1234567890123`, { headers: authHeaders });
    assert.equal(invalidGtin.status, 400);
    assert.equal(((await invalidGtin.json()) as { error: string }).error, 'invalid_gtin');

    // Katalogda ve toplama kayıtlarında olmayan geçerli bir GTIN → 'new'.
    const newProduct = await fetch(`${baseUrl}/api/intake/lookup?barcode=8690504000013`, { headers: authHeaders });
    assert.equal(newProduct.status, 200);
    const newBody = (await newProduct.json()) as { ok: boolean; status: string; neededSlots: string[] };
    assert.equal(newBody.ok, true);
    assert.equal(newBody.status, 'new');
    assert.deepEqual(newBody.neededSlots, ['front', 'ingredients', 'nutrition']);
  });
}

// ── GET /meta ──────────────────────────────────────────────────────────────
{
  const app = express();
  app.use('/api/intake', createIntakeRouter({ photosDir: testPhotosDir }));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intake/meta`);
    assert.equal(response.status, 200, 'meta kimlik doğrulama gerektirmemeli — girişten önce listeler gerekir');
    const body = (await response.json()) as { marketChains: unknown[]; cities: unknown[]; categories: unknown[] };
    assert.ok(body.marketChains.length > 0);
    assert.ok(body.cities.length > 0);
    assert.ok(body.categories.length > 0);
  });
}

// ── POST /submissions + PUT /submissions/:id/photos/:slot ──────────────────
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeRouter({ photosDir: testPhotosDir }));
  const authHeaders = { [VOLUNTEER_CODE_HEADER]: 'MRS-01', [VOLUNTEER_KEY_HEADER]: 'key-1' };
  const REAL_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const FAKE_JPEG = Buffer.from('bu bir jpeg degil', 'utf8');

  await withServer(app, async (baseUrl) => {
    const validSubmissionBody = {
      barcode: NEW_GTIN,
      marketChain: 'migros',
      city: 'istanbul',
      category: 'atistirmalik',
      clientCreatedAt: new Date().toISOString(),
    };

    // Geçersiz metadata (listede olmayan market zinciri) → 400.
    const invalidMeta = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, marketChain: 'olmayan-market' }),
    });
    assert.equal(invalidMeta.status, 400);
    assert.equal(((await invalidMeta.json()) as { error: string }).error, 'invalid_metadata');

    // Geçersiz kategori (listede olmayan) → 400.
    const invalidCategory = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, category: 'olmayan-kategori' }),
    });
    assert.equal(invalidCategory.status, 400);
    assert.equal(((await invalidCategory.json()) as { error: string }).error, 'invalid_metadata');

    // Kategori boş bırakılırsa (zorunlu) → 400.
    const missingCategory = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, category: '' }),
    });
    assert.equal(missingCategory.status, 400);

    // "yerel" seçilip serbest ad BOŞ bırakılırsa → 400 invalid_local_market_name.
    const localMissingName = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, marketChain: 'yerel' }),
    });
    assert.equal(localMissingName.status, 400);
    assert.equal(((await localMissingName.json()) as { error: string }).error, 'invalid_local_market_name');

    // "yerel" + kurallara uymayan serbest ad (izin verilmeyen karakter) → 400.
    const localInvalidChars = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, marketChain: 'yerel', marketChainOther: 'Market <b>X</b>' }),
    });
    assert.equal(localInvalidChars.status, 400);
    assert.equal(((await localInvalidChars.json()) as { error: string }).error, 'invalid_local_market_name');

    // "yerel" DEĞİLKEN serbest ad gönderilirse → 400 (başka hiçbir kodla
    // birlikte kaydedilmesin, bkz. görev onayı).
    const nonLocalWithFreeText = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, marketChainOther: 'Bu kaydedilmemeli' }),
    });
    assert.equal(nonLocalWithFreeText.status, 400);
    assert.equal(((await nonLocalWithFreeText.json()) as { error: string }).error, 'invalid_metadata');

    // "yerel" + geçerli serbest ad → 201, marketChainOther doğru kaydedilir.
    const localValid = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        ...validSubmissionBody,
        barcode: LOCAL_MARKET_GTIN,
        marketChain: 'yerel',
        marketChainOther: 'Ayşe Manav',
      }),
    });
    assert.equal(localValid.status, 201);

    // Zaten tam olan bir katalog ürünü için gönderim → 409 already_complete.
    const alreadyComplete = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, barcode: ALREADY_COMPLETE_GTIN }),
    });
    assert.equal(alreadyComplete.status, 409);
    assert.equal(((await alreadyComplete.json()) as { error: string }).error, 'already_complete');

    // Yeni ürün → 201, 3 slot istenir.
    const created = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(validSubmissionBody),
    });
    assert.equal(created.status, 201);
    const createdBody = (await created.json()) as { submissionId: string; requestedSlots: string[] };
    assert.deepEqual(createdBody.requestedSlots, ['front', 'ingredients', 'nutrition']);
    const submissionId = createdBody.submissionId;

    // Aynı barkod tekrar gönderilirse → 409 duplicate_barcode.
    const duplicate = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(validSubmissionBody),
    });
    assert.equal(duplicate.status, 409);
    assert.equal(((await duplicate.json()) as { error: string }).error, 'duplicate_barcode');

    // Gerçek bir JPEG yükleme → kabul edilir, receivedSlots güncellenir.
    const uploadFront = await fetch(`${baseUrl}/api/intake/submissions/${submissionId}/photos/front`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', ...authHeaders },
      body: REAL_JPEG,
    });
    assert.equal(uploadFront.status, 200);
    assert.deepEqual(await uploadFront.json(), { ok: true, receivedSlots: ['front'] });
    frontPhotoSubmissionId = submissionId;

    // BAŞKA BİR GÖNÜLLÜ bu kaydın sahibi değil — kimliği geçerli olsa da
    // (MRS-02 gerçek bir gönüllü) fotoğraf yükleyemez (bkz. görev onayı,
    // madde 4a).
    const otherVolunteerHeaders = { [VOLUNTEER_CODE_HEADER]: 'MRS-02', [VOLUNTEER_KEY_HEADER]: 'key-2' };
    const crossVolunteerUpload = await fetch(`${baseUrl}/api/intake/submissions/${submissionId}/photos/ingredients`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', ...otherVolunteerHeaders },
      body: REAL_JPEG,
    });
    assert.equal(crossVolunteerUpload.status, 403);
    assert.equal(((await crossVolunteerUpload.json()) as { error: string }).error, 'not_submission_owner');

    // "YANLIŞ BAŞLIKLA GÖNDERİLEN DOSYA REDDEDİLİR" — Content-Type
    // image/jpeg İDDİA EDİYOR ama gerçek baytlar JPEG değil (bkz. görev
    // onayı, madde 2: bu testin varlığı açıkça istendi).
    const fakeUpload = await fetch(`${baseUrl}/api/intake/submissions/${submissionId}/photos/ingredients`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', ...authHeaders },
      body: FAKE_JPEG,
    });
    assert.equal(fakeUpload.status, 400);
    assert.equal(((await fakeUpload.json()) as { error: string }).error, 'invalid_file_type');

    // Bilinmeyen submission id → 404.
    const notFound = await fetch(`${baseUrl}/api/intake/submissions/olmayan-id/photos/front`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', ...authHeaders },
      body: REAL_JPEG,
    });
    assert.equal(notFound.status, 404);

    // İstenmeyen bir slota yükleme → 400 slot_not_requested. Bu ürünün
    // yalnızca 'ingredients' eksik (front/nutrition katalogda zaten tam) —
    // 'front' slotu hiç istenmedi.
    const missingIngredientsSubmission = await fetch(`${baseUrl}/api/intake/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ ...validSubmissionBody, barcode: MISSING_INGREDIENTS_ONLY_GTIN }),
    });
    assert.equal(missingIngredientsSubmission.status, 201);
    const missingIngredientsBody = (await missingIngredientsSubmission.json()) as {
      submissionId: string;
      requestedSlots: string[];
    };
    assert.deepEqual(missingIngredientsBody.requestedSlots, ['ingredients']);

    const unrequestedSlot = await fetch(
      `${baseUrl}/api/intake/submissions/${missingIngredientsBody.submissionId}/photos/front`,
      { method: 'PUT', headers: { 'Content-Type': 'image/jpeg', ...authHeaders }, body: REAL_JPEG },
    );
    assert.equal(unrequestedSlot.status, 400);
    assert.equal(((await unrequestedSlot.json()) as { error: string }).error, 'slot_not_requested');

    // Geçersiz slot adı → 400.
    const invalidSlot = await fetch(`${baseUrl}/api/intake/submissions/${submissionId}/photos/yan-taraf`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', ...authHeaders },
      body: REAL_JPEG,
    });
    assert.equal(invalidSlot.status, 400);
    assert.equal(((await invalidSlot.json()) as { error: string }).error, 'invalid_slot');

    // Kimlik doğrulama olmadan yükleme → 401.
    const noAuthUpload = await fetch(`${baseUrl}/api/intake/submissions/${submissionId}/photos/nutrition`, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: REAL_JPEG,
    });
    assert.equal(noAuthUpload.status, 401);
  });
}

// ── GET /progress + GET /admin/stats, /admin/pending, /admin/photos, /admin/export.csv ─
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeRouter({ photosDir: testPhotosDir }));
  const authHeaders = { [VOLUNTEER_CODE_HEADER]: 'MRS-01', [VOLUNTEER_KEY_HEADER]: 'key-1' };
  process.env.INTAKE_ADMIN_KEY = 'super-secret-admin';
  const adminHeaders = { [ADMIN_KEY_HEADER]: 'super-secret-admin' };

  await withServer(app, async (baseUrl) => {
    // /progress: bu araçtaki önceki test bloklarından zaten en az bir
    // MRS-01 kaydı var (aynı süreç, aynı :memory: db) — today/total >= 1.
    const progressNoAuth = await fetch(`${baseUrl}/api/intake/progress`);
    assert.equal(progressNoAuth.status, 401);

    const progress = await fetch(`${baseUrl}/api/intake/progress`, { headers: authHeaders });
    assert.equal(progress.status, 200);
    const progressBody = (await progress.json()) as { today: number; total: number; totalAll: number };
    assert.ok(progressBody.today >= 1);
    assert.ok(progressBody.totalAll >= progressBody.total);

    // /admin/stats: gönüllü kimliğiyle DEĞİL, yalnız admin anahtarıyla açılır.
    const statsNoAdmin = await fetch(`${baseUrl}/api/intake/admin/stats`, { headers: authHeaders });
    assert.equal(statsNoAdmin.status, 401, 'gönüllü kimliği admin uç noktasını açmamalı');

    const stats = await fetch(`${baseUrl}/api/intake/admin/stats`, { headers: adminHeaders });
    assert.equal(stats.status, 200);
    const statsBody = (await stats.json()) as {
      stats: {
        totalSubmissions: number;
        dailyTrend: unknown[];
        volunteerBreakdown: { code: string; total: number; today: number; lastSubmissionAt: string | null }[];
        categoryBreakdown: { category: string; total: number; recent7d: number; pending: number }[];
        localMarketBreakdown: { key: string; count: number }[];
      };
    };
    assert.ok(statsBody.stats.totalSubmissions >= 1);
    assert.equal(statsBody.stats.dailyTrend.length, 14);

    // Gönüllü kırılımı: bu testte yazan MRS-01 en az bir kayıtla görünmeli,
    // son kayıt zamanı dolu olmalı (hiç kaydı olmayan bir kod asla listelenmez).
    const mrsBreakdown = statsBody.stats.volunteerBreakdown.find((row) => row.code === 'MRS-01');
    assert.ok(mrsBreakdown, "volunteerBreakdown 'MRS-01'i içermeli");
    assert.ok(mrsBreakdown!.total >= 1);
    assert.ok(mrsBreakdown!.lastSubmissionAt, 'son kayıt zamanı dolu olmalı');

    // Kategori kırılımı: en az bu testte oluşturulan 'atistirmalik' kaydını içermeli.
    const atistirmalikBreakdown = statsBody.stats.categoryBreakdown.find((row) => row.category === 'atistirmalik');
    assert.ok(atistirmalikBreakdown, "categoryBreakdown 'atistirmalik'i içermeli");
    assert.ok(atistirmalikBreakdown!.total >= 1);
    assert.ok(atistirmalikBreakdown!.recent7d >= 1, 'az önce oluşturulan kayıt son 7 gün içinde sayılmalı');
    assert.ok(atistirmalikBreakdown!.pending >= 1, 'foto yüklenmeyen kayıtlar kalan sayılmalı');

    // Yerel market kırılımı: yazılan ad (kod değil) listelenmeli.
    assert.deepEqual(
      statsBody.stats.localMarketBreakdown.find((row) => row.key === 'Ayşe Manav'),
      { key: 'Ayşe Manav', count: 1 },
    );

    // /admin/pending: bu testten önce PUT edilmemiş en az bir eksik-slotlu
    // kayıt (MISSING_INGREDIENTS_ONLY_GTIN submission'ı) bekleyen kalmalı.
    const pending = await fetch(`${baseUrl}/api/intake/admin/pending`, { headers: adminHeaders });
    assert.equal(pending.status, 200);
    const pendingBody = (await pending.json()) as { submissions: { barcode: string }[] };
    assert.ok(pendingBody.submissions.some((s) => s.barcode === MISSING_INGREDIENTS_ONLY_GTIN));

    // /admin/photos/:filename: gerçek yüklenen fotoğrafı (submissionId-front.jpg) geri verir.
    const photoResponse = await fetch(`${baseUrl}/api/intake/admin/photos/${frontPhotoSubmissionId}-front.jpg`, {
      headers: adminHeaders,
    });
    assert.equal(photoResponse.status, 200);
    assert.equal(photoResponse.headers.get('content-type'), 'image/jpeg');

    const invalidFilename = await fetch(`${baseUrl}/api/intake/admin/photos/..%2F..%2Fetc%2Fpasswd`, {
      headers: adminHeaders,
    });
    assert.equal(invalidFilename.status, 400, 'yol geçişi denemesi (path traversal) reddedilmeli');

    // /admin/export.csv
    const csvResponse = await fetch(`${baseUrl}/api/intake/admin/export.csv`, { headers: adminHeaders });
    assert.equal(csvResponse.status, 200);
    assert.match(csvResponse.headers.get('content-type') ?? '', /text\/csv/);
    const csvText = await csvResponse.text();
    assert.match(csvText, /barcode,volunteer_code,market_chain,market_chain_other/);
    assert.match(csvText, new RegExp(NEW_GTIN));
    assert.match(csvText, /Ayşe Manav/, "yerel market kaydının serbest adı CSV'de görünmeli");

    // /admin/recent: anahtarsız ve yanlış anahtarla red (yönetici paneli onayı, TESTLER).
    const recentNoAuth = await fetch(`${baseUrl}/api/intake/admin/recent`);
    assert.equal(recentNoAuth.status, 401);

    const recentWrongKey = await fetch(`${baseUrl}/api/intake/admin/recent`, {
      headers: { [ADMIN_KEY_HEADER]: 'yanlis' },
    });
    assert.equal(recentWrongKey.status, 401);

    // /admin/recent: doğru anahtarla — fotoğraf yüklenen gerçek bir submission
    // doğru şekle (ürün adı, dosya adı çözümü) sahip dönmeli.
    const recent = await fetch(`${baseUrl}/api/intake/admin/recent?limit=50`, { headers: adminHeaders });
    assert.equal(recent.status, 200);
    const recentBody = (await recent.json()) as {
      submissions: {
        id: string;
        barcode: string;
        productName: string | null;
        volunteerCode: string;
        photos: { slot: string; filename: string | null }[];
      }[];
    };
    const frontSubmission = recentBody.submissions.find((s) => s.id === frontPhotoSubmissionId);
    assert.ok(frontSubmission, "/admin/recent fotoğraf yüklenen submission'ı içermeli");
    assert.equal(frontSubmission!.volunteerCode, 'MRS-01');
    const frontPhoto = frontSubmission!.photos.find((p) => p.slot === 'front');
    assert.ok(frontPhoto, "receivedSlots'taki 'front' photos dizisinde olmalı");
    assert.equal(frontPhoto!.filename, `${frontPhotoSubmissionId}-front.jpg`, 'uzantı diskten (jpg) doğru çözülmeli');

    // Fotoğraf önizlemesi: anahtarsız erişim reddi (yönetici paneli onayı,
    // KURALLAR: "Fotoğraf önizlemesi yalnız yönetici anahtarıyla erişilebilsin").
    const photoNoAuth = await fetch(`${baseUrl}/api/intake/admin/photos/${frontPhotoSubmissionId}-front.jpg`);
    assert.equal(photoNoAuth.status, 401);
  });

  delete process.env.INTAKE_ADMIN_KEY;
}

// ── Oran sınırlama GERÇEK HTTP üzerinden (createRateLimiter'ın kendisi
// rateLimit.smoke.ts'te izole test edildi — burada yalnızca routes.ts'e
// DOĞRU BAĞLANDIĞI kanıtlanır: /auth/verify dakikada 10 istekle sınırlı).
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeRouter({ photosDir: testPhotosDir }));

  await withServer(app, async (baseUrl) => {
    let lastStatus = 0;
    for (let i = 0; i < 11; i += 1) {
      const response = await fetch(`${baseUrl}/api/intake/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'MRS-01', key: 'yanlis' }),
      });
      lastStatus = response.status;
      if (i < 10) assert.equal(response.status, 401, `${i + 1}. istek limit altında 401 dönmeli`);
    }
    assert.equal(lastStatus, 429, '11. istek dakikalık limiti (10) aşmalı');
  });
}

// ── /api/intake devre dışıyken her istek 503 dönmeli ─────────────────────
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeUnavailableRouter('test: Node sürümü yetersiz'));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intake/auth/verify`, { method: 'POST' });
    assert.equal(response.status, 503);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, 'intake_unavailable');
  });
}

// ── requireAdminAuth: anahtar tanımsız → 503; yanlış → 401; doğru → 200 ──
{
  const app = express();
  app.get('/admin-only', requireAdminAuth, (_req, res) => res.json({ ok: true }));

  delete process.env.INTAKE_ADMIN_KEY;
  await withServer(app, async (baseUrl) => {
    const notConfigured = await fetch(`${baseUrl}/admin-only`);
    assert.equal(notConfigured.status, 503, 'INTAKE_ADMIN_KEY tanımsızken 503 dönmeli');
  });

  process.env.INTAKE_ADMIN_KEY = 'super-secret-admin';
  await withServer(app, async (baseUrl) => {
    const wrongKey = await fetch(`${baseUrl}/admin-only`, { headers: { [ADMIN_KEY_HEADER]: 'yanlis' } });
    assert.equal(wrongKey.status, 401);

    const rightKey = await fetch(`${baseUrl}/admin-only`, { headers: { [ADMIN_KEY_HEADER]: 'super-secret-admin' } });
    assert.equal(rightKey.status, 200);
  });
  delete process.env.INTAKE_ADMIN_KEY;
}

delete process.env.INTAKE_VOLUNTEERS_JSON;
rmSync(fixtureDir, { recursive: true, force: true });
console.log('INTAKE_ROUTES_AUTH_SMOKE_OK');
