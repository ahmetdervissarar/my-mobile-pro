// productGroupMap — görev: unclassified oranını düşürmek için eklenen 6
// yeni OFF eşlemesi (ayran/kefir/wafer/bulgur/tomato_paste/canned_tuna) +
// sıra önceliği (dar kapsamlı grup genel gruptan ÖNCE) + baby_* kasıtlı
// dışlama doğrulaması.
import assert from 'node:assert/strict';

import { mapOffCategoriesToProductGroupKey, UNCLASSIFIED_PRODUCT_GROUP_KEY } from './productGroupMap.js';

// 1) Yeni 6 grup — gerçek veride doğrulanmış etiketlerle eşleşir.
assert.equal(mapOffCategoriesToProductGroupKey(['en:ayran']), 'ayran');
assert.equal(mapOffCategoriesToProductGroupKey(['en:kefir']), 'kefir');
assert.equal(mapOffCategoriesToProductGroupKey(['en:wafers']), 'wafer');
assert.equal(mapOffCategoriesToProductGroupKey(['en:stuffed-wafers']), 'wafer');
assert.equal(mapOffCategoriesToProductGroupKey(['en:bulgur']), 'bulgur');
assert.equal(mapOffCategoriesToProductGroupKey(['en:tomato-pastes']), 'tomato_paste');
assert.equal(mapOffCategoriesToProductGroupKey(['en:canned-tunas']), 'canned_tuna');

// 2) Geniş en:tunas (konserve/taze karışık, doğrulanmamış) TEK BAŞINA
// canned_tuna'ya düşürmez — unclassified kalır (fail-closed, emin olunmayan
// etiket eklenmedi).
assert.equal(mapOffCategoriesToProductGroupKey(['en:tunas']), UNCLASSIFIED_PRODUCT_GROUP_KEY);

// 3) Sıra önceliği: gerçek veride wafer etiketli ürünlerin TAMAMI aynı
// zamanda en:biscuits taşıyor — wafer, biscuit'ten ÖNCE kontrol edilmeli.
assert.equal(mapOffCategoriesToProductGroupKey(['en:biscuits', 'en:wafers']), 'wafer');

// 4) kefir + en:milks birlikte görülen gerçek vakada kefir (daha özel)
// kazanır.
assert.equal(mapOffCategoriesToProductGroupKey(['en:milks', 'en:kefir']), 'kefir');

// 5) baby_formula/baby_cereal/baby_food KASITLI olarak eklenmedi (registry.ts
// riskLevel:'restricted') — bu etiketler hâlâ unclassified kalmalı.
assert.equal(mapOffCategoriesToProductGroupKey(['en:baby-formulas']), UNCLASSIFIED_PRODUCT_GROUP_KEY);
assert.equal(mapOffCategoriesToProductGroupKey(['en:baby-foods']), UNCLASSIFIED_PRODUCT_GROUP_KEY);

console.log('PRODUCT_GROUP_MAP_SMOKE_OK');
