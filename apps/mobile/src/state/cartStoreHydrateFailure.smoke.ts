/**
 * RafSkoru — cartStore hydrate() hata gösterimi (madde 7, chore/stabilization)
 * src/state/cartStoreHydrateFailure.smoke.ts
 *
 * hydrate() okuma/parse hatasında items=[] yapıyordu — kullanıcı bunu
 * "sepetim boş" olarak görüyordu, oysa veri OKUNAMADI. getCartHydrateError
 * bu iki durumu ayırt etmeli; retryCartHydration başarılı bir yeniden
 * denemede bayrağı temizlemeli.
 */
import assert from 'node:assert/strict';

import {
  __resetCartForTesting,
  __setCartStorageAdapterForTesting,
  getCartHydrateError,
  getCartSnapshot,
  retryCartHydration,
} from './cartStore';

async function main(): Promise<void> {
  // ── Okuma hatası (getItem reddedilir) → hydrateError true, items=[] ──────
  {
    __resetCartForTesting([{ key: 'stale', type: 'product', productGroupKey: 'milk', label: 'Eski', quantity: { amount: 1, unit: 'piece' } }]);
    __setCartStorageAdapterForTesting({
      getItem: async () => {
        throw new Error('disk okunamadı (simülasyon)');
      },
      setItem: async () => {},
    });

    await retryCartHydration();

    assert.equal(getCartHydrateError(), true, 'okuma hatasında hydrateError true olmalı');
    assert.equal(getCartSnapshot().length, 0, 'gösterilecek geçerli veri yok — items boşalır');
  }

  // ── Bozuk JSON (parse hatası) → aynı şekilde hydrateError true ──────────
  {
    __setCartStorageAdapterForTesting({
      getItem: async () => '{bozuk json',
      setItem: async () => {},
    });

    await retryCartHydration();

    assert.equal(getCartHydrateError(), true, 'JSON.parse hatasında da hydrateError true olmalı');
  }

  // ── Tekrar deneme başarılı → hydrateError temizlenir, veri geri gelir ───
  {
    __setCartStorageAdapterForTesting({
      getItem: async () =>
        JSON.stringify([{ key: 'ok', type: 'product', productGroupKey: 'milk', label: 'Süt', quantity: { amount: 1, unit: 'liter' } }]),
      setItem: async () => {},
    });

    await retryCartHydration();

    assert.equal(getCartHydrateError(), false, 'başarılı yeniden denemede hydrateError temizlenmeli');
    assert.equal(getCartSnapshot().length, 1, 'başarılı yeniden denemede gerçek veri yüklenmeli');
  }

  console.log('CART_STORE_HYDRATE_FAILURE_SMOKE_OK');
}

void main();
