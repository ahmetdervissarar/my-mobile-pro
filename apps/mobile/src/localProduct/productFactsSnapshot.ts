/**
 * RafSkoru — Backend'den alınan `ProductFacts` (OFF) için cihazda geçici çözümleme snapshot'ı.
 * src/localProduct/productFactsSnapshot.ts
 *
 * Neden: mobilde OFF verisi için bir servis cache'i yoktur (`PriceClient.resolve` yalnız ağ çağrısıdır);
 * inceleme ekranı, ürün sonuç ekranının backend'den aldığı AYNI `ProductFacts` nesnesini yeniden kullanır.
 * Yeni bir veri modeli üretmez: `ProductFactsWire` olduğu gibi, GTIN ve kayıt zamanıyla saklanır.
 * `facts.observedAt` backend çekim zamanıdır (fetchedAt); `savedAt` yalnız bu cihaz kaydının zamanıdır.
 * Yalnız `dataSource === 'off'` kayıtlar saklanır (beta_inference ürün verisi değildir, D3).
 * Kişisel profil, konum veya kimlik yazılmaz. Mobil OFF'a doğrudan çağrı yapmaz.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import type { ProductFactsWire } from './types';

const STORAGE_KEY = 'rafskoru:productFactsSnapshot:v1';
const MAX_ENTRIES = 50;

/** Güncellik sınırı: 24 saat. Daha eski snapshot "eski cihaz kaydı"dır; backend'in önüne geçmez. */
export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isSnapshotFresh(snapshot: ProductFactsSnapshot, now = Date.now()): boolean {
  const savedAt = Date.parse(snapshot.savedAt);
  return Number.isFinite(savedAt) && now - savedAt >= 0 && now - savedAt <= SNAPSHOT_MAX_AGE_MS;
}

export interface ProductFactsSnapshot {
  gtin: string;
  facts: ProductFactsWire;
  savedAt: string;
}

type SnapshotStore = Record<string, ProductFactsSnapshot>;

async function readStore(): Promise<SnapshotStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as SnapshotStore) : {};
  } catch {
    return {};
  }
}

export async function saveProductFactsSnapshot(gtin: string, facts: ProductFactsWire, now = new Date().toISOString()): Promise<boolean> {
  if (!gtin || facts.dataSource !== 'off') return false;
  try {
    const store = await readStore();
    store[gtin] = { gtin, facts, savedAt: now };
    const entries = Object.values(store).sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)).slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries.map((e) => [e.gtin, e]))));
    return true;
  } catch {
    return false;
  }
}

export async function loadProductFactsSnapshot(gtin: string | null | undefined): Promise<ProductFactsSnapshot | null> {
  if (!gtin) return null;
  const store = await readStore();
  return store[gtin] ?? null;
}

/** Ürün sonuç ekranı: backend OFF kaydı geldiğinde snapshot'ı günceller (tek satırlık bağlantı). */
export function useProductFactsSnapshotWriter(gtin: string | null | undefined, facts: ProductFactsWire | null): void {
  useEffect(() => {
    if (!gtin || !facts || facts.dataSource !== 'off') return;
    void saveProductFactsSnapshot(gtin, facts);
  }, [gtin, facts]);
}
