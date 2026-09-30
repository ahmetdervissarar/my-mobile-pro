/**
 * RafSkoru — cartStore Sessiz Hata Yutma Düzeltmesi (P0-2, feat/v2-catalog)
 * src/state/cartStorePersistFailure.smoke.ts
 *
 * Gerçek AsyncStorage React Native çalışma zamanı gerektirdiğinden (plain
 * Node/tsx altında `window is not defined` ile patlar), bu test
 * __setCartStorageAdapterForTesting ile sahte, İSTENDİĞİNDE BAŞARISIZ OLAN
 * bir depo enjekte eder. Kanıtlamak istediği: kayıt başarısız olduğunda
 * addToCart/removeFromCart `false` döner VE bellekteki değişiklik geri
 * alınır — önceki davranış (persist().catch(() => {})) sessizce "başarılı"
 * görünümü veriyordu.
 */
import assert from 'node:assert/strict';

import {
  __resetCartForTesting,
  __setCartStorageAdapterForTesting,
  addToCart,
  getCartItemKey,
  getCartSnapshot,
  removeFromCart,
} from './cartStore';

const cartInput = {
  type: 'product' as const,
  productId: 'test-product-1',
  productGroupKey: 'unclassified',
  label: 'Test Ürünü',
};

async function main(): Promise<void> {
  // ── Kayıt başarısız → addToCart false döner, bellek değişmez ────────────
  {
    __resetCartForTesting([]);
    __setCartStorageAdapterForTesting({
      getItem: async () => null,
      setItem: async () => {
        throw new Error('disk full (simülasyon)');
      },
    });

    const ok = await addToCart(cartInput);

    assert.equal(ok, false, 'kayıt başarısızken addToCart true dönmemeli');
    assert.equal(getCartSnapshot().length, 0, 'kayıt başarısızsa bellek eski haline geri dönmeli');
  }

  // ── Kayıt başarılı → addToCart true döner, ürün sepette kalır ────────────
  {
    __resetCartForTesting([]);
    const savedPayloads: string[] = [];
    __setCartStorageAdapterForTesting({
      getItem: async () => null,
      setItem: async (_key, value) => {
        savedPayloads.push(value);
      },
    });

    const ok = await addToCart(cartInput);

    assert.equal(ok, true);
    assert.equal(getCartSnapshot().length, 1);
    assert.equal(savedPayloads.length, 1, 'başarılı yolda gerçekten depoya yazılmalı');
  }

  // ── removeFromCart: kayıt başarısız → false döner, ürün sepette KALIR ────
  {
    const key = getCartItemKey(cartInput);
    __resetCartForTesting([{ ...cartInput, key, quantity: { amount: 1, unit: 'piece' } }]);
    __setCartStorageAdapterForTesting({
      getItem: async () => null,
      setItem: async () => {
        throw new Error('ağ/disk hatası (simülasyon)');
      },
    });

    const ok = await removeFromCart(key);

    assert.equal(ok, false);
    assert.equal(getCartSnapshot().length, 1, 'çıkarma kaydı başarısızsa ürün sepette kalmalı (sessizce kaybolmamalı)');
  }

  console.log('CART_STORE_PERSIST_FAILURE_SMOKE_OK');
}

void main();
