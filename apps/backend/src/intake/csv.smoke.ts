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

// ── Formül enjeksiyonu: =,+,-,@ ile başlayan alanlar kaçırılır (bkz. görev
// onayı, madde 4d) — tek tırnak eklenir, Excel/Sheets'te METİN olarak kalır.
{
  const csv = buildCsv(
    ['market_chain_other'],
    [['=HYPERLINK("http://evil.example")'], ['+1+1'], ['-1-1'], ['@SUM(A1:A9)'], ['Normal Market Adı']],
  );
  assert.equal(
    csv,
    'market_chain_other\r\n' +
      `"'=HYPERLINK(""http://evil.example"")"\r\n` +
      "'+1+1\r\n" +
      "'-1-1\r\n" +
      "'@SUM(A1:A9)\r\n" +
      'Normal Market Adı\r\n',
  );
}

// ── Formül önekiyle BAŞLAYIP virgül de içeren bir alan hem kaçırılır hem
// tırnaklanır (iki koruma birbirini bozmamalı) ───────────────────────────
{
  const csv = buildCsv(['name'], [['=cmd, çalıştır']]);
  assert.equal(csv, 'name\r\n"\'=cmd, çalıştır"\r\n');
}

console.log('INTAKE_CSV_SMOKE_OK');
