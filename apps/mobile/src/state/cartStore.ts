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

function persist(): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => {
    // Kayıt başarısız olursa sessizce geç — sepet bellekte kalmaya devam eder.
  });
}

async function hydrate(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
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

export function addToCart(input: {
  type: BasketItem['type'];
  productId?: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: { amount: number; unit: string };
  imageUrl?: string | null;
}): void {
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

  persist();
  emit();
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

export function removeFromCart(key: string): void {
  items = items.filter((item) => item.key !== key);
  persist();
  emit();
}

export function setCartItemQuantity(key: string, amount: number): void {
  if (amount <= 0) {
    removeFromCart(key);
    return;
  }

  items = items.map((item) =>
    item.key === key ? { ...item, quantity: { ...item.quantity, amount } } : item,
  );
  persist();
  emit();
}

export function clearCart(): void {
  items = [];
  persist();
  emit();
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
