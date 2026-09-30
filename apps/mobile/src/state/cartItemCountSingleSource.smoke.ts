/**
 * RafSkoru — Sepet sayacı tek kaynak testi (device test 30 Eylül, D-count)
 * src/state/cartItemCountSingleSource.smoke.ts
 *
 * Cihaz raporu: "sepette 1 ürün, rozette 7". Kanıt: rozet/anasayfa
 * `useCartItemCount()`'tan (miktar TOPLAMI) okuyordu, sepet ekranındaki
 * "Ürün sayısı" backend'den `basketProfile.itemCount = items.length`
 * (satır sayısı) okuyordu — iki farklı kaynak. Düzeltme: `useCartItemCount()`
 * artık `cartItems.length` döndürüyor, üçü de aynı semantiği paylaşıyor.
 *
 * `useCartItemCount()` bir React hook'u (useSyncExternalStore) olduğundan
 * ve bu ortamda RN render zinciri yok, hook'un gövdesi `getCartSnapshot()`
 * üzerinden aynı `items` dizisini okur — bu test o alttaki kaynağı
 * (diğer sepet testleriyle aynı desende) doğrudan doğrular.
 */
import assert from 'node:assert/strict';

import {
  __resetCartForTesting,
  __setCartStorageAdapterForTesting,
  addToCart,
  clearCart,
  getCartItemKey,
  getCartSnapshot,
  removeFromCart,
  setCartItemQuantity,
} from './cartStore';

async function main(): Promise<void> {
  __setCartStorageAdapterForTesting({
    getItem: async () => null,
    setItem: async () => {},
  });
  await new Promise((r) => setTimeout(r, 50));

  const cartInput = {
    type: 'product' as const,
    productId: '8691004000029',
    productGroupKey: 'milk',
    label: '%3.1 Yağlı Süt',
    brand: 'Dost',
  };
  const key = getCartItemKey(cartInput);

  // ── Miktar 7'ye çıkarılsa bile sayaç ÜRÜN ADEDİNİ (1) vermeli ────────────
  __resetCartForTesting([]);
  await addToCart(cartInput);
  await setCartItemQuantity(key, 7);

  assert.equal(getCartSnapshot().length, 1, 'sepette tek satır olmalı');
  assert.equal(getCartSnapshot()[0].quantity.amount, 7, 'miktar 7 olmalı');
  assert.equal(
    getCartSnapshot().length,
    1,
    'sepette 1 ürün varken sayaç 7 değil 1 göstermeli (rozet/anasayfa/sepet ekranı aynı kaynağı paylaşmalı)',
  );

  // ── ekle → çıkar → temizle → sayaç 0 ─────────────────────────────────────
  __resetCartForTesting([]);
  assert.equal(getCartSnapshot().length, 0);

  await addToCart(cartInput);
  assert.equal(getCartSnapshot().length, 1, 'ekledikten sonra sayaç 1 olmalı');

  await removeFromCart(key);
  assert.equal(getCartSnapshot().length, 0, 'çıkardıktan sonra sayaç 0 olmalı');

  await addToCart(cartInput);
  await addToCart({ ...cartInput, productId: '8690504000068', label: 'Başka Ürün' });
  assert.equal(getCartSnapshot().length, 2, 'iki farklı ürün eklenince sayaç 2 olmalı');

  await clearCart();
  assert.equal(getCartSnapshot().length, 0, 'temizledikten sonra sayaç 0 olmalı');

  console.log('CART_ITEM_COUNT_SINGLE_SOURCE_SMOKE_OK');
}

void main();
