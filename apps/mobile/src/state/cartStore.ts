/**
 * RafSkoru — Sepet Deposu (cihaz içi)
 * src/state/cartStore.ts
 *
 * Sepet BasketItem şemasıyla uyumludur (src/api/basketClient.ts); backend
 * sepet değerlendirme sözleşmesi bu görevde değiştirilmez. Sepet içeriği
 * yalnızca AsyncStorage'da (cihazda) tutulur — backend'e, log'a veya
 * telemetriye gönderilmez.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { BasketItem, BasketItemQuantity } from '../api/basketClient';
import type { SearchSuggestion } from '../api/productSuggestionClient';

export interface CartItem {
  key: string;
  type: BasketItem['type'];
  productId?: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: { amount: number; unit: string };
  imageUrl?: string | null;
  quantity: BasketItemQuantity;
}

const STORAGE_KEY = 'rafskoru:cart';

let items: CartItem[] = [];
let isHydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

interface CartStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * Gerçek AsyncStorage native bir modüldür ve React Native çalışma zamanı
 * dışında (ör. `tsx` ile düz Node'da) çalışmaz — bu yüzden P0-2'nin "kayıt
 * başarısız olursa geri alınır" davranışı yalnızca bu değiştirilebilir
 * referans üzerinden test edilebilir (bkz. cartStorePersistFailure.smoke.ts).
 * Üretimde her zaman gerçek AsyncStorage kullanılır.
 */
let storageAdapter: CartStorageAdapter = AsyncStorage;

/** Yalnız testler için — üretim kodu bunu hiç çağırmaz. */
export function __setCartStorageAdapterForTesting(adapter: CartStorageAdapter): void {
  storageAdapter = adapter;
}

/** Yalnız testler için — modül durumunu (items, isHydrated) sıfırlar. */
export function __resetCartForTesting(initialItems: CartItem[] = []): void {
  items = initialItems;
  isHydrated = true;
}

/**
 * P0-2: kayıt başarısızsa artık SESSİZCE geçilmez — çağıran taraf `false`
 * dönüşünü görüp başarı mesajı göstermekten vazgeçebilir, kullanıcıya hata
 * gösterebilir. Bellekteki `items` bu fonksiyonun içinde geri alınmaz;
 * geri alma, mutasyonu yapan üst fonksiyonların sorumluluğundadır (böylece
 * her çağıran kendi "önceki durum" anlık görüntüsünü tutar).
 */
async function persist(): Promise<boolean> {
  try {
    await storageAdapter.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

async function hydrate(): Promise<void> {
  try {
    const raw = await storageAdapter.getItem(STORAGE_KEY);
    if (raw) {
      items = JSON.parse(raw) as CartItem[];
    }
  } catch {
    items = [];
  } finally {
    isHydrated = true;
    emit();
  }
}

void hydrate();

export function getCartSnapshot(): CartItem[] {
  return items;
}

export function isCartHydrated(): boolean {
  return isHydrated;
}

export function subscribeCart(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCartItemKey(
  item: Pick<CartItem, 'type' | 'productId' | 'productGroupKey'>,
): string {
  return item.type === 'product' ? `product:${item.productId}` : `product_group:${item.productGroupKey}`;
}

function getDefaultQuantity(productGroupKey: string): BasketItemQuantity {
  if (productGroupKey === 'milk' || productGroupKey === 'lactose_free_milk') {
    return { amount: 1, unit: 'liter' };
  }

  if (['rice', 'bulgur', 'pasta', 'flour', 'sugar'].includes(productGroupKey)) {
    return { amount: 1, unit: 'kilogram' };
  }

  return { amount: 1, unit: 'piece' };
}

/** Kayıt başarılıysa true, AsyncStorage'a yazılamadıysa false döner (bellekteki değişiklik geri alınır). */
export async function addToCart(input: {
  type: BasketItem['type'];
  productId?: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: { amount: number; unit: string };
  imageUrl?: string | null;
}): Promise<boolean> {
  const previousItems = items;
  const key = getCartItemKey(input);
  const existing = items.find((item) => item.key === key);

  if (existing) {
    items = items.map((item) =>
      item.key === key
        ? { ...item, quantity: { ...item.quantity, amount: item.quantity.amount + 1 } }
        : item,
    );
  } else {
    items = [
      ...items,
      {
        key,
        type: input.type,
        productId: input.productId,
        productGroupKey: input.productGroupKey,
        label: input.label,
        brand: input.brand,
        packageSize: input.packageSize,
        imageUrl: input.imageUrl ?? null,
        quantity: getDefaultQuantity(input.productGroupKey),
      },
    ];
  }

  emit();
  const ok = await persist();
  if (!ok) {
    items = previousItems;
    emit();
  }
  return ok;
}

export function suggestionToCartInput(
  suggestion: SearchSuggestion,
): Parameters<typeof addToCart>[0] {
  if (suggestion.type === 'product') {
    return {
      type: 'product',
      productId: suggestion.productId,
      productGroupKey: suggestion.productGroupKey,
      label: suggestion.label,
      brand: suggestion.brand,
      packageSize: suggestion.packageSize,
    };
  }

  return {
    type: 'product_group',
    productGroupKey: suggestion.productGroupKey,
    label: suggestion.label,
  };
}

export async function removeFromCart(key: string): Promise<boolean> {
  const previousItems = items;
  items = items.filter((item) => item.key !== key);
  emit();
  const ok = await persist();
  if (!ok) {
    items = previousItems;
    emit();
  }
  return ok;
}

export async function setCartItemQuantity(key: string, amount: number): Promise<boolean> {
  if (amount <= 0) {
    return removeFromCart(key);
  }

  const previousItems = items;
  items = items.map((item) =>
    item.key === key ? { ...item, quantity: { ...item.quantity, amount } } : item,
  );
  emit();
  const ok = await persist();
  if (!ok) {
    items = previousItems;
    emit();
  }
  return ok;
}

export async function clearCart(): Promise<boolean> {
  const previousItems = items;
  items = [];
  emit();
  const ok = await persist();
  if (!ok) {
    items = previousItems;
    emit();
  }
  return ok;
}

export function cartItemToBasketItem(item: CartItem): BasketItem {
  if (item.type === 'product') {
    return {
      type: 'product',
      productId: item.productId ?? '',
      productGroupKey: item.productGroupKey,
      label: item.label,
      brand: item.brand,
      packageSize: item.packageSize,
      quantity: item.quantity,
    };
  }

  return {
    type: 'product_group',
    productGroupKey: item.productGroupKey,
    label: item.label,
    quantity: item.quantity,
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribeCart, getCartSnapshot, getCartSnapshot);
}

export function useCartItemCount(): number {
  const cartItems = useCart();
  return cartItems.reduce((sum, item) => sum + item.quantity.amount, 0);
}

export function isInCart(key: string): boolean {
  return items.some((item) => item.key === key);
}
