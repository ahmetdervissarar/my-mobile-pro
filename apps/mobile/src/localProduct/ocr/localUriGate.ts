/**
 * RafSkoru — OCR yerel URI güvenlik kapısı (Aşama 7, düzeltme turu).
 * src/localProduct/ocr/localUriGate.ts
 *
 * `rn-mlkit-ocr@0.3.1` HTTP(S) URL'lerini de kabul eder (bkz. paketin `loadImage`/`downloadBitmap`
 * kodu) — bu, fotoğrafın cihaz dışına çıkmadığı ilkesiyle uyumlu DEĞİLDİR ve RafSkoru'da hiçbir
 * zaman kullanılmaz. Bu dosya, native pakete ulaşmadan ÖNCE yalnız cihaz-yerel URI şemalarına
 * (`file://`, Android `content://`) izin veren tek geçidi tanımlar. `data:` ve tanınmayan şemalar
 * (özellikle `http://`/`https://`) burada reddedilir; native modüle asla iletilmez.
 */

const ALLOWED_LOCAL_URI_PREFIXES = ['file://', 'content://'] as const;

export function isAllowedLocalOcrUri(uri: string): boolean {
  return ALLOWED_LOCAL_URI_PREFIXES.some((prefix) => uri.startsWith(prefix));
}

/** Kullanıcıya gösterilecek TEK mesaj; şema reddedilme nedeni (http/data/bilinmeyen) hiç belirtilmez. */
export const LOCAL_URI_REJECTED_MESSAGE = 'Bu fotoğraf cihazda okunamadı; yeniden çekin veya elle yazın.';
