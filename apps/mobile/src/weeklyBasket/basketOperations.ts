/**
 * RafSkoru — Haftalık sepet saf durum geçişleri (Aşama 9). src/weeklyBasket/basketOperations.ts
 *
 * SALT SAF FONKSİYONLAR, I/O YOK. AsyncStorage çağrısı yalnız `basketStorage.ts`'tedir; bu
 * dosya yalnız "mevcut kayıt + eylem → yeni kayıt" dönüşümünü yapar, senaryo testleriyle
 * doğrudan (AsyncStorage taklidi gerekmeden) doğrulanabilir.
 */

import { getIsoWeekStartDate } from './weekUtils';
import type { WeeklyBasketLineSnapshot, WeeklyBasketRecord } from './types';

function createEmptyBasket(now: string): WeeklyBasketRecord {
  return {
    basketId: `basket-${now}`,
    weekStart: getIsoWeekStartDate(new Date(now)),
    createdAt: now,
    updatedAt: now,
    lines: [],
  };
}

/** Aynı GTIN varsa miktarı 1 artırır ve snapshot'ı günceller; yoksa yeni satır açar. */
export function mergeLineIntoBasket(
  basket: WeeklyBasketRecord | null,
  gtin: string,
  snapshot: WeeklyBasketLineSnapshot,
  now: string,
): WeeklyBasketRecord {
  const base = basket ?? createEmptyBasket(now);
  const existingIndex = base.lines.findIndex((line) => line.gtin === gtin);

  if (existingIndex === -1) {
    return {
      ...base,
      updatedAt: now,
      lines: [...base.lines, { gtin, quantity: 1, snapshot, addedAt: now, updatedAt: now }],
    };
  }

  return {
    ...base,
    updatedAt: now,
    lines: base.lines.map((line, index) =>
      index === existingIndex ? { ...line, quantity: line.quantity + 1, snapshot, updatedAt: now } : line,
    ),
  };
}

/** Miktar her zaman en az 1'dir; sıfıra/altına indirme silme sayılmaz — ayrı bir işlemdir. */
export function setLineQuantity(basket: WeeklyBasketRecord, gtin: string, quantity: number, now: string): WeeklyBasketRecord {
  const clamped = Math.max(1, Math.floor(quantity));
  return {
    ...basket,
    updatedAt: now,
    lines: basket.lines.map((line) => (line.gtin === gtin ? { ...line, quantity: clamped, updatedAt: now } : line)),
  };
}

export function removeLineFromBasket(basket: WeeklyBasketRecord, gtin: string, now: string): WeeklyBasketRecord {
  return { ...basket, updatedAt: now, lines: basket.lines.filter((line) => line.gtin !== gtin) };
}

/** Sepeti (basketId/weekStart korunarak) boşaltır; "önceki hafta" kavramıyla ilgisizdir. */
export function clearBasketLines(basket: WeeklyBasketRecord, now: string): WeeklyBasketRecord {
  return { ...basket, updatedAt: now, lines: [] };
}
