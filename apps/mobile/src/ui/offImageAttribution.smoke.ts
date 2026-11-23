// offImageAttribution — saf TS, react-native importu yok.
import assert from 'node:assert/strict';

import { offImageAttribution } from './offImageAttribution';

const off = offImageAttribution('https://images.openfoodfacts.org/images/products/869/050/400/0013/front_tr.12.400.jpg', '8690504000013');
assert.ok(off);
assert.equal(off.text, 'Görsel: Open Food Facts katkıcıları (CC BY-SA 3.0)');
assert.equal(off.url, 'https://world.openfoodfacts.org/product/8690504000013');

// Barkod geçersizse genel OFF adresi.
assert.equal(offImageAttribution('https://images.openfoodfacts.org/x.jpg', '')?.url, 'https://world.openfoodfacts.org');

// OFF dışı görsel veya görsel yoksa atıf uydurulmaz.
assert.equal(offImageAttribution('file:///kamera/foto.jpg', '8690504000013'), null);
assert.equal(offImageAttribution('https://example.com/images.openfoodfacts.org/x.jpg', '8690504000013'), null);
assert.equal(offImageAttribution(null, '8690504000013'), null);

console.log('OFF_IMAGE_ATTRIBUTION_SMOKE_OK');
