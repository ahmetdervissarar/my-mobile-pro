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
  city: string;
  category: string;
  status: 'new' | 'missing_fields';
  requestedSlots: string[];
  receivedSlots: string[];
  createdAt: string;
  clientCreatedAt: string;
}

export interface CreateSubmissionInput {
  barcode: string;
  volunteerCode: string;
  marketChain: string;
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

export interface AdminStats {
  totalSubmissions: number;
  todaySubmissions: number;
  byVolunteer: AdminCountRow[];
  byCity: AdminCountRow[];
  byMarketChain: AdminCountRow[];
  byCategory: AdminCountRow[];
  /** Son 14 gün, en eskiden en yeniye. Kayıt olmayan günler 0 count ile dolu gelir. */
  dailyTrend: { date: string; count: number }[];
}

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
    city: row.city as string,
    category: row.category as string,
    status: row.status as IntakeSubmissionRow['status'],
    requestedSlots: JSON.parse(row.requested_slots as string) as string[],
    receivedSlots: JSON.parse(row.received_slots as string) as string[],
    createdAt: row.created_at as string,
    clientCreatedAt: row.client_created_at as string,
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
      barcode TEXT NOT NULL UNIQUE,
      volunteer_code TEXT NOT NULL,
      market_chain TEXT NOT NULL,
      city TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_slots TEXT NOT NULL,
      received_slots TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      client_created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_submissions_volunteer ON submissions(volunteer_code);
    CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at);
  `);

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
           (id, barcode, volunteer_code, market_chain, city, category, status, requested_slots, received_slots, created_at, client_created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
      )
      .run(
        id,
        input.barcode,
        input.volunteerCode,
        input.marketChain,
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

export function findSubmissionByBarcode(barcode: string): IntakeSubmissionRow | null {
  const row = requireDb().prepare('SELECT * FROM submissions WHERE barcode = ?').get(barcode);
  return row ? rowToSubmission(row as Record<string, unknown>) : null;
}

export function getSubmissionById(id: string): IntakeSubmissionRow | null {
  const row = requireDb().prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  return row ? rowToSubmission(row as Record<string, unknown>) : null;
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

/** requestedSlots'un bir kısmı hâlâ receivedSlots'ta yoksa "bekleyen" sayılır. */
export function getPendingSubmissions(): IntakeSubmissionRow[] {
  const rows = requireDb().prepare('SELECT * FROM submissions ORDER BY created_at DESC').all();
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

function countGroupedBy(column: 'volunteer_code' | 'city' | 'market_chain' | 'category'): AdminCountRow[] {
  const rows = requireDb()
    .prepare(`SELECT ${column} as key, COUNT(*) as count FROM submissions GROUP BY ${column} ORDER BY count DESC`)
    .all() as { key: string; count: number }[];
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
    byCity: countGroupedBy('city'),
    byMarketChain: countGroupedBy('market_chain'),
    byCategory: countGroupedBy('category'),
    dailyTrend,
  };
}

export function getAllSubmissionsForExport(): IntakeSubmissionRow[] {
  const rows = requireDb().prepare('SELECT * FROM submissions ORDER BY created_at ASC').all();
  return (rows as Record<string, unknown>[]).map(rowToSubmission);
}
