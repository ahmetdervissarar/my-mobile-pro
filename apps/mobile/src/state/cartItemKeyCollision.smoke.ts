/**
 * RafSkoru — barkodsuz ürün anahtar çakışması düzeltmesi (P1-6, feat/v2-catalog)
 * src/state/cartItemKeyCollision.smoke.ts
 *
 * Fotoğraf/isim aramasından gelen barkodsuz ürünler `type: 'product'` ile
 * ama `productId: undefined` olarak sepete eklenebilir (bkz.
 * product-result.tsx'in cartInput'u: `productId: displayBarcode ||
 * normalizedInput.barcode`, ikisi de yoksa undefined). Düzeltmeden önce
 * getCartItemKey her ikisi için de `product:undefined` döndürürdü — iki
 * FARKLI barkodsuz ürün sepette AYNI satıra düşer, biri eklenince diğeri de
 * "sepette" görünürdü.
 */
import assert from 'node:assert/strict';

import { getCartItemKey } from './cartStore';

const productA = {
  type: 'product' as const,
  productId: undefined,
  productGroupKey: 'unclassified',
  label: 'Fotoğraftan Ürün A',
};

const productB = {
  type: 'product' as const,
  productId: undefined,
  productGroupKey: 'unclassified',
  label: 'Fotoğraftan Ürün B',
};

const productWithBarcode = {
  type: 'product' as const,
  productId: '8691004000029',
  productGroupKey: 'unclassified',
  label: 'Barkodlu Ürün',
};

const keyA = getCartItemKey(productA);
const keyB = getCartItemKey(productB);
const keyBarcoded = getCartItemKey(productWithBarcode);

assert.notEqual(keyA, keyB, 'iki farklı barkodsuz ürün aynı sepet anahtarına düşmemeli');
assert.equal(keyA, getCartItemKey(productA), 'aynı barkodsuz ürün için anahtar tutarlı olmalı');
assert.notEqual(keyA, keyBarcoded, 'barkodsuz ürün anahtarı barkodlu bir ürünle çakışmamalı');
assert.equal(keyBarcoded, 'product:8691004000029', 'barkodlu ürün için mevcut anahtar biçimi korunmalı');
assert.ok(!keyA.includes('undefined'), 'barkodsuz ürün anahtarı "undefined" metnini içermemeli');

console.log('CART_ITEM_KEY_COLLISION_SMOKE_OK');
