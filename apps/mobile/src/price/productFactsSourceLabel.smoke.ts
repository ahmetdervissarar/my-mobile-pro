/**
 * RafSkoru — Kaynak adı sözleşmesi (ADR-009 §4)
 * src/price/productFactsSourceLabel.smoke.ts
 *
 * Korunan kurallar:
 *   - her kaynağın kendine ait, birbirinden farklı bir adı vardır
 *   - doğrulanmamış etiket kaydı asla "onaylı" ya da OFF adıyla görünmez
 *   - tanınmayan değer bilinen bir kaynağın adını almaz
 */
import assert from 'node:assert/strict';

import {
  getProductFactsSourceLabel,
  getProductFactsSourceText,
  UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL,
} from './productFactsSourceLabel';
import type { ProductFactsSource } from './types';

const ALL_SOURCES: ProductFactsSource[] = ['off', 'rafskoru_verified', 'label_unverified', 'beta_inference'];

const labels = ALL_SOURCES.map((source) => getProductFactsSourceLabel(source));

assert.equal(new Set(labels).size, ALL_SOURCES.length, 'her kaynağın adı farklı olmalı');
assert.ok(!labels.includes(UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL), 'bilinen kaynak "belirtilmemiş" görünmemeli');

assert.equal(getProductFactsSourceLabel('off'), 'Open Food Facts (ODbL)', 'OFF atfı (ODbL) korunmalı');
assert.equal(getProductFactsSourceLabel('beta_inference'), 'Beta çıkarım');

const unverified = getProductFactsSourceLabel('label_unverified');
assert.ok(unverified.includes('doğrulanmadı'), 'doğrulanmamış kayıt bunu açıkça söylemeli');
assert.ok(!unverified.includes('onaylı'), 'doğrulanmamış kayıt "onaylı" görünmemeli');
assert.ok(!unverified.includes('Open Food Facts'), 'doğrulanmamış kayıt OFF adıyla görünmemeli');

const verified = getProductFactsSourceLabel('rafskoru_verified');
assert.ok(verified.includes('insan onaylı'));
assert.ok(!verified.includes('Beta'), 'onaylı kayıt "Beta çıkarım" görünmemeli');

// Olumlu güvenlik iddiası yok (değişmez P5).
for (const label of [...labels, UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL]) {
  for (const banned of ['güvenli', 'garanti', 'içermez', 'otorite']) {
    assert.ok(!label.toLocaleLowerCase('tr-TR').includes(banned), `"${label}" içinde yasaklı ifade: ${banned}`);
  }
}

// Tanınmayan / eksik değer hiçbir bilinen kaynağın adını almaz.
for (const unknown of ['manufacturer', 'toString', '', null, undefined]) {
  assert.equal(getProductFactsSourceLabel(unknown), UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL);
}

// ── Karışık kaynak (İş 1.3b): farklı kaynaktan gelen her alan anılır ─────
assert.equal(getProductFactsSourceText({ dataSource: 'off' }), 'Open Food Facts (ODbL)');
assert.equal(getProductFactsSourceText({ dataSource: 'off', fieldSources: {} }), 'Open Food Facts (ODbL)');
assert.equal(
  getProductFactsSourceText({ dataSource: 'rafskoru_verified' }),
  'RafSkoru etiket kaydı (insan onaylı)',
);

const verifiedAt = { source: 'rafskoru_verified' as const, observedAt: '2026-11-10T09:30:00.000Z' };

assert.equal(
  getProductFactsSourceText({ dataSource: 'off', fieldSources: { ingredientsText: verifiedAt } }),
  'Open Food Facts (ODbL) · içindekiler: RafSkoru etiket kaydı (insan onaylı)',
);
assert.equal(
  getProductFactsSourceText({
    dataSource: 'off',
    // Nesne anahtar sırası bilerek ters: çıktı sırası buna bağlı olmamalı.
    fieldSources: { nutriScoreGrade: verifiedAt, ingredientsText: verifiedAt, productName: verifiedAt },
  }),
  'Open Food Facts (ODbL) · ürün adı: RafSkoru etiket kaydı (insan onaylı) · ' +
    'içindekiler: RafSkoru etiket kaydı (insan onaylı) · Nutri-Score: onaylı etiket değerlerinden hesaplandı',
  'etiketten hesaplanan not "hesaplandı" diye anılmalı; etikette yazıyormuş gibi görünmemeli',
);
assert.equal(
  getProductFactsSourceText({ dataSource: 'off', fieldSources: { ingredientsText: { source: 'off', observedAt: null } } }),
  'Open Food Facts (ODbL)',
  'ana kaynakla aynı kaynaktan gelen alan ayrıca anılmamalı',
);
assert.equal(
  getProductFactsSourceText({
    dataSource: 'off',
    fieldSources: { ingredientsText: { source: 'label_unverified', observedAt: null } },
  }),
  'Open Food Facts (ODbL) · içindekiler: Etiketten okundu, doğrulanmadı',
  'doğrulanmamış alan onaylı gibi görünmemeli',
);

console.log('PRODUCT_FACTS_SOURCE_LABEL_SMOKE_OK');
