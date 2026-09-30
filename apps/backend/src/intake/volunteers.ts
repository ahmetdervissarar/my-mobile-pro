/**
 * RafSkoru — Intake gönüllü anahtar deposu
 * apps/backend/src/intake/volunteers.ts
 *
 * Kod+anahtar çiftleri ORTAK bir anahtar DEĞİL, gönüllü başınadır (bkz.
 * görev onayı, madde 3) — tek bir kişinin erişimi, kod çalıştırmadan,
 * yalnızca listeden satırını silerek kapatılabilir.
 *
 * Kaynak (öncelik sırasıyla):
 *   1. INTAKE_VOLUNTEERS_JSON ortam değişkeni (satır içi JSON — konteyner
 *      dağıtımları için).
 *   2. apps/backend/data/intake/volunteers.json dosyası (repoya girmez,
 *      bkz. .gitignore). Format: {"MRS-01": "anahtar1", "MRS-02": "anahtar2"}.
 * Her istekte (mtime kontrolüyle ucuzlatılmış) yeniden okunur — bir satırı
 * silip kaydetmek, süreci yeniden başlatmadan erişimi hemen kapatır.
 *
 * Anahtarlar HİÇBİR ZAMAN loglanmaz (bkz. görev onayı, madde 3) — bu dosya
 * ve auth.ts, doğrulama başarısız olsa bile yalnızca kodu/yol bilgisini
 * loglar, asla denenen anahtarı.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';

let cachedPath: string | null = null;
let cachedMtimeMs = 0;
let cachedVolunteers: Record<string, string> = {};
let warnedEmpty = false;

function loadFromEnv(): Record<string, string> | null {
  const raw = process.env.INTAKE_VOLUNTEERS_JSON?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    console.warn('[intake] INTAKE_VOLUNTEERS_JSON geçerli bir { kod: anahtar } nesnesi değil; yok sayılıyor.');
  } catch {
    console.warn('[intake] INTAKE_VOLUNTEERS_JSON çözümlenemedi (geçersiz JSON); yok sayılıyor.');
  }
  return null;
}

function loadFromFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  const stat = statSync(path);
  if (path === cachedPath && stat.mtimeMs === cachedMtimeMs) {
    return cachedVolunteers;
  }

  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    const volunteers =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};

    cachedPath = path;
    cachedMtimeMs = stat.mtimeMs;
    cachedVolunteers = volunteers;
    return volunteers;
  } catch (err) {
    console.warn(`[intake] volunteers.json okunamadı/çözümlenemedi: ${(err as Error).message}`);
    return {};
  }
}

/** volunteers.json'un beklenen yolu — index.ts açılışta ve auth.ts her istekte bunu kullanır. */
export function getVolunteersFilePath(dataDir: string): string {
  return `${dataDir}/volunteers.json`;
}

export function loadVolunteers(volunteersFilePath: string): Record<string, string> {
  const fromEnv = loadFromEnv();
  const volunteers = fromEnv ?? loadFromFile(volunteersFilePath);

  if (Object.keys(volunteers).length === 0 && !warnedEmpty) {
    warnedEmpty = true;
    console.warn(
      '[intake] Hiç gönüllü kod/anahtar çifti tanımlı değil — INTAKE_VOLUNTEERS_JSON veya ' +
        `${volunteersFilePath} ayarlanana kadar hiçbir gönüllü giriş yapamaz.`,
    );
  }

  return volunteers;
}

export function verifyVolunteer(volunteersFilePath: string, code: string, key: string): boolean {
  if (!code || !key) return false;
  const volunteers = loadVolunteers(volunteersFilePath);
  return volunteers[code] === key;
}

/** Yalnız testler için — mtime önbelleğini sıfırlar. */
export function __resetVolunteersCacheForTesting(): void {
  cachedPath = null;
  cachedMtimeMs = 0;
  cachedVolunteers = {};
  warnedEmpty = false;
}
