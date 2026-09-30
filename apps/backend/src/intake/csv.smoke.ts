/**
 * RafSkoru — Intake CSV oluşturma sözleşmesi
 * apps/backend/src/intake/csv.smoke.ts
 */
import assert from 'node:assert/strict';

import { buildCsv } from './csv.js';

// ── Temel satır/sütun biçimi, CRLF satır sonu ────────────────────────────
{
  const csv = buildCsv(['a', 'b'], [['1', '2']]);
  assert.equal(csv, 'a,b\r\n1,2\r\n');
}

// ── Virgül/tırnak/satır sonu içeren alanlar tırnaklanır ──────────────────
{
  const csv = buildCsv(['name'], [['Süt, 1 L'], ['"Özel" ürün'], ['satır\nsonu']]);
  assert.equal(csv, 'name\r\n"Süt, 1 L"\r\n"""Özel"" ürün"\r\n"satır\nsonu"\r\n');
}

// ── Düz alanlar tırnaklanmaz ───────────────────────────────────────────────
{
  const csv = buildCsv(['barcode'], [['8690504000013']]);
  assert.equal(csv, 'barcode\r\n8690504000013\r\n');
}

console.log('INTAKE_CSV_SMOKE_OK');
