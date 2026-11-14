/**
 * RafSkoru — Intake sabit liste doğrulama sözleşmesi
 * apps/backend/src/intake/constants.smoke.ts
 */
import assert from 'node:assert/strict';

import {
  isKnownCategory,
  isKnownMarketChain,
  isValidLocalMarketName,
  LOCAL_MARKET_CHAIN_KEY,
  LOCAL_MARKET_NAME_MAX_LENGTH,
} from './constants.js';

// ── Market zinciri ────────────────────────────────────────────────────────
assert.equal(isKnownMarketChain('a101'), true);
assert.equal(isKnownMarketChain('bim'), true);
assert.equal(isKnownMarketChain('sok'), true);
assert.equal(isKnownMarketChain('migros'), true);
assert.equal(isKnownMarketChain('carrefoursa'), true);
assert.equal(isKnownMarketChain('tarim_kredi'), true);
assert.equal(isKnownMarketChain('hakmar'), true);
assert.equal(isKnownMarketChain('onur'), true);
assert.equal(isKnownMarketChain('ozhan'), true);
assert.equal(isKnownMarketChain('groseri'), true);
assert.equal(isKnownMarketChain('sec'), true);
assert.equal(isKnownMarketChain(LOCAL_MARKET_CHAIN_KEY), true);
assert.equal(LOCAL_MARKET_CHAIN_KEY, 'yerel');
assert.equal(isKnownMarketChain('olmayan-zincir'), false, 'listede olmayan kod reddedilmeli');
assert.equal(isKnownMarketChain(''), false, 'boş değer reddedilmeli');

// ── Kategori ─────────────────────────────────────────────────────────────
for (const key of [
  'sut_urunleri', 'kahvaltilik', 'atistirmalik', 'icecek', 'sicak_icecek',
  'bakliyat_tahil', 'makarna_eriste', 'unlu_mamul', 'konserve_hazir', 'yag_sos',
  'sekerli', 'dondurulmus', 'bebek', 'et_sarkuteri', 'diger',
]) {
  assert.equal(isKnownCategory(key), true, `${key} listede olmalı`);
}
assert.equal(isKnownCategory('olmayan-kategori'), false, 'listede olmayan kategori reddedilmeli');
assert.equal(isKnownCategory(''), false, 'boş kategori reddedilmeli');

// ── Yerel market serbest adı ─────────────────────────────────────────────
assert.equal(isValidLocalMarketName('Ayşe Manav'), true);
assert.equal(isValidLocalMarketName('Özhan Bakkal No.2'), true, 'nokta ve rakam kabul edilmeli');
assert.equal(isValidLocalMarketName('Köşe-Başı Market'), true, 'tire kabul edilmeli');
assert.equal(isValidLocalMarketName(''), false, 'boş ad reddedilmeli (zorunlu)');
assert.equal(isValidLocalMarketName('a'.repeat(LOCAL_MARKET_NAME_MAX_LENGTH)), true, 'tam sınırda kabul edilmeli');
assert.equal(isValidLocalMarketName('a'.repeat(LOCAL_MARKET_NAME_MAX_LENGTH + 1)), false, 'sınırı aşan reddedilmeli');
assert.equal(isValidLocalMarketName('Market <script>'), false, 'izin verilmeyen karakterler reddedilmeli');
assert.equal(isValidLocalMarketName('Market@ev'), false, '@ işareti reddedilmeli');

console.log('INTAKE_CONSTANTS_SMOKE_OK');
