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

import { getProductFactsSourceLabel, UNKNOWN_PRODUCT_FACTS_SOURCE_LABEL } from './productFactsSourceLabel';
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

console.log('PRODUCT_FACTS_SOURCE_LABEL_SMOKE_OK');
