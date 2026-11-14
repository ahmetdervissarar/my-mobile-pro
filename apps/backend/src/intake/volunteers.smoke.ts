/**
 * RafSkoru — Intake gönüllü anahtar deposu sözleşmesi
 * apps/backend/src/intake/volunteers.smoke.ts
 *
 * Kanıtlamak istediği: gönüllü başına anahtar (ortak anahtar DEĞİL),
 * dosyayı değiştirip yeniden başlatmadan tek kişinin erişiminin
 * kapatılabilmesi (önbellek bunu engellemiyor — dosya aynı anda art arda
 * değişse ve boyutu aynı kalsa bile), ve INTAKE_VOLUNTEERS_JSON
 * verildiğinde dosyanın yok sayılması.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { __resetVolunteersCacheForTesting, verifyVolunteer } from './volunteers.js';

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-intake-volunteers-'));
const volunteersPath = join(fixtureDir, 'volunteers.json');

function writeVolunteers(map: Record<string, string>): void {
  writeFileSync(volunteersPath, JSON.stringify(map));
}

// ── Doğru kod+anahtar → true; yanlış anahtar veya bilinmeyen kod → false ─
{
  __resetVolunteersCacheForTesting();
  writeVolunteers({ 'MRS-01': 'key-1', 'MRS-02': 'key-2' });

  assert.equal(verifyVolunteer(volunteersPath, 'MRS-01', 'key-1'), true);
  assert.equal(verifyVolunteer(volunteersPath, 'MRS-01', 'yanlis-anahtar'), false);
  assert.equal(verifyVolunteer(volunteersPath, 'MRS-99', 'key-1'), false, 'tanımsız kod reddedilmeli');
  assert.equal(verifyVolunteer(volunteersPath, '', ''), false, 'boş kod/anahtar reddedilmeli');
}

// ── Dosyadan bir satır silinince o kişi HEMEN kapanmalı ──────────────────
// (süreç yeniden başlatılmadan — bkz. görev onayı, madde 3 "tek kişinin
// erişimi kapatılabilsin"). Bu yazım bir öncekiyle aynı saat diliminde
// gerçekleşebilir (aynı mtime); karar dosyanın içeriğine göre verilmelidir.
{
  writeVolunteers({ 'MRS-01': 'key-1' }); // MRS-02 satırı silindi

  assert.equal(verifyVolunteer(volunteersPath, 'MRS-01', 'key-1'), true, 'kalan gönüllü çalışmaya devam etmeli');
  assert.equal(verifyVolunteer(volunteersPath, 'MRS-02', 'key-2'), false, 'silinen gönüllü hemen reddedilmeli');
}

// ── Anahtar aynı uzunlukta bir değerle değişince eski anahtar HEMEN kapanmalı
// (dosya boyutu ve büyük olasılıkla mtime aynı kalır — yalnız içerik farklıdır).
{
  writeVolunteers({ 'MRS-01': 'key-9' });

  assert.equal(verifyVolunteer(volunteersPath, 'MRS-01', 'key-1'), false, 'değiştirilen eski anahtar hemen reddedilmeli');
  assert.equal(verifyVolunteer(volunteersPath, 'MRS-01', 'key-9'), true, 'yeni anahtar hemen kabul edilmeli');

  // Sonraki blok dosyada MRS-01/key-1 bulunmasına dayanır; geri yazılır.
  writeVolunteers({ 'MRS-01': 'key-1' });
  assert.equal(verifyVolunteer(volunteersPath, 'MRS-01', 'key-1'), true, 'geri yazılan anahtar hemen kabul edilmeli');
}

// ── INTAKE_VOLUNTEERS_JSON ayarlıysa dosya tamamen yok sayılır ───────────
{
  __resetVolunteersCacheForTesting();
  process.env.INTAKE_VOLUNTEERS_JSON = JSON.stringify({ 'ENV-01': 'env-key' });

  assert.equal(verifyVolunteer(volunteersPath, 'ENV-01', 'env-key'), true, 'env değişkenindeki gönüllü kabul edilmeli');
  assert.equal(verifyVolunteer(volunteersPath, 'MRS-01', 'key-1'), false, 'env ayarlıyken dosyadaki gönüllü görülmemeli');

  delete process.env.INTAKE_VOLUNTEERS_JSON;
}

rmSync(fixtureDir, { recursive: true, force: true });
console.log('INTAKE_VOLUNTEERS_SMOKE_OK');
