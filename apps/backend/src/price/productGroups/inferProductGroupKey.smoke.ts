import assert from 'node:assert/strict';

import { inferProductGroupKey } from './index.js';

assert.equal(inferProductGroupKey('sut'), 'milk_1l');
assert.equal(inferProductGroupKey('Süt 1 L'), 'milk_1l');
assert.equal(inferProductGroupKey('Sütaş Laktozsuz Süt 1 LT'), 'milk_1l');
assert.equal(inferProductGroupKey('Bilinmeyen ürün', '8691004000050'), 'milk_1l');

assert.equal(inferProductGroupKey('cips'), 'chips_100g');
assert.equal(inferProductGroupKey('chips'), 'chips_100g');
assert.equal(inferProductGroupKey('Patates Cipsi 100 g'), 'chips_100g');

assert.equal(inferProductGroupKey('Kefir 1 L'), 'kefir_1l');
assert.notEqual(inferProductGroupKey('Kefir 1 L'), 'milk_1l');
assert.equal(inferProductGroupKey('Sütlü Kefir 1 L'), 'kefir_1l');
assert.equal(inferProductGroupKey('Yoğurt 1 kg'), undefined);
assert.equal(inferProductGroupKey('Bilinmeyen ürün'), undefined);

console.log('PRODUCT_GROUP_INFERENCE_SMOKE_OK');
