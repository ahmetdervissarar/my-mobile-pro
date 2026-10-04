/**
 * RafSkoru — Intake CSV dışa aktarma
 * apps/backend/src/intake/csv.ts
 *
 * Sabit, küçük bir satır/sütun kümesi için — yeni bir CSV kütüphanesi
 * eklenmedi (bkz. görev onayı, "yeni paket için önce onay iste").
 */
/**
 * Formül enjeksiyonu: =, +, -, @ ile başlayan bir alan Excel/Sheets'te
 * açılınca FORMÜL olarak çalıştırılabilir (ör. =HYPERLINK(...) veya
 * =cmd|'/c calc'!A1 gibi komut zincirleri) — bkz. görev onayı, madde 4d.
 * Baştaki tek tırnak (') bu karakterleri METİN olarak göstermeye zorlar,
 * hiçbir tablolama programı tarafından görüntülenen değere eklenmez.
 */
const FORMULA_INJECTION_PREFIX_PATTERN = /^[=+\-@]/;

function sanitizeFormulaInjection(value: string): string {
  return FORMULA_INJECTION_PREFIX_PATTERN.test(value) ? `'${value}` : value;
}

function escapeCsvField(value: string): string {
  const sanitized = sanitizeFormulaInjection(value);
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
  return lines.join('\r\n') + '\r\n';
}
