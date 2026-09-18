/**
 * RafSkoru — Yerel incelenmiş aday kayıt saklama (AsyncStorage; yalnız cihaz).
 * src/localProduct/resolution/reviewStorage.ts
 *
 * Dış servise yükleme YOK. Kişisel profil, konum veya kimlik yazılmaz. Kayıt hatası görünür olur;
 * başarı taklidi yapılmaz.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocallyReviewedRecord } from './types';

const STORAGE_KEY = 'rafskoru:localReviews:v1';

type ReviewStore = Record<string, LocallyReviewedRecord>;

async function readStore(): Promise<ReviewStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as ReviewStore) : {};
  } catch {
    return {};
  }
}

export interface SaveReviewResult {
  ok: boolean;
  errorMessage: string | null;
}

export async function saveLocallyReviewedRecord(record: LocallyReviewedRecord): Promise<SaveReviewResult> {
  try {
    const store = await readStore();
    store[record.id] = record;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return { ok: true, errorMessage: null };
  } catch {
    return { ok: false, errorMessage: 'İnceleme kaydı cihazda kaydedilemedi. Depolama alanı dolu olabilir. Tekrar deneyin.' };
  }
}

/** Bir taslağa bağlı tüm inceleme kayıtlarını siler ("Taslağı ve fotoğrafları sil"). */
export async function deleteReviewedRecordsForDraft(draftId: string): Promise<boolean> {
  try {
    const store = await readStore();
    for (const [id, record] of Object.entries(store)) if (record.draftId === draftId) delete store[id];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export async function loadLatestReviewedRecord(gtin: string | null | undefined): Promise<LocallyReviewedRecord | null> {
  if (!gtin) return null;
  const store = await readStore();
  const matches = Object.values(store).filter((r) => r.gtin === gtin);
  matches.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return matches[0] ?? null;
}
