/**
 * RafSkoru — Aramada markalı ürün toggle regresyon testi (device test 30 Eylül, D-toggle)
 * src/state/cartToggleBrandedProduct.smoke.ts
 *
 * Cihaz raporu: "Aramada + ile eklenen ürünün ✓ düğmesine tekrar dokunmak
 * ürünü sepetten çıkarmıyor". Kod incelemesi commit 6a20b62'nin bu akışı
 * markalı (`type: 'product'`) ve grup (`type: 'product_group'`) ürünleri
 * AYNI yoldan (suggestionToCartInput + getCartItemKey) işlediğini gösterdi,
 * ama bu round-trip için otomatik test yoktu. Bu test search.tsx'teki
 * handleToggleCart/isAdded mantığını birebir taklit eder.
 */
import assert from 'node:assert/strict';

import {
  __resetCartForTesting,
  __setCartStorageAdapterForTesting,
  addToCart,
  getCartItemKey,
  getCartSnapshot,
  removeFromCart,
  suggestionToCartInput,
} from './cartStore';
import type { ProductGroupSearchSuggestion, ProductSearchSuggestion } from '../api/productSuggestionClient';

function isAdded(key: string): boolean {
  return getCartSnapshot().some((item) => item.key === key);
}

async function toggle(key: string, cartInput: Parameters<typeof addToCart>[0]): Promise<boolean> {
  return isAdded(key) ? removeFromCart(key) : addToCart(cartInput);
}

async function main(): Promise<void> {
  __setCartStorageAdapterForTesting({
    getItem: async () => null,
    setItem: async () => {},
  });

  // Modül yüklenirken tetiklenen gerçek `hydrate()` (bkz. cartStore.ts:94),
  // plain Node/tsx altında gerçek AsyncStorage bulunmadığından asenkron
  // olarak reddedilir ve `items = []` atar. Bu test dosyasındaki İLK
  // addToCart çağrısı bu bekleyen reddin henüz çözülmediği bir ana denk
  // gelirse sonucu sessizce sıfırlayabilir (yalnız bu Node test ortamına
  // özgü bir yarış — RN cihazında hydrate() kullanıcı etkileşiminden çok
  // önce, uygulama açılışında tamamlanır). Asıl test mantığını bu yarıştan
  // ayırmak için önce yerleşmesini bekliyoruz.
  await new Promise((r) => setTimeout(r, 50));

  // ── Markalı ürün: ekle → ✓'ye tekrar dokun → çıkmalı ─────────────────────
  {
    __resetCartForTesting([]);
    const brandedSuggestion: ProductSearchSuggestion = {
      type: 'product',
      productId: '8691004000029',
      productGroupKey: 'milk',
      label: '%3.1 Yağlı Süt',
      brand: 'Dost',
      packageSize: { amount: 1000, unit: 'ml' },
      source: 'product_index',
    };
    const cartInput = suggestionToCartInput(brandedSuggestion);
    const key = getCartItemKey(cartInput);

    assert.equal(isAdded(key), false, 'başlangıçta sepette olmamalı');

    const addOk = await toggle(key, cartInput);
    assert.equal(addOk, true, 'markalı ürün eklenebilmeli');
    assert.equal(isAdded(key), true, 'ekledikten sonra ✓ görünmeli');

    const removeOk = await toggle(key, cartInput);
    assert.equal(removeOk, true, 'ikinci dokunuş kaldırabilmeli');
    assert.equal(isAdded(key), false, '✓ tekrar dokununca ürün sepetten çıkmalı');
  }

  // ── Grup ürünü: aynı akış (regresyona karşı kontrol) ─────────────────────
  {
    __resetCartForTesting([]);
    const groupSuggestion: ProductGroupSearchSuggestion = {
      type: 'product_group',
      productGroupKey: 'rice',
      label: 'Pirinç',
      coverage: 'covered',
      source: 'product_group_registry',
    };
    const cartInput = suggestionToCartInput(groupSuggestion);
    const key = getCartItemKey(cartInput);

    await toggle(key, cartInput);
    assert.equal(isAdded(key), true, 'grup ürünü eklenmeli');

    await toggle(key, cartInput);
    assert.equal(isAdded(key), false, 'grup ürünü ✓ tekrar dokununca çıkmalı');
  }

  console.log('CART_TOGGLE_BRANDED_PRODUCT_SMOKE_OK');
}

void main();
