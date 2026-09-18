/**
 * RafSkoru — GTIN/EAN/UPC doğrulama (saf fonksiyon, I/O yok).
 * src/localProduct/gtin.ts
 *
 * Yalnız yapısal doğrulama yapar (uzunluk + GS1 kontrol basamağı algoritması).
 * Ürünün gerçekten var olup olmadığını veya OFF'ta kayıtlı olup olmadığını doğrulamaz.
 */

export type GtinValidationReason = 'empty' | 'non_digit' | 'length' | 'check_digit';

export interface GtinValidationResult {
  valid: boolean;
  reason?: GtinValidationReason;
}

const VALID_LENGTHS = new Set([8, 12, 13, 14]);

/**
 * GS1 kontrol basamağı algoritması: sağdan başlayarak alternatif 3/1 ağırlık.
 * (Aynı algoritma bu görevin araştırma turlarında bash/python ile de doğrulandı.)
 */
function computeCheckDigit(bodyDigits: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < bodyDigits.length; i += 1) {
    const positionFromRight = bodyDigits.length - 1 - i;
    const weight = positionFromRight % 2 === 0 ? 3 : 1;
    sum += bodyDigits[i] * weight;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * GTIN-8/12/13/14 için uzunluk ve kontrol basamağı doğrulaması.
 * Boşluk/tire temizlenmez — çağıran taraf (ör. TextInput onChangeText) yalnız rakam
 * karakterlerini geçirmelidir; bu fonksiyon saf doğrulamadır, normalize etmez.
 */
export function validateGtin(code: string | null | undefined): GtinValidationResult {
  if (!code || code.length === 0) return { valid: false, reason: 'empty' };
  if (!/^\d+$/.test(code)) return { valid: false, reason: 'non_digit' };
  if (!VALID_LENGTHS.has(code.length)) return { valid: false, reason: 'length' };

  const digits = code.split('').map(Number);
  const checkDigit = digits[digits.length - 1];
  const body = digits.slice(0, -1);
  const expected = computeCheckDigit(body);

  return expected === checkDigit ? { valid: true } : { valid: false, reason: 'check_digit' };
}

export function isValidGtin(code: string | null | undefined): boolean {
  return validateGtin(code).valid;
}

const GTIN_VALIDATION_MESSAGES: Record<GtinValidationReason, string> = {
  empty: 'Barkod boş.',
  non_digit: 'Barkod yalnız rakam içermeli.',
  length: 'Barkod uzunluğu geçersiz (8, 12, 13 veya 14 rakam olmalı).',
  check_digit: 'Barkod geçersiz görünüyor (kontrol basamağı hatalı). Rakamları tekrar kontrol edin.',
};

/** Kullanıcıya gösterilecek kısa Türkçe hata metni; geçerliyse null. */
export function describeGtinValidationError(code: string | null | undefined): string | null {
  const result = validateGtin(code);
  if (result.valid || !result.reason) return null;
  return GTIN_VALIDATION_MESSAGES[result.reason];
}
