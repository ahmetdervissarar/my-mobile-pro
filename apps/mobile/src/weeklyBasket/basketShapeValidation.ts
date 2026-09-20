/**
 * RafSkoru — Haftalık sepet kaydı için hafif runtime şekil doğrulaması (Aşama 9 düzeltme turu).
 * src/weeklyBasket/basketShapeValidation.ts
 *
 * SALT SAF FONKSİYON, I/O YOK (AsyncStorage import etmez) — `basketStorage.ts` bunu okuma
 * sonrası çağırır, `runWeeklyBasketScenarios.ts` doğrudan (I/O bağımlılığı olmadan) test eder.
 * Yalnız yapısal alanları denetler: basketId, weekStart, lines[].gtin, lines[].quantity (pozitif
 * tam sayı). Derin/tam alan doğrulaması değildir.
 */

import type { WeeklyBasketRecord } from './types';

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export function isValidBasketRecordShape(value: unknown): value is WeeklyBasketRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.basketId !== 'string' || !record.basketId) return false;
  if (typeof record.weekStart !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.weekStart)) return false;
  if (typeof record.createdAt !== 'string' || typeof record.updatedAt !== 'string') return false;
  if (!Array.isArray(record.lines)) return false;
  for (const line of record.lines) {
    if (!line || typeof line !== 'object') return false;
    const l = line as Record<string, unknown>;
    if (typeof l.gtin !== 'string' || !l.gtin) return false;
    if (!isPositiveInteger(l.quantity)) return false;
    if (!l.snapshot || typeof l.snapshot !== 'object') return false;
  }
  return true;
}
