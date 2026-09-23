/**
 * RafSkoru — Son Baktıkların (cihaz içi)
 * src/state/recentlyViewedStore.ts
 *
 * Yalnızca cihazda (AsyncStorage) tutulur; backend'e, log'a veya
 * telemetriye gönderilmez.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'rafskoru:recentlyViewed';
const MAX_ENTRIES = 12;

export interface RecentlyViewedEntry {
  key: string;
  barcode?: string;
  productName: string;
  imageUrl: string | null;
  score: number | null;
  viewedAt: string;
}

let entries: RecentlyViewedEntry[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function persist(): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries)).catch(() => {});
}

async function hydrate(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      entries = JSON.parse(raw) as RecentlyViewedEntry[];
      emit();
    }
  } catch {
    entries = [];
  }
}

void hydrate();

export function recordRecentlyViewed(entry: {
  barcode?: string;
  productName: string;
  imageUrl: string | null;
  score: number | null;
}): void {
  const trimmedName = entry.productName.trim();
  if (!trimmedName) return;

  const key = entry.barcode?.trim() || trimmedName;
  const next: RecentlyViewedEntry = {
    key,
    barcode: entry.barcode,
    productName: trimmedName,
    imageUrl: entry.imageUrl,
    score: entry.score,
    viewedAt: new Date().toISOString(),
  };

  entries = [next, ...entries.filter((item) => item.key !== key)].slice(0, MAX_ENTRIES);
  persist();
  emit();
}

export function getRecentlyViewedSnapshot(): RecentlyViewedEntry[] {
  return entries;
}

export function subscribeRecentlyViewed(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRecentlyViewed(): RecentlyViewedEntry[] {
  return useSyncExternalStore(subscribeRecentlyViewed, getRecentlyViewedSnapshot, getRecentlyViewedSnapshot);
}
