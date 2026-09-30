/**
 * RafSkoru — Intake fotoğraf doğrulama
 * apps/backend/src/intake/photoValidation.ts
 *
 * Content-Type BAŞLIĞINA GÜVENİLMEZ (bkz. görev onayı, madde 2) — kabul
 * kararı tamamen dosyanın ilk baytlarından (magic bytes) verilir. Bir
 * istemci Content-Type'ı ne yazarsa yazsın, gerçek JPEG/PNG imzası
 * yoksa reddedilir; gerçek bir görsel, yanlış/hiç Content-Type ile
 * gelse bile kabul edilir (bkz. routes.ts: express.raw tip filtresi yok,
 * tüm gövdeler buraya iletilir).
 */

/** Tarayıcı zaten ~1600px uzun kenar / JPEG q≈0.8'e küçültüyor (bkz. gönüllü akışı madde 5) — bu üst sınır güvenlik payıdır. */
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

export type IntakeImageType = 'jpeg' | 'png';

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(buffer: Buffer, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, index) => buffer[index] === byte);
}

export function detectImageType(buffer: Buffer): IntakeImageType | null {
  if (startsWith(buffer, JPEG_MAGIC)) return 'jpeg';
  if (startsWith(buffer, PNG_MAGIC)) return 'png';
  return null;
}

export type PhotoValidationResult =
  | { ok: true; type: IntakeImageType }
  | { ok: false; error: 'empty_file' | 'file_too_large' | 'invalid_file_type' };

export function validatePhotoUpload(buffer: Buffer): PhotoValidationResult {
  if (buffer.length === 0) return { ok: false, error: 'empty_file' };
  if (buffer.length > MAX_PHOTO_BYTES) return { ok: false, error: 'file_too_large' };

  const type = detectImageType(buffer);
  if (!type) return { ok: false, error: 'invalid_file_type' };

  return { ok: true, type };
}
