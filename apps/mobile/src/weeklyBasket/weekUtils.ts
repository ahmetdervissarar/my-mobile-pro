/**
 * RafSkoru — Hafta başlangıcı hesaplama (Aşama 9). src/weeklyBasket/weekUtils.ts
 * Yalnız etiketleme amaçlı; sepet ROLLOVER/silme tetiklemez (bkz. types.ts).
 */

/** Pazartesi başlangıçlı, ISO tarih (YYYY-MM-DD) biçiminde hafta başlangıcı. */
export function getIsoWeekStartDate(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0=Pazar..6=Cumartesi
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

export function formatWeekRangeLabel(weekStartIso: string): string {
  const match = weekStartIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return weekStartIso;
  const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}`;
}
