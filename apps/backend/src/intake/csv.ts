/**
 * RafSkoru — Intake CSV dışa aktarma
 * apps/backend/src/intake/csv.ts
 *
 * Sabit, küçük bir satır/sütun kümesi için — yeni bir CSV kütüphanesi
 * eklenmedi (bkz. görev onayı, "yeni paket için önce onay iste").
 */
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
  return lines.join('\r\n') + '\r\n';
}
