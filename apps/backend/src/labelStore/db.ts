/**
 * RafSkoru — Etiket okuma deposu (ADR-009)
 * apps/backend/src/labelStore/db.ts
 *
 * İki tablo tutar:
 *   - label_candidates: bir barkod için etiket fotoğraflarından yapılan
 *     okumalar (çıkarım + bağımsız doğrulama) ve insan kararı. ADAY kayıttır;
 *     hiçbir alerjen/uygunluk kararına girmez (ADR-009 §4, §5).
 *   - verified_label_products: insan onaylı etiket kayıtları, sürümlü. Eski
 *     sürüm silinmez (ADR-009 §7).
 *
 * Bu modül henüz hiçbir uç noktaya veya çözümleme yoluna BAĞLI DEĞİLDİR
 * (index.ts'te başlatılmaz). Bağlantı ayrı işlerdir (Faz 1, İş 1.2–1.5).
 *
 * TÜM SQL erişimi bu dosyada toplanır (intake/db.ts ile aynı kural). Yeni
 * npm paketi yoktur: node:sqlite Node'a yerleşiktir (>= 22.5.0).
 *
 * Girdi doğrulaması bilerek katıdır: okumalar bir modelden veya içe aktarılan
 * bir dosyadan gelir, yani güvenilmeyen girdidir. Boş metin kabul edilmez —
 * "okunamadı" yalnız null ile ifade edilir; bilinmeyen anahtarlar atılır.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { INTAKE_MIN_NODE_VERSION, isVersionAtLeast } from '../intake/db.js';
import { isValidGtin } from '../tools/offTurkey/normalize.js';
import type {
  ApproveCandidateInput,
  CreateCandidateInput,
  LabelCandidate,
  LabelCandidateStatus,
  LabelFields,
  LabelNutritionPer100,
  LabelPhotoRef,
  LabelPhotoSlot,
  LabelPhotoSource,
  LabelProductKind,
  LabelProductKindSource,
  LabelRead,
  LabelReaderKind,
  RejectCandidateInput,
  VerifiedLabelProduct,
} from './types.js';

export class LabelStoreUnsupportedNodeError extends Error {}

/** Girdi kurala uymuyor (geçersiz barkod, boş metin, eksik kanıt vb.). */
export class LabelStoreValidationError extends Error {}

/** İstenen geçiş adayın bulunduğu durumdan yapılamaz. */
export class LabelStoreStateError extends Error {
  constructor(
    public readonly candidateId: string,
    public readonly currentStatus: LabelCandidateStatus,
    public readonly attempted: string,
  ) {
    super(`Aday ${candidateId} '${currentStatus}' durumunda; '${attempted}' yapılamaz.`);
  }
}

export class LabelCandidateNotFoundError extends Error {
  constructor(public readonly candidateId: string) {
    super(`Aday bulunamadı: ${candidateId}`);
  }
}

const PHOTO_SOURCES: readonly LabelPhotoSource[] = ['off_photo', 'intake', 'user_app'];
const PHOTO_SLOTS: readonly LabelPhotoSlot[] = ['front', 'ingredients', 'nutrition'];
const READER_KINDS: readonly LabelReaderKind[] = ['desktop_session', 'api'];
const PRODUCT_KINDS: readonly LabelProductKind[] = [
  'general',
  'beverage',
  'water',
  'cheese',
  'fat_oil_nuts_seeds',
  'red_meat',
  'not_applicable',
  'alcoholic_beverage',
];

export const LABEL_TEXT_FIELD_KEYS = [
  'productName',
  'brand',
  'quantityText',
  'ingredientsText',
  'ingredientsLang',
  'allergenStatementText',
  'traceStatementText',
] as const;

export const LABEL_NUTRIENT_KEYS = [
  'energyKcal',
  'fat',
  'saturatedFat',
  'carbohydrates',
  'sugars',
  'fiber',
  'protein',
  'salt',
] as const;

let db: DatabaseSync | null = null;

/**
 * Onaylı kayıt kümesi her değiştiğinde (açılış, onay) artar. Onaylı kayıtları
 * önbelleğe alan katmanlar (catalog/effectiveCatalog.ts, liste puanları) bu
 * sayı değişince önbelleklerini yeniler.
 */
let verifiedRevision = 0;

// ── Doğrulama yardımcıları ───────────────────────────────────────────────

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertIsoTimestamp(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new LabelStoreValidationError(`${fieldName} ISO tarih-saat olmalı.`);
  }
  return value;
}

function assertNonEmptyText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LabelStoreValidationError(`${fieldName} boş olamaz.`);
  }
  return value.trim();
}

function sanitizeProductKind(input: unknown, fieldName: string): LabelProductKind | null {
  if (input === null || input === undefined) return null;
  if (!PRODUCT_KINDS.includes(input as LabelProductKind)) {
    throw new LabelStoreValidationError(`${fieldName} geçersiz.`);
  }
  return input as LabelProductKind;
}

function sanitizePhotos(input: unknown): LabelPhotoRef[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new LabelStoreValidationError('En az bir etiket fotoğrafı gerekli (kanıtsız kayıt açılmaz).');
  }

  return input.map((item, index) => {
    if (!isPlainObject(item)) throw new LabelStoreValidationError(`photos[${index}] nesne olmalı.`);
    if (!PHOTO_SLOTS.includes(item.slot as LabelPhotoSlot)) {
      throw new LabelStoreValidationError(`photos[${index}].slot geçersiz.`);
    }
    const attribution = item.attribution ?? null;
    if (attribution !== null && (typeof attribution !== 'string' || attribution.trim().length === 0)) {
      throw new LabelStoreValidationError(`photos[${index}].attribution metin veya null olmalı.`);
    }
    return {
      slot: item.slot as LabelPhotoSlot,
      ref: assertNonEmptyText(item.ref, `photos[${index}].ref`),
      attribution: attribution === null ? null : (attribution as string).trim(),
    };
  });
}

function sanitizeNutrition(input: unknown): LabelNutritionPer100 | null {
  if (input === null || input === undefined) return null;
  if (!isPlainObject(input)) throw new LabelStoreValidationError('nutritionPer100 nesne veya null olmalı.');

  const basis = input.basis ?? null;
  if (basis !== null && basis !== '100g' && basis !== '100ml') {
    throw new LabelStoreValidationError("nutritionPer100.basis '100g', '100ml' veya null olmalı.");
  }

  const nutrition: LabelNutritionPer100 = {
    basis,
    energyKcal: null,
    fat: null,
    saturatedFat: null,
    carbohydrates: null,
    sugars: null,
    fiber: null,
    protein: null,
    salt: null,
  };

  for (const key of LABEL_NUTRIENT_KEYS) {
    const value = input[key] ?? null;
    if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new LabelStoreValidationError(`nutritionPer100.${key} negatif olmayan sayı veya null olmalı.`);
    }
    nutrition[key] = value;
  }

  return nutrition;
}

/** Bilinmeyen anahtarları atar; boş metni reddeder ("okunamadı" yalnız null'dır). */
function sanitizeFields(input: unknown): LabelFields {
  if (!isPlainObject(input)) throw new LabelStoreValidationError('fields nesne olmalı.');

  const text = {} as Record<(typeof LABEL_TEXT_FIELD_KEYS)[number], string | null>;
  for (const key of LABEL_TEXT_FIELD_KEYS) {
    const value = input[key] ?? null;
    if (value !== null && (typeof value !== 'string' || value.trim().length === 0)) {
      throw new LabelStoreValidationError(`fields.${key} dolu metin veya null olmalı (boş metin kabul edilmez).`);
    }
    text[key] = value;
  }

  return { ...text, nutritionPer100: sanitizeNutrition(input.nutritionPer100) };
}

function sanitizeRead(input: unknown): LabelRead {
  if (!isPlainObject(input)) throw new LabelStoreValidationError('Okuma nesne olmalı.');
  if (!READER_KINDS.includes(input.reader as LabelReaderKind)) {
    throw new LabelStoreValidationError('Okuma: reader geçersiz.');
  }

  const model = input.model ?? null;
  if (model !== null && (typeof model !== 'string' || model.trim().length === 0)) {
    throw new LabelStoreValidationError('Okuma: model metin veya null olmalı.');
  }

  return {
    reader: input.reader as LabelReaderKind,
    model,
    readAt: assertIsoTimestamp(input.readAt, 'Okuma: readAt'),
    fields: sanitizeFields(input.fields),
    unreadableFields: sanitizeStringList(input.unreadableFields, 'Okuma: unreadableFields'),
  };
}

function sanitizeStringList(input: unknown, fieldName: string): string[] {
  if (!Array.isArray(input) || input.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    throw new LabelStoreValidationError(`${fieldName} dolu metinlerden oluşan bir liste olmalı.`);
  }
  return [...new Set(input as string[])];
}

/** En az bir alan dolu mu? Tamamen boş bir kayıt onaylanamaz. */
export function labelFieldsHaveContent(fields: LabelFields): boolean {
  if (LABEL_TEXT_FIELD_KEYS.some((key) => fields[key] !== null)) return true;
  const nutrition = fields.nutritionPer100;
  return nutrition !== null && LABEL_NUTRIENT_KEYS.some((key) => nutrition[key] !== null);
}

// ── Başlatma ─────────────────────────────────────────────────────────────

/** Testler için :memory: ile de çağrılır. Henüz index.ts'ten çağrılmaz. */
export function initLabelStoreDb(path: string): void {
  if (!isVersionAtLeast(process.versions.node, INTAKE_MIN_NODE_VERSION)) {
    throw new LabelStoreUnsupportedNodeError(
      `Etiket deposu node:sqlite gerektirir (Node >= ${INTAKE_MIN_NODE_VERSION}). ` +
        `Çalışan Node sürümü: ${process.versions.node}.`,
    );
  }

  if (path !== ':memory:') {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  let instance: DatabaseSync;
  try {
    instance = new DatabaseSync(path);
  } catch (err) {
    throw new LabelStoreUnsupportedNodeError(
      `node:sqlite bu Node çalışma zamanında açılamadı (${(err as Error).message}).`,
    );
  }

  instance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS label_candidates (
      id TEXT PRIMARY KEY,
      barcode TEXT NOT NULL,
      photo_source TEXT NOT NULL CHECK (photo_source IN ('off_photo', 'intake', 'user_app')),
      photos TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('awaiting_read', 'read', 'agreed', 'disagreed', 'approved', 'rejected')),
      extract_read TEXT,
      verify_read TEXT,
      differing_fields TEXT,
      decided_by TEXT,
      decided_at TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_label_candidates_barcode ON label_candidates(barcode);
    CREATE INDEX IF NOT EXISTS idx_label_candidates_status ON label_candidates(status);

    CREATE TABLE IF NOT EXISTS verified_label_products (
      barcode TEXT NOT NULL,
      version INTEGER NOT NULL,
      fields TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      photos TEXT NOT NULL,
      photo_source TEXT NOT NULL,
      candidate_id TEXT NOT NULL UNIQUE REFERENCES label_candidates(id),
      approved_by TEXT NOT NULL,
      approved_at TEXT NOT NULL,
      superseded_at TEXT,
      PRIMARY KEY (barcode, version)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_label_current
      ON verified_label_products(barcode) WHERE superseded_at IS NULL;
  `);

  // Hafif şema göçü (İş 1.3c): ürün türü sütunları sonradan eklendi. CREATE
  // TABLE IF NOT EXISTS mevcut tabloya sütun eklemez; eksikse ALTER TABLE ile
  // eklenir. Eski satırlarda değer NULL kalır (tür bilinmiyor).
  addColumnIfMissing(instance, 'label_candidates', 'declared_product_kind');
  addColumnIfMissing(instance, 'verified_label_products', 'product_kind');
  addColumnIfMissing(instance, 'verified_label_products', 'product_kind_source');

  db = instance;
  verifiedRevision += 1;
}

function addColumnIfMissing(instance: DatabaseSync, table: string, column: string): void {
  const columns = instance.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!columns.some((existing) => existing.name === column)) {
    instance.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT`);
  }
}

/** Yalnız testler için — depoyu kapatıp verilen yoldan yeniden başlatır. */
export function __resetLabelStoreDbForTesting(path: string): void {
  if (db) {
    db.close();
    db = null;
  }
  initLabelStoreDb(path);
}

export function isLabelStoreDbReady(): boolean {
  return db !== null;
}

function requireDb(): DatabaseSync {
  if (!db) throw new Error('Etiket deposu henüz başlatılmadı (initLabelStoreDb çağrılmalı).');
  return db;
}

function inTransaction<T>(database: DatabaseSync, work: () => T): T {
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    database.exec('COMMIT');
    return result;
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Birden çok depo işlemini tek işlem (transaction) içinde çalıştırır; biri
 * hata verirse hepsi geri alınır. İçe aktarma (importReads.ts) yarım kalmış
 * aday bırakmamak için kullanır. İç içe çağrılmamalıdır (approveCandidate
 * gibi kendi işlemini açan fonksiyonlarla birlikte kullanılmaz).
 */
/**
 * Bir okumayı depoya yazmadan aynı kurallarla denetler ve temizlenmiş hâlini
 * döndürür (bilinmeyen anahtarlar atılır; boş metin reddedilir).
 */
export function validateLabelRead(read: unknown): LabelRead {
  return sanitizeRead(read);
}

export function runInLabelStoreTransaction<T>(work: () => T): T {
  return inTransaction(requireDb(), work);
}

// ── Satır dönüşümleri ────────────────────────────────────────────────────

function parseJsonOrNull<T>(value: unknown): T | null {
  return typeof value === 'string' ? (JSON.parse(value) as T) : null;
}

function rowToCandidate(row: Record<string, unknown>): LabelCandidate {
  return {
    id: row.id as string,
    barcode: row.barcode as string,
    photoSource: row.photo_source as LabelPhotoSource,
    photos: JSON.parse(row.photos as string) as LabelPhotoRef[],
    observedAt: row.observed_at as string,
    declaredProductKind: (row.declared_product_kind as LabelProductKind | null) ?? null,
    status: row.status as LabelCandidateStatus,
    extractRead: parseJsonOrNull<LabelRead>(row.extract_read),
    verifyRead: parseJsonOrNull<LabelRead>(row.verify_read),
    differingFields: parseJsonOrNull<string[]>(row.differing_fields),
    decidedBy: (row.decided_by as string | null) ?? null,
    decidedAt: (row.decided_at as string | null) ?? null,
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToVerified(row: Record<string, unknown>): VerifiedLabelProduct {
  return {
    barcode: row.barcode as string,
    version: row.version as number,
    fields: JSON.parse(row.fields as string) as LabelFields,
    observedAt: row.observed_at as string,
    photos: JSON.parse(row.photos as string) as LabelPhotoRef[],
    photoSource: row.photo_source as LabelPhotoSource,
    candidateId: row.candidate_id as string,
    productKind: (row.product_kind as LabelProductKind | null) ?? null,
    productKindSource: (row.product_kind_source as LabelProductKindSource | null) ?? null,
    approvedBy: row.approved_by as string,
    approvedAt: row.approved_at as string,
    supersededAt: (row.superseded_at as string | null) ?? null,
  };
}

// ── Aday kayıtlar ────────────────────────────────────────────────────────

/** Kanıtsız aday açılmaz: geçerli barkod + en az bir fotoğraf + gözlem zamanı şarttır. */
export function createCandidate(input: CreateCandidateInput): LabelCandidate {
  if (typeof input.barcode !== 'string' || !isValidGtin(input.barcode)) {
    throw new LabelStoreValidationError('Barkod geçerli bir GTIN değil.');
  }
  if (!PHOTO_SOURCES.includes(input.photoSource)) {
    throw new LabelStoreValidationError('photoSource geçersiz.');
  }
  const photos = sanitizePhotos(input.photos);
  const observedAt = assertIsoTimestamp(input.observedAt, 'observedAt');
  const declaredProductKind = sanitizeProductKind(input.declaredProductKind, 'declaredProductKind');

  const id = randomUUID();
  const now = new Date().toISOString();

  requireDb()
    .prepare(
      `INSERT INTO label_candidates
         (id, barcode, photo_source, photos, observed_at, declared_product_kind, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'awaiting_read', ?, ?)`,
    )
    .run(id, input.barcode, input.photoSource, JSON.stringify(photos), observedAt, declaredProductKind, now, now);

  return getCandidate(id)!;
}

export function getCandidate(id: string): LabelCandidate | null {
  const row = requireDb().prepare('SELECT * FROM label_candidates WHERE id = ?').get(id);
  return row ? rowToCandidate(row as Record<string, unknown>) : null;
}

function requireCandidate(id: string): LabelCandidate {
  const candidate = getCandidate(id);
  if (!candidate) throw new LabelCandidateNotFoundError(id);
  return candidate;
}

export function listCandidatesByStatus(status: LabelCandidateStatus, limit = 100): LabelCandidate[] {
  const rows = requireDb()
    .prepare('SELECT * FROM label_candidates WHERE status = ? ORDER BY created_at ASC, id ASC LIMIT ?')
    .all(status, limit);
  return rows.map((row) => rowToCandidate(row as Record<string, unknown>));
}

export function listCandidatesForBarcode(barcode: string): LabelCandidate[] {
  const rows = requireDb()
    .prepare('SELECT * FROM label_candidates WHERE barcode = ? ORDER BY created_at ASC, id ASC')
    .all(barcode);
  return rows.map((row) => rowToCandidate(row as Record<string, unknown>));
}

/** Çıkarım okuması: awaiting_read → read. */
export function recordExtraction(id: string, read: LabelRead): LabelCandidate {
  const clean = sanitizeRead(read);
  const candidate = requireCandidate(id);
  if (candidate.status !== 'awaiting_read') {
    throw new LabelStoreStateError(id, candidate.status, 'recordExtraction');
  }

  requireDb()
    .prepare(`UPDATE label_candidates SET extract_read = ?, status = 'read', updated_at = ? WHERE id = ?`)
    .run(JSON.stringify(clean), new Date().toISOString(), id);

  return getCandidate(id)!;
}

/**
 * Bağımsız doğrulama okuması: read → agreed | disagreed.
 * Karşılaştırmayı çağıran taraf yapar (İş 1.4); depo yalnız sonucu saklar.
 * Ayrışan alan yoksa 'agreed', varsa 'disagreed'.
 */
export function recordVerification(id: string, read: LabelRead, differingFields: string[]): LabelCandidate {
  const clean = sanitizeRead(read);
  const differing = sanitizeStringList(differingFields, 'differingFields');
  const candidate = requireCandidate(id);
  if (candidate.status !== 'read') {
    throw new LabelStoreStateError(id, candidate.status, 'recordVerification');
  }

  requireDb()
    .prepare(
      `UPDATE label_candidates SET verify_read = ?, differing_fields = ?, status = ?, updated_at = ? WHERE id = ?`,
    )
    .run(
      JSON.stringify(clean),
      JSON.stringify(differing),
      differing.length === 0 ? 'agreed' : 'disagreed',
      new Date().toISOString(),
      id,
    );

  return getCandidate(id)!;
}

/**
 * İnsan onayı: agreed | disagreed → approved, ve yeni bir doğrulanmış sürüm.
 *
 * - İki okuma da yapılmadan onay verilemez (ADR-009 §3).
 * - Okumalar ayrıştıysa ('disagreed') onaylayan alanları AÇIKÇA vermelidir;
 *   çıkarım okuması sessizce seçilmez.
 * - Tamamen boş bir kayıt onaylanamaz.
 * - Aynı barkodun önceki güncel sürümü silinmez, superseded_at ile işaretlenir.
 */
export function approveCandidate(id: string, input: ApproveCandidateInput): VerifiedLabelProduct {
  const approvedBy = assertNonEmptyText(input.approvedBy, 'approvedBy');
  const candidate = requireCandidate(id);

  if (candidate.status !== 'agreed' && candidate.status !== 'disagreed') {
    throw new LabelStoreStateError(id, candidate.status, 'approveCandidate');
  }
  if (candidate.status === 'disagreed' && input.fields === undefined) {
    throw new LabelStoreValidationError(
      'Okumalar ayrıştı; onaylayan alanları açıkça vermelidir (fields).',
    );
  }

  const fields = input.fields === undefined ? candidate.extractRead!.fields : sanitizeFields(input.fields);
  if (!labelFieldsHaveContent(fields)) {
    throw new LabelStoreValidationError('Hiçbir alanı dolu olmayan kayıt onaylanamaz.');
  }

  // Onaylayan tür verdiyse (null dâhil) o geçerlidir; hiç vermediyse adayın
  // beyanı kaynağı belirtilerek taşınır. Tür bilinmiyorsa kaynak da null kalır.
  const approverSetKind = input.productKind !== undefined;
  const productKind = approverSetKind
    ? sanitizeProductKind(input.productKind, 'productKind')
    : candidate.declaredProductKind;
  const productKindSource: LabelProductKindSource | null =
    productKind === null ? null : approverSetKind ? 'approver' : 'user_declared';

  const database = requireDb();
  const now = new Date().toISOString();

  return inTransaction(database, () => {
    database
      .prepare('UPDATE verified_label_products SET superseded_at = ? WHERE barcode = ? AND superseded_at IS NULL')
      .run(now, candidate.barcode);

    const versionRow = database
      .prepare('SELECT COALESCE(MAX(version), 0) + 1 AS next FROM verified_label_products WHERE barcode = ?')
      .get(candidate.barcode) as { next: number };

    database
      .prepare(
        `INSERT INTO verified_label_products
           (barcode, version, fields, observed_at, photos, photo_source, candidate_id,
            product_kind, product_kind_source, approved_by, approved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        candidate.barcode,
        versionRow.next,
        JSON.stringify(fields),
        candidate.observedAt,
        JSON.stringify(candidate.photos),
        candidate.photoSource,
        candidate.id,
        productKind,
        productKindSource,
        approvedBy,
        now,
      );

    database
      .prepare(
        `UPDATE label_candidates SET status = 'approved', decided_by = ?, decided_at = ?, updated_at = ? WHERE id = ?`,
      )
      .run(approvedBy, now, now, id);

    verifiedRevision += 1;
    return getCurrentVerified(candidate.barcode)!;
  });
}

/** İnsan reddi: son durumda olmayan her aday reddedilebilir. Doğrulanmış kayıt oluşmaz. */
export function rejectCandidate(id: string, input: RejectCandidateInput): LabelCandidate {
  const rejectedBy = assertNonEmptyText(input.rejectedBy, 'rejectedBy');
  const reason = assertNonEmptyText(input.reason, 'reason');
  const candidate = requireCandidate(id);

  if (candidate.status === 'approved' || candidate.status === 'rejected') {
    throw new LabelStoreStateError(id, candidate.status, 'rejectCandidate');
  }

  const now = new Date().toISOString();
  requireDb()
    .prepare(
      `UPDATE label_candidates
         SET status = 'rejected', decided_by = ?, decided_at = ?, rejection_reason = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(rejectedBy, now, reason, now, id);

  return getCandidate(id)!;
}

// ── Doğrulanmış kayıtlar ─────────────────────────────────────────────────

/** Barkodun güncel insan onaylı kaydı; yoksa null. Aday kayıtlar buradan ASLA dönmez. */
export function getCurrentVerified(barcode: string): VerifiedLabelProduct | null {
  const row = requireDb()
    .prepare('SELECT * FROM verified_label_products WHERE barcode = ? AND superseded_at IS NULL')
    .get(barcode);
  return row ? rowToVerified(row as Record<string, unknown>) : null;
}

/** Bütün barkodların güncel insan onaylı kayıtları. Aday kayıtlar dönmez. */
export function listCurrentVerified(): VerifiedLabelProduct[] {
  const rows = requireDb()
    .prepare('SELECT * FROM verified_label_products WHERE superseded_at IS NULL ORDER BY barcode ASC')
    .all();
  return rows.map((row) => rowToVerified(row as Record<string, unknown>));
}

/** Onaylı kayıt kümesinin sürüm sayacı (bkz. verifiedRevision). Depo hazır değilse 0. */
export function getVerifiedRevision(): number {
  return db ? verifiedRevision : 0;
}

/** Barkodun tüm sürümleri, eskiden yeniye. */
export function getVerifiedHistory(barcode: string): VerifiedLabelProduct[] {
  const rows = requireDb()
    .prepare('SELECT * FROM verified_label_products WHERE barcode = ? ORDER BY version ASC')
    .all(barcode);
  return rows.map((row) => rowToVerified(row as Record<string, unknown>));
}
