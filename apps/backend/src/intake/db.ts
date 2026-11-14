/**
 * RafSkoru — Intake (gönüllü ürün toplama) veritabanı
 * apps/backend/src/intake/db.ts
 *
 * TÜM SQL erişimi bu dosyada toplanır — routes.ts ve diğer intake
 * modülleri yalnızca bu dosyanın dışa açtığı fonksiyonları çağırır, asla
 * doğrudan SQL yazmaz. İleride node:sqlite yerine başka bir kütüphaneye
 * geçilirse tek değişecek yer burasıdır (bkz. görev onayı, madde 1b).
 *
 * node:sqlite Node'a yerleşiktir (v22.5.0'dan itibaren, deneysel API) —
 * bu yüzden yeni bir npm paketi eklenmedi (bkz. görev onayı, madde 1).
 * Bazı Node 22.x yama sürümleri modülü yalnızca --experimental-sqlite
 * bayrağıyla açar; assertNodeSupportsIntake() sürüm numarasını kontrol
 * eder, initIntakeDb() ise gerçek DatabaseSync açılışını da dener —
 * ikisi birlikte hem "sürüm çok eski" hem "sürüm yeterli ama bayrak
 * gerekiyor" durumlarında anlaşılır bir hata verir (bkz. README.md
 * "Intake modülü çalıştırma gereksinimleri").
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { INTAKE_CATEGORIES, LOCAL_MARKET_CHAIN_KEY } from './constants.js';

export const INTAKE_MIN_NODE_VERSION = '22.5.0';

export class IntakeUnsupportedNodeError extends Error {}

export class DuplicateBarcodeError extends Error {
  constructor(public readonly barcode: string) {
    super(`Barkod zaten kayıtlı: ${barcode}`);
  }
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map((part) => Number(part));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** Dışa açık: yalnız testler doğrudan sürüm karşılaştırma mantığını (çalışan Node sürümünden bağımsız) kontrol edebilsin diye. */
export function isVersionAtLeast(current: string, minimum: string): boolean {
  const [currentMajor, currentMinor, currentPatch] = parseVersion(current);
  const [minMajor, minMinor, minPatch] = parseVersion(minimum);

  if (currentMajor !== minMajor) return currentMajor > minMajor;
  if (currentMinor !== minMinor) return currentMinor > minMinor;
  return currentPatch >= minPatch;
}

/** Yalnız sürüm numarasını kontrol eder — gerçek node:sqlite açılışını denemez (bkz. initIntakeDb). */
export function assertNodeSupportsIntake(): void {
  const current = process.versions.node;

  if (!isVersionAtLeast(current, INTAKE_MIN_NODE_VERSION)) {
    throw new IntakeUnsupportedNodeError(
      `RafSkoru intake modülü node:sqlite gerektirir (Node >= ${INTAKE_MIN_NODE_VERSION}). ` +
        `Çalışan Node sürümü: ${current}. Node'u güncelleyin — bkz. apps/backend/README.md ` +
        `"Intake modülü çalıştırma gereksinimleri".`,
    );
  }
}

export interface IntakeSubmissionRow {
  id: string;
  barcode: string;
  volunteerCode: string;
  marketChain: string;
  /** Yalnız marketChain === LOCAL_MARKET_CHAIN_KEY ('yerel') iken dolu — başka hiçbir kodla birlikte kaydedilmez. */
  marketChainOther: string | null;
  city: string;
  category: string;
  status: 'new' | 'missing_fields';
  requestedSlots: string[];
  receivedSlots: string[];
  createdAt: string;
  clientCreatedAt: string;
  /** Dolu ise bu kayıt "terk edilmiş" sayılır: barkod yeniden açılmıştır ama
   * fotoğraflar SİLİNMEMİŞTİR — yalnız admin panelinde geçmiş olarak görünür
   * (bkz. görev onayı, madde 4b: "veri kaybı olmasın"). */
  abandonedAt: string | null;
}

export interface CreateSubmissionInput {
  barcode: string;
  volunteerCode: string;
  marketChain: string;
  marketChainOther?: string | null;
  city: string;
  category: string;
  status: 'new' | 'missing_fields';
  requestedSlots: string[];
  clientCreatedAt: string;
}

export interface AdminCountRow {
  key: string;
  count: number;
}

export interface CategoryBreakdownRow {
  category: string;
  total: number;
  /** Son 7 gün içinde oluşturulan kayıt sayısı — "hangi kategori durdu" sorusu için (bkz. yönetici paneli onayı). */
  recent7d: number;
  /** requestedSlots'un bir kısmı hâlâ receivedSlots'ta olmayan kayıt sayısı. Ayrı bir sütundur, SIRALAMA ÖLÇÜTÜ DEĞİLDİR. */
  pending: number;
}

export interface VolunteerBreakdownRow {
  code: string;
  total: number;
  today: number;
  /** ISO zaman damgası — hiç kaydı yoksa null (teoride olmaz, byVolunteer zaten yalnız kaydı olanları listeler). */
  lastSubmissionAt: string | null;
}

export interface AdminStats {
  totalSubmissions: number;
  todaySubmissions: number;
  byVolunteer: AdminCountRow[];
  /** Gönüllü başına toplam/bugün/son kayıt zamanı — yönetici panelindeki gönüllü tablosu için. */
  volunteerBreakdown: VolunteerBreakdownRow[];
  byCity: AdminCountRow[];
  byMarketChain: AdminCountRow[];
  categoryBreakdown: CategoryBreakdownRow[];
  /** market_chain='yerel' kayıtlarında yazılan serbest ad başına sayım (bkz. görev onayı). */
  localMarketBreakdown: AdminCountRow[];
  /** Son 14 gün, en eskiden en yeniye. Kayıt olmayan günler 0 count ile dolu gelir. */
  dailyTrend: { date: string; count: number }[];
}

/** Yarım kalan bir kayıt bu süre sonunda aynı barkod için yeniden açılır (bkz. görev onayı, madde 4b). */
export const INTAKE_REOPEN_AFTER_MS = 2 * 60 * 60 * 1000;

let db: DatabaseSync | null = null;

function todayStartIso(): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function rowToSubmission(row: Record<string, unknown>): IntakeSubmissionRow {
  return {
    id: row.id as string,
    barcode: row.barcode as string,
    volunteerCode: row.volunteer_code as string,
    marketChain: row.market_chain as string,
    marketChainOther: (row.market_chain_other as string | null) ?? null,
    city: row.city as string,
    category: row.category as string,
    status: row.status as IntakeSubmissionRow['status'],
    requestedSlots: JSON.parse(row.requested_slots as string) as string[],
    receivedSlots: JSON.parse(row.received_slots as string) as string[],
    createdAt: row.created_at as string,
    clientCreatedAt: row.client_created_at as string,
    abandonedAt: (row.abandoned_at as string | null) ?? null,
  };
}

/** Backend açılışında bir kez çağrılır (bkz. index.ts). Testler için de kullanılır (:memory: veya geçici dosya ile). */
export function initIntakeDb(path: string): void {
  assertNodeSupportsIntake();

  if (path !== ':memory:') {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  let instance: DatabaseSync;
  try {
    instance = new DatabaseSync(path);
  } catch (err) {
    throw new IntakeUnsupportedNodeError(
      `node:sqlite bu Node çalışma zamanında açılamadı (${(err as Error).message}). ` +
        `Node ${INTAKE_MIN_NODE_VERSION}+ kullanın; bazı Node 22.x yamalarında ayrıca ` +
        `--experimental-sqlite bayrağı gerekebilir — bkz. apps/backend/README.md.`,
    );
  }

  instance.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      barcode TEXT NOT NULL,
      volunteer_code TEXT NOT NULL,
      market_chain TEXT NOT NULL,
      market_chain_other TEXT,
      city TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_slots TEXT NOT NULL,
      received_slots TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      client_created_at TEXT NOT NULL,
      abandoned_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_volunteer ON submissions(volunteer_code);
    CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
  `);

  // Hafif şema göçü: market_chain_other sonradan eklendi (bkz. görev onayı,
  // "yerel" market serbest metni). CREATE TABLE IF NOT EXISTS, tablo zaten
  // varsa yeni sütunu eklemez — bu yüzden PRAGMA table_info ile kontrol edip
  // gerekirse ALTER TABLE ile eklenir. Yeni kurulan bir veritabanında bu
  // dal hiç çalışmaz (sütun CREATE TABLE ile zaten gelir — bkz. altta).
  const columns = instance.prepare('PRAGMA table_info(submissions)').all() as { name: string }[];
  if (!columns.some((column) => column.name === 'market_chain_other')) {
    instance.exec('ALTER TABLE submissions ADD COLUMN market_chain_other TEXT');
  }

  // Şema göçü: eski tablolarda barcode sütun-seviyesi UNIQUE idi — bu, yarım
  // kalan bir kaydı asla silmeden barkodu yeniden açmayı imkânsız kılıyordu
  // (bkz. görev onayı, madde 4b). SQLite ALTER TABLE ile sütun kısıtlaması
  // kaldıramaz; tablo yeniden kurulur, VERİ KAYBI OLMADAN kopyalanır, eski
  // UNIQUE yerine "yalnız terk edilmemiş kayıtlar arasında" geçerli kısmi bir
  // UNIQUE INDEX konur. Yeni kurulan bir veritabanında bu dal hiç çalışmaz
  // (sütun seviyesinde UNIQUE hiç yoktur — bkz. yukarıdaki CREATE TABLE).
  const tableDef = instance
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'submissions'")
    .get() as { sql: string } | undefined;
  if (tableDef && /barcode\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(tableDef.sql)) {
    instance.exec(`
      CREATE TABLE submissions_migrated (
        id TEXT PRIMARY KEY,
        barcode TEXT NOT NULL,
        volunteer_code TEXT NOT NULL,
        market_chain TEXT NOT NULL,
        market_chain_other TEXT,
        city TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_slots TEXT NOT NULL,
        received_slots TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        client_created_at TEXT NOT NULL,
        abandoned_at TEXT
      );
      INSERT INTO submissions_migrated
        (id, barcode, volunteer_code, market_chain, market_chain_other, city, category,
         status, requested_slots, received_slots, created_at, client_created_at, abandoned_at)
        SELECT id, barcode, volunteer_code, market_chain, market_chain_other, city, category,
               status, requested_slots, received_slots, created_at, client_created_at, NULL
        FROM submissions;
      DROP TABLE submissions;
      ALTER TABLE submissions_migrated RENAME TO submissions;
      CREATE INDEX IF NOT EXISTS idx_submissions_volunteer ON submissions(volunteer_code);
      CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
    `);
  }

  instance.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_barcode_active ON submissions(barcode) WHERE abandoned_at IS NULL',
  );

  db = instance;
}

/** Yalnız testler için — modülü kapatıp verilen yoldan (genelde :memory:) yeniden başlatır. */
export function __resetIntakeDbForTesting(path: string): void {
  if (db) {
    db.close();
    db = null;
  }
  initIntakeDb(path);
}

function requireDb(): DatabaseSync {
  if (!db) throw new Error('Intake DB henüz başlatılmadı (initIntakeDb çağrılmalı).');
  return db;
}

/** index.ts, initIntakeDb() başarısız olduğunda intake router'ını 503 saplamasıyla değiştirmek için kullanır. */
export function isIntakeDbReady(): boolean {
  return db !== null;
}

/** Barkod UNIQUE ihlalinde DuplicateBarcodeError fırlatır — çağıran taraf bunu "zaten toplandı" yanıtına çevirir. */
export function createSubmission(input: CreateSubmissionInput): IntakeSubmissionRow {
  const database = requireDb();
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  try {
    database
      .prepare(
        `INSERT INTO submissions
           (id, barcode, volunteer_code, market_chain, market_chain_other, city, category, status, requested_slots, received_slots, created_at, client_created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
      )
      .run(
        id,
        input.barcode,
        input.volunteerCode,
        input.marketChain,
        input.marketChainOther ?? null,
        input.city,
        input.category,
        input.status,
        JSON.stringify(input.requestedSlots),
        createdAt,
        input.clientCreatedAt,
      );
  } catch (err) {
    if ((err as Error).message.includes('UNIQUE constraint failed')) {
      throw new DuplicateBarcodeError(input.barcode);
    }
    throw err;
  }

  return findSubmissionByBarcode(input.barcode)!;
}

/** Yalnız AKTİF (terk edilmemiş) kaydı bulur — barkodun şu an kilitli olup olmadığı sorusunun cevabı budur. */
export function findSubmissionByBarcode(barcode: string): IntakeSubmissionRow | null {
  const row = requireDb().prepare('SELECT * FROM submissions WHERE barcode = ? AND abandoned_at IS NULL').get(barcode);
  return row ? rowToSubmission(row as Record<string, unknown>) : null;
}

export function getSubmissionById(id: string): IntakeSubmissionRow | null {
  const row = requireDb().prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  return row ? rowToSubmission(row as Record<string, unknown>) : null;
}

/**
 * Yarım kalan bir kaydı "terk edilmiş" işaretler — SATIR SİLİNMEZ, zaten
 * yüklenmiş fotoğraflar diskte kalır (bkz. görev onayı, madde 4b). Bu,
 * barkodun aynı anda yalnızca bir aktif kayıt tarafından kilitlenmesini
 * sağlayan kısmi UNIQUE INDEX'i (idx_submissions_barcode_active) serbest
 * bırakır — çağıran taraf (lookup.ts) ardından aynı barkod için yeni bir
 * kayıt oluşturabilir.
 */
export function abandonSubmission(id: string): void {
  requireDb().prepare('UPDATE submissions SET abandoned_at = ? WHERE id = ?').run(new Date().toISOString(), id);
}

/** Aynı slot iki kez işaretlenirse idempotent kalır (listeye tekrar eklenmez). */
export function markSlotReceived(id: string, slot: string): IntakeSubmissionRow | null {
  const database = requireDb();
  const existing = getSubmissionById(id);
  if (!existing) return null;

  if (!existing.receivedSlots.includes(slot)) {
    const receivedSlots = [...existing.receivedSlots, slot];
    database.prepare('UPDATE submissions SET received_slots = ? WHERE id = ?').run(JSON.stringify(receivedSlots), id);
  }

  return getSubmissionById(id);
}

/**
 * requestedSlots'un bir kısmı hâlâ receivedSlots'ta yoksa "bekleyen" sayılır.
 * Terk edilmiş kayıtlar HARİÇ — bunlar aynı barkod için açılan yeni bir kayıt
 * tarafından zaten devralınmıştır, tekrar "bekleyen" olarak görünmemeli
 * (bkz. görev onayı, madde 4b). Yine de silinmezler; /admin/recent ve CSV
 * dışa aktarımda görünür kalırlar.
 */
export function getPendingSubmissions(): IntakeSubmissionRow[] {
  const rows = requireDb().prepare('SELECT * FROM submissions WHERE abandoned_at IS NULL ORDER BY created_at DESC').all();
  return (rows as Record<string, unknown>[])
    .map(rowToSubmission)
    .filter((submission) => submission.requestedSlots.some((slot) => !submission.receivedSlots.includes(slot)));
}

export function getVolunteerProgress(volunteerCode: string): { today: number; total: number } {
  const database = requireDb();
  const total = (
    database.prepare('SELECT COUNT(*) as c FROM submissions WHERE volunteer_code = ?').get(volunteerCode) as {
      c: number;
    }
  ).c;
  const today = (
    database
      .prepare('SELECT COUNT(*) as c FROM submissions WHERE volunteer_code = ? AND created_at >= ?')
      .get(volunteerCode, todayStartIso()) as { c: number }
  ).c;

  return { today, total };
}

/** Tüm gönüllülerin toplamı — progress ekranındaki "toplam: N" için (bkz. gönüllü akışı madde 7). */
export function getTotalSubmissionCount(): number {
  return (requireDb().prepare('SELECT COUNT(*) as c FROM submissions').get() as { c: number }).c;
}

function countGroupedBy(column: 'volunteer_code' | 'city' | 'market_chain'): AdminCountRow[] {
  const rows = requireDb()
    .prepare(`SELECT ${column} as key, COUNT(*) as count FROM submissions GROUP BY ${column} ORDER BY count DESC`)
    .all() as { key: string; count: number }[];
  return rows.map((row) => ({ key: row.key, count: row.count }));
}

function sevenDaysAgoIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString();
}

/**
 * Her kategori için toplam kayıt + son 7 gündeki kayıt + eksik-slotlu
 * ("kalan") kayıt sayısı. Sayısal bir hedef/kota TANIMLANMAZ (bkz.
 * yönetici paneli onayı) — bunun yerine son 7 günde EN AZ ilerleyen
 * kategori üstte görünsün diye recent7d artan sırada sıralanır; toplamı
 * sıfır (hiç toplanmamış) kategoriler bu sırada zaten en üstte kalır.
 * INTAKE_CATEGORIES'teki TÜM kategoriler listelenir — hiç kaydı olmayan
 * bir kategori de (total=0) görünür olmalı, "durmuş" olduğu en net onda
 * anlaşılır. pending AYRI bir sütundur, sıralama ölçütü DEĞİLDİR.
 */
export function getCategoryBreakdown(): CategoryBreakdownRow[] {
  const rows = requireDb()
    .prepare('SELECT category, requested_slots, received_slots, created_at FROM submissions')
    .all() as {
    category: string;
    requested_slots: string;
    received_slots: string;
    created_at: string;
  }[];

  const sevenDaysAgo = sevenDaysAgoIso();
  const byCategory = new Map<string, CategoryBreakdownRow>(
    INTAKE_CATEGORIES.map((option) => [option.key, { category: option.key, total: 0, recent7d: 0, pending: 0 }]),
  );

  for (const row of rows) {
    const entry = byCategory.get(row.category) ?? { category: row.category, total: 0, recent7d: 0, pending: 0 };
    entry.total += 1;
    if (row.created_at >= sevenDaysAgo) entry.recent7d += 1;

    const requestedSlots = JSON.parse(row.requested_slots) as string[];
    const receivedSlots = JSON.parse(row.received_slots) as string[];
    if (requestedSlots.some((slot) => !receivedSlots.includes(slot))) entry.pending += 1;

    byCategory.set(row.category, entry);
  }

  return [...byCategory.values()].sort(
    (a, b) => a.recent7d - b.recent7d || a.total - b.total || a.category.localeCompare(b.category, 'tr-TR'),
  );
}

/** Gönüllü başına toplam/bugün/son kayıt zamanı — yönetici panelindeki gönüllü tablosu için. */
export function getVolunteerBreakdown(): VolunteerBreakdownRow[] {
  const rows = requireDb()
    .prepare(
      `SELECT volunteer_code as code, COUNT(*) as total,
              SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as today,
              MAX(created_at) as lastSubmissionAt
       FROM submissions GROUP BY volunteer_code ORDER BY lastSubmissionAt DESC`,
    )
    .all(todayStartIso()) as { code: string; total: number; today: number; lastSubmissionAt: string | null }[];

  return rows.map((row) => ({
    code: row.code,
    total: row.total,
    today: row.today,
    lastSubmissionAt: row.lastSubmissionAt,
  }));
}

/** Son N kayıt (en yeniden en eskiye) — yönetici panelindeki "son kayıtlar" listesi için. */
export function getRecentSubmissions(limit: number): IntakeSubmissionRow[] {
  const rows = requireDb().prepare('SELECT * FROM submissions ORDER BY created_at DESC LIMIT ?').all(limit);
  return (rows as Record<string, unknown>[]).map(rowToSubmission);
}

/** market_chain='yerel' kayıtlarında yazılan serbest ad başına sayım — panelde "yerel" tek satıra sıkışmasın diye. */
export function getLocalMarketBreakdown(): AdminCountRow[] {
  const rows = requireDb()
    .prepare(
      `SELECT market_chain_other as key, COUNT(*) as count FROM submissions
       WHERE market_chain = ? AND market_chain_other IS NOT NULL
       GROUP BY market_chain_other ORDER BY count DESC`,
    )
    .all(LOCAL_MARKET_CHAIN_KEY) as { key: string; count: number }[];
  return rows.map((row) => ({ key: row.key, count: row.count }));
}

export function getAdminStats(): AdminStats {
  const database = requireDb();
  const totalSubmissions = (database.prepare('SELECT COUNT(*) as c FROM submissions').get() as { c: number }).c;
  const todaySubmissions = (
    database.prepare('SELECT COUNT(*) as c FROM submissions WHERE created_at >= ?').get(todayStartIso()) as {
      c: number;
    }
  ).c;

  const dailyTrend: { date: string; count: number }[] = [];
  for (let daysAgo = 13; daysAgo >= 0; daysAgo -= 1) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - daysAgo);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = (
      database
        .prepare('SELECT COUNT(*) as c FROM submissions WHERE created_at >= ? AND created_at < ?')
        .get(dayStart.toISOString(), dayEnd.toISOString()) as { c: number }
    ).c;

    dailyTrend.push({ date: dayStart.toISOString().slice(0, 10), count });
  }

  return {
    totalSubmissions,
    todaySubmissions,
    byVolunteer: countGroupedBy('volunteer_code'),
    volunteerBreakdown: getVolunteerBreakdown(),
    byCity: countGroupedBy('city'),
    byMarketChain: countGroupedBy('market_chain'),
    categoryBreakdown: getCategoryBreakdown(),
    localMarketBreakdown: getLocalMarketBreakdown(),
    dailyTrend,
  };
}

export function getAllSubmissionsForExport(): IntakeSubmissionRow[] {
  const rows = requireDb().prepare('SELECT * FROM submissions ORDER BY created_at ASC').all();
  return (rows as Record<string, unknown>[]).map(rowToSubmission);
}
