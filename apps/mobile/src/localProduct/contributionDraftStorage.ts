/**
 * RafSkoru — Katkı taslağı yerel saklama (AsyncStorage).
 * src/localProduct/contributionDraftStorage.ts
 *
 * Bu sürümde dış servise yükleme YOK; yalnız cihazda saklanır. Kişisel profil, konum
 * veya kimlik yazılmaz. Saf I/O katmanı; ekran ve risk motoruna bağımlılığı yoktur.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContributionDraft } from './types';

const STORAGE_KEY = 'rafskoru:contributionDrafts:v1';

type DraftStore = Record<string, ContributionDraft>;

async function readStore(): Promise<DraftStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as DraftStore) : {};
  } catch {
    return {};
  }
}

export async function saveContributionDraft(draft: ContributionDraft): Promise<void> {
  try {
    const store = await readStore();
    store[draft.id] = draft;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Kayıt başarısız olursa sessizce geç; ekran çalışmaya devam eder.
  }
}

/** Barkoda ait en yeni taslak (varsa). */
export async function loadLatestContributionDraft(gtin: string | null | undefined): Promise<ContributionDraft | null> {
  if (!gtin) return null;
  const store = await readStore();
  const matches = Object.values(store).filter((d) => d.gtin === gtin);
  matches.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return matches[0] ?? null;
}

export async function clearContributionDrafts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessizce geç
  }
}
