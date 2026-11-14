/**
 * RafSkoru — Intake fotoğraf doğrulama sözleşmesi
 * apps/backend/src/intake/photoValidation.smoke.ts
 *
 * Kanıtlamak istediği: kabul kararı Content-Type başlığından DEĞİL,
 * dosyanın ilk baytlarından (magic bytes) verilir (bkz. görev onayı,
 * madde 2) — bu fonksiyon Content-Type parametresi bile almıyor.
 */
import assert from 'node:assert/strict';

import { MAX_PHOTO_BYTES, validatePhotoUpload } from './photoValidation.js';

const REAL_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const REAL_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const FAKE_IMAGE_TEXT_BODY = Buffer.from('bu aslinda bir jpeg degil, duz metin', 'utf8');

// ── Gerçek JPEG/PNG imzası → kabul ────────────────────────────────────────
{
  const jpeg = validatePhotoUpload(REAL_JPEG);
  assert.equal(jpeg.ok, true);
  assert.equal(jpeg.ok && jpeg.type, 'jpeg');

  const png = validatePhotoUpload(REAL_PNG);
  assert.equal(png.ok, true);
  assert.equal(png.ok && png.type, 'png');
}

// ── Yanlış başlıkla gönderilen dosya (imzası yok) REDDEDİLİR ─────────────
// (bkz. görev onayı, madde 2: "Content-Type başlığına güvenme; dosyanın
// ilk baytlarından gerçekten JPEG/PNG olduğunu doğrula" — bu fonksiyon
// hiç Content-Type almadığı için testte iddia edilen tip önemsizdir,
// yalnızca gerçek baytlar sayılır).
{
  const result = validatePhotoUpload(FAKE_IMAGE_TEXT_BODY);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, 'invalid_file_type');
}

// ── Boş dosya reddedilir ──────────────────────────────────────────────────
{
  const result = validatePhotoUpload(Buffer.alloc(0));
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, 'empty_file');
}

// ── Boyut sınırını aşan dosya reddedilir (gerçek JPEG imzasıyla bile) ────
{
  const oversized = Buffer.concat([REAL_JPEG, Buffer.alloc(MAX_PHOTO_BYTES)]);
  const result = validatePhotoUpload(oversized);
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.error, 'file_too_large');
}

// ── Sınırın tam altı kabul edilir ─────────────────────────────────────────
{
  const atLimit = Buffer.concat([REAL_JPEG, Buffer.alloc(MAX_PHOTO_BYTES - REAL_JPEG.length)]);
  const result = validatePhotoUpload(atLimit);
  assert.equal(result.ok, true);
}

console.log('INTAKE_PHOTO_VALIDATION_SMOKE_OK');
