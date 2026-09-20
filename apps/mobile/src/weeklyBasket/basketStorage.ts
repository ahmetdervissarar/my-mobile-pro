/**
 * RafSkoru — Haftalık sepet saklama (AsyncStorage; yalnız cihaz). src/weeklyBasket/basketStorage.ts
 *
 * Dış servise/backend'e YAZILMAZ, YÜKLENMEZ. Kullanıcı alerji profili burada hiç yer almaz —
 * yalnız zaten kullanıcıya gösterilmiş alerjen kapısı METNİ (snapshot) saklanır. Okuma/kayıt hatası
 * her zaman görünür döner; sessiz "boş sepet" veya "başarılı" taklidi yapılmaz. Okunamayan/bozuk
 * bir kayıt asla otomatik silinmez veya üzerine yazılmaz — yalnız kullanıcı "Yeni haftaya başla"yı
 * onayladığında (`startNewWeeklyBasket`) yerine yenisi konur.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearBasketLines, mergeLineIntoBasket, removeLineFromBasket, setLineQuantity, startNewWeek } from './basketOperations';
import { isValidBasketRecordShape } from './basketShapeValidation';
import type { WeeklyBasketLineSnapshot, WeeklyBasketRecord } from './types';

const STORAGE_KEY = 'rafskoru:weeklyBasket:v1';

const PERSIST_ERROR = 'Sepet cihazda kaydedilemedi. Depolama alanı dolu olabilir. Tekrar deneyin.';
const READ_ERROR = 'Sepet kaydı okunamadı veya bozuk görünüyor. Cihaz depolamasını kontrol edip tekrar deneyin.';
const NOT_FOUND_ERROR = 'Sepet bulunamadı; sayfayı yenileyip tekrar deneyin.';
const WEEK_MISMATCH_ERROR = 'Bu sepet önceki haftaya ait; yeni ürün eklemeden önce sepeti açıp "Yeni haftaya başla" ile devam edin.';

export interface BasketStorageResult {
  ok: boolean;
  errorMessage: string | null;
  basket: WeeklyBasketRecord | null;
}

export interface ReadBasketResult {
  ok: boolean;
  /** `ok:true` ve `basket:null` = sepet henüz hiç oluşturulmamış (gerçekten boş). `ok:false` = okunamadı/bozuk; boş SAYILMAZ. */
  basket: WeeklyBasketRecord | null;
  errorMessage: string | null;
}

export interface AddBasketLineResult {
  ok: boolean;
  status: 'added' | 'week_mismatch' | 'error';
  errorMessage: string | null;
  basket: WeeklyBasketRecord | null;
}

async function readBasket(): Promise<ReadBasketResult> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return { ok: false, basket: null, errorMessage: READ_ERROR };
  }

  if (!raw) return { ok: true, basket: null, errorMessage: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, basket: null, errorMessage: READ_ERROR };
  }

  if (!isValidBasketRecordShape(parsed)) {
    return { ok: false, basket: null, errorMessage: READ_ERROR };
  }

  return { ok: true, basket: parsed, errorMessage: null };
}

async function persist(basket: WeeklyBasketRecord): Promise<BasketStorageResult> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(basket));
    return { ok: true, errorMessage: null, basket };
  } catch {
    return { ok: false, errorMessage: PERSIST_ERROR, basket: null };
  }
}

export async function loadWeeklyBasket(): Promise<ReadBasketResult> {
  return readBasket();
}

export async function addOrIncrementBasketLine(gtin: string, snapshot: WeeklyBasketLineSnapshot): Promise<AddBasketLineResult> {
  const read = await readBasket();
  if (!read.ok) {
    return { ok: false, status: 'error', errorMessage: read.errorMessage, basket: null };
  }

  const now = new Date().toISOString();
  const outcome = mergeLineIntoBasket(read.basket, gtin, snapshot, now);

  if (outcome.status === 'week_mismatch') {
    return { ok: false, status: 'week_mismatch', errorMessage: WEEK_MISMATCH_ERROR, basket: outcome.basket };
  }

  const persisted = await persist(outcome.basket);
  return persisted.ok
    ? { ok: true, status: 'added', errorMessage: null, basket: persisted.basket }
    : { ok: false, status: 'error', errorMessage: persisted.errorMessage, basket: null };
}

export async function updateBasketLineQuantity(gtin: string, quantity: number): Promise<BasketStorageResult> {
  const read = await readBasket();
  if (!read.ok) return { ok: false, errorMessage: read.errorMessage, basket: null };
  if (!read.basket) return { ok: false, errorMessage: NOT_FOUND_ERROR, basket: null };
  const now = new Date().toISOString();
  return persist(setLineQuantity(read.basket, gtin, quantity, now));
}

export async function removeBasketLine(gtin: string): Promise<BasketStorageResult> {
  const read = await readBasket();
  if (!read.ok) return { ok: false, errorMessage: read.errorMessage, basket: null };
  if (!read.basket) return { ok: false, errorMessage: NOT_FOUND_ERROR, basket: null };
  const now = new Date().toISOString();
  return persist(removeLineFromBasket(read.basket, gtin, now));
}

export async function clearWeeklyBasket(): Promise<BasketStorageResult> {
  const read = await readBasket();
  if (!read.ok) return { ok: false, errorMessage: read.errorMessage, basket: null };
  if (!read.basket) return { ok: true, errorMessage: null, basket: null };
  const now = new Date().toISOString();
  return persist(clearBasketLines(read.basket, now));
}

/** Yalnız kullanıcının AÇIK onayından sonra çağrılır (bkz. `app/weekly-basket.tsx`); eski kaydın yerine yeni, boş bir haftalık sepet koyar. */
export async function startNewWeeklyBasket(): Promise<BasketStorageResult> {
  const now = new Date().toISOString();
  return persist(startNewWeek(now));
}
