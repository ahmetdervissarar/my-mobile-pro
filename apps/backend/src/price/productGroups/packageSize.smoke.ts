import assert from 'node:assert/strict';

import { arePackageSizesComparable, parsePackageSizeFromText } from './index.js';

assert.deepEqual(parsePackageSizeFromText('Süt 1 L'), {
  value: 1,
  unit: 'l',
  normalizedValue: 1000,
  normalizedUnit: 'ml',
  text: '1 l',
});

assert.deepEqual(parsePackageSizeFromText('Sütaş Laktozsuz Süt 1 LT'), {
  value: 1,
  unit: 'l',
  normalizedValue: 1000,
  normalizedUnit: 'ml',
  text: '1 lt',
});

assert.deepEqual(parsePackageSizeFromText('Maden suyu 200 ml'), {
  value: 200,
  unit: 'ml',
  normalizedValue: 200,
  normalizedUnit: 'ml',
  text: '200 ml',
});

assert.deepEqual(parsePackageSizeFromText('Cips 100 g'), {
  value: 100,
  unit: 'g',
  normalizedValue: 100,
  normalizedUnit: 'g',
  text: '100 g',
});

assert.deepEqual(parsePackageSizeFromText('Yoğurt 1 kg'), {
  value: 1,
  unit: 'kg',
  normalizedValue: 1000,
  normalizedUnit: 'g',
  text: '1 kg',
});

assert.equal(
  arePackageSizesComparable(
    parsePackageSizeFromText('Süt 1 L'),
    parsePackageSizeFromText('Laktozsuz Süt 1000 ml'),
  ),
  true,
);

assert.equal(
  arePackageSizesComparable(
    parsePackageSizeFromText('Süt 1 L'),
    parsePackageSizeFromText('Süt 200 ml'),
  ),
  false,
);

assert.equal(parsePackageSizeFromText('Bilinmeyen ürün'), null);

console.log('PRODUCT_GROUP_PACKAGE_SIZE_SMOKE_OK');
