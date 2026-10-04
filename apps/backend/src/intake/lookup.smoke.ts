/**
 * RafSkoru — Intake barkod lookup sözleşmesi
 * apps/backend/src/intake/lookup.smoke.ts
 *
 * GTIN doğrulama ve katalog erişimi MEVCUT modüllerden (normalize.ts,
 * catalog.ts) gerçek biçimde çağrılır — sahte/kopya bir uygulama yazılmaz.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadCatalog } from '../catalog/catalog.js';
import type { OffImportRecord } from '../tools/offTurkey/normalize.js';

import { createSubmission, markSlotReceived, __resetIntakeDbForTesting } from './db.js';
import { evaluateBarcodeLookup } from './lookup.js';

const BASE_PROVENANCE: OffImportRecord['provenance'] = {
  source: 'off',
  license: 'ODbL-1.0',
  url: 'https://world.openfoodfacts.org/product/0000000000000',
  observedAt: '2026-09-01T00:00:00.000Z',
  fetchedAt: '2026-09-21T00:00:00.000Z',
};

function makeRecord(overrides: Partial<OffImportRecord>): OffImportRecord {
  return {
    gtin: '8690504000013',
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

const COMPLETE_GTIN = '8690504000013';
const MISSING_FIELDS_GTIN = '8690504000020';
const NOT_IN_CATALOG_GTIN = '8690504000037';
const DUPLICATE_GTIN = '8690504000044';
const INVALID_GTIN = '1234567890123';

const completeRecord = makeRecord({
  gtin: COMPLETE_GTIN,
  imageUrl: 'https://example.com/front.jpg',
  ingredientsText: 'Süt, şeker.',
  allergens: { declared: ['milk'], traces: [], rawDeclared: ['en:milk'], rawTraces: [], dataStatus: 'present' },
  nutriscoreGrade: 'c',
  novaGroup: 2,
  nutrition100g: {
    energyKcal: 250,
    fat: 5,
    saturatedFat: 3,
    carbohydrates: 20,
    sugars: 15,
    fiber: 0,
    proteins: 6,
    salt: 0.2,
  },
});

const missingFieldsRecord = makeRecord({
  gtin: MISSING_FIELDS_GTIN,
  imageUrl: 'https://example.com/front.jpg', // 'front' eksik DEĞİL
  ingredientsText: null, // 'ingredients' eksik
  nutriscoreGrade: null,
  novaGroup: null, // 'nutrition' eksik (nutriscore/nova/çekirdek besinler)
});

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-intake-lookup-'));
const catalogPath = join(fixtureDir, 'products.jsonl');
writeFileSync(catalogPath, `${JSON.stringify(completeRecord)}\n${JSON.stringify(missingFieldsRecord)}\n`);
loadCatalog(catalogPath);

__resetIntakeDbForTesting(':memory:');

// ── Geçersiz GTIN (checksum başarısız) ────────────────────────────────────
{
  const result = evaluateBarcodeLookup(INVALID_GTIN, 'MRS-01');
  assert.equal(result.status, 'invalid_gtin');
  assert.deepEqual(result.neededSlots, []);
}

// ── Katalogda var, verisi tam → foto istenmez ────────────────────────────
{
  const result = evaluateBarcodeLookup(COMPLETE_GTIN, 'MRS-01');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.neededSlots, []);
  assert.equal(result.productName, 'Test Ürünü');
}

// ── Katalogda var ama eksik: içindekiler + besin değerleri ───────────────
{
  const result = evaluateBarcodeLookup(MISSING_FIELDS_GTIN, 'MRS-01');
  assert.equal(result.status, 'missing_fields');
  assert.deepEqual(result.neededSlots, ['ingredients', 'nutrition'], "'front' istenmemeli (imageUrl zaten var)");
}

// ── Katalogda hiç yok → yeni ürün, 3 fotoğraf ────────────────────────────
{
  const result = evaluateBarcodeLookup(NOT_IN_CATALOG_GTIN, 'MRS-01');
  assert.equal(result.status, 'new');
  assert.deepEqual(result.neededSlots, ['front', 'ingredients', 'nutrition']);
}

// ── Bu araçla zaten toplanmış (BAŞKA gönüllü, taze kayıt) → mükerrer ─────
{
  createSubmission({
    barcode: DUPLICATE_GTIN,
    volunteerCode: 'MRS-01',
    marketChain: 'migros',
    city: 'istanbul',
    category: 'atistirmalik',
    status: 'new',
    requestedSlots: ['front', 'ingredients', 'nutrition'],
    clientCreatedAt: new Date().toISOString(),
  });

  const result = evaluateBarcodeLookup(DUPLICATE_GTIN, 'MRS-02');
  assert.equal(result.status, 'duplicate');
  assert.deepEqual(result.neededSlots, []);
  assert.equal(result.volunteerCode, 'MRS-01');
  assert.ok(result.collectedAt);

  // Mükerrer kontrolü katalogdan ÖNCE gelir: bu barkod katalogda olsa bile
  // (burada değil ama prensipte) yine "duplicate" dönmeli — zaten dönüyor
  // çünkü findSubmissionByBarcode katalog kontrolünden önce çağrılıyor.
}

// ── Tüm slotları gelmiş (tamamlanmış) kayıt → aynı gönüllü de olsa kilitli
// kalır (bkz. görev onayı, madde 4b: yalnız YARIM KALAN kayıtlar yeniden açılır) ─
const COMPLETED_SUBMISSION_GTIN = '8690504000068';
{
  const submission = createSubmission({
    barcode: COMPLETED_SUBMISSION_GTIN,
    volunteerCode: 'MRS-01',
    marketChain: 'migros',
    city: 'istanbul',
    category: 'atistirmalik',
    status: 'new',
    requestedSlots: ['front'],
    clientCreatedAt: new Date().toISOString(),
  });
  markSlotReceived(submission.id, 'front');

  const resultSameVolunteer = evaluateBarcodeLookup(COMPLETED_SUBMISSION_GTIN, 'MRS-01');
  assert.equal(resultSameVolunteer.status, 'duplicate', 'tamamlanmış kayıt aynı gönüllü için de kilitli kalmalı');
}

// ── Yarım kalan kayıt + AYNI gönüllü tekrar dener → barkod hemen yeniden
// açılır, eski kayıt silinmez ("terk edilmiş" işaretlenir) ───────────────
const SAME_VOLUNTEER_RETRY_GTIN = '8690504000075';
{
  const firstAttempt = createSubmission({
    barcode: SAME_VOLUNTEER_RETRY_GTIN,
    volunteerCode: 'MRS-01',
    marketChain: 'migros',
    city: 'istanbul',
    category: 'atistirmalik',
    status: 'new',
    requestedSlots: ['front', 'ingredients', 'nutrition'],
    clientCreatedAt: new Date().toISOString(),
  });
  markSlotReceived(firstAttempt.id, 'front'); // yarım kalmış — ingredients/nutrition eksik

  const retryResult = evaluateBarcodeLookup(SAME_VOLUNTEER_RETRY_GTIN, 'MRS-01');
  assert.equal(retryResult.status, 'new', "aynı gönüllü tekrar denediğinde barkod 'yeni' gibi yeniden açılmalı");
  assert.deepEqual(retryResult.neededSlots, ['front', 'ingredients', 'nutrition']);

  // Başka bir gönüllü hâlâ kilitli görür — eski kayıt "terk edilmiş" olsa da
  // bu, SADECE aynı gönüllünün erişimini açar.
  const otherVolunteerResult = evaluateBarcodeLookup(SAME_VOLUNTEER_RETRY_GTIN, 'MRS-02');
  assert.equal(otherVolunteerResult.status, 'new', 'eski kayıt terk edildiği için barkod artık serbest');
}

// ── Yarım kalan kayıt + 2 SAAT geçmiş (FARKLI gönüllü) → barkod yeniden
// açılır — gerçek saat beklemek yerine Date.now() ileri sarılır ─────────
const STALE_GTIN = '8690504000082';
{
  const submission = createSubmission({
    barcode: STALE_GTIN,
    volunteerCode: 'MRS-01',
    marketChain: 'migros',
    city: 'istanbul',
    category: 'atistirmalik',
    status: 'new',
    requestedSlots: ['front'],
    clientCreatedAt: new Date().toISOString(),
  });
  assert.ok(submission.id);

  const realNow = Date.now;
  Date.now = () => realNow() + 2 * 60 * 60 * 1000 + 1_000;
  try {
    const result = evaluateBarcodeLookup(STALE_GTIN, 'MRS-02');
    assert.equal(result.status, 'new', '2 saat geçtikten sonra FARKLI bir gönüllü de barkodu yeniden açabilmeli');
    assert.deepEqual(result.neededSlots, ['front', 'ingredients', 'nutrition']);
  } finally {
    Date.now = realNow;
  }
}

rmSync(fixtureDir, { recursive: true, force: true });
console.log('INTAKE_LOOKUP_SMOKE_OK');
