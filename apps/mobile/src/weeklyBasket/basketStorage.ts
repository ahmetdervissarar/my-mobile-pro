/**
 * RafSkoru — Haftalık sepet saklama (AsyncStorage; yalnız cihaz). src/weeklyBasket/basketStorage.ts
 *
 * Dış servise/backend'e YAZILMAZ, YÜKLENMEZ. Kullanıcı alerji profili burada hiç yer almaz —
 * yalnız zaten kullanıcıya gösterilmiş alerjen kapısı METNİ (snapshot) saklanır. Kayıt hatası
 * her zaman görünür döner; sessiz "başarılı" taklidi yapılmaz (bkz. consumer-ux skill).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearBasketLines, mergeLineIntoBasket, removeLineFromBasket, setLineQuantity } from './basketOperations';
import type { WeeklyBasketLineSnapshot, WeeklyBasketRecord } from './types';

const STORAGE_KEY = 'rafskoru:weeklyBasket:v1';

const PERSIST_ERROR = 'Sepet cihazda kaydedilemedi. Depolama alanı dolu olabilir. Tekrar deneyin.';
const NOT_FOUND_ERROR = 'Sepet bulunamadı; sayfayı yenileyip tekrar deneyin.';

export interface BasketStorageResult {
  ok: boolean;
  errorMessage: string | null;
  basket: WeeklyBasketRecord | null;
}

async function readBasket(): Promise<WeeklyBasketRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as WeeklyBasketRecord) : null;
  } catch {
    return null;
  }
}

async function persist(basket: WeeklyBasketRecord): Promise<BasketStorageResult> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
    return { ok: true, errorMessage: null, basket };
  } catch {
    return { ok: false, errorMessage: PERSIST_ERROR, basket: null };
  }
}

export async function loadWeeklyBasket(): Promise<WeeklyBasketRecord | null> {
  return readBasket();
}

export async function addOrIncrementBasketLine(gtin: string, snapshot: WeeklyBasketLineSnapshot): Promise<BasketStorageResult> {
  const current = await readBasket();
  const now = new Date().toISOString();
  return persist(mergeLineIntoBasket(current, gtin, snapshot, now));
}

export async function updateBasketLineQuantity(gtin: string, quantity: number): Promise<BasketStorageResult> {
  const current = await readBasket();
  if (!current) return { ok: false, errorMessage: NOT_FOUND_ERROR, basket: null };
  const now = new Date().toISOString();
  return persist(setLineQuantity(current, gtin, quantity, now));
}

export async function removeBasketLine(gtin: string): Promise<BasketStorageResult> {
  const current = await readBasket();
  if (!current) return { ok: false, errorMessage: NOT_FOUND_ERROR, basket: null };
  const now = new Date().toISOString();
  return persist(removeLineFromBasket(current, gtin, now));
}

export async function clearWeeklyBasket(): Promise<BasketStorageResult> {
  const current = await readBasket();
  if (!current) return { ok: true, errorMessage: null, basket: null };
  const now = new Date().toISOString();
  return persist(clearBasketLines(current, now));
}
