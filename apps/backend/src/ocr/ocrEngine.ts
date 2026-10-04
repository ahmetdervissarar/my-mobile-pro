/**
 * RafSkoru — OCR Motor Sözleşmesi
 * apps/backend/src/ocr/ocrEngine.ts
 *
 * AŞAMA 1 (feat/ocr-pipeline, görev onayı): tek `OcrEngine` sözleşmesi, motor
 * değiştirilebilir. Fotoğraf her zaman SUNUCUDA işlenir (bkz. tesseractEngine.ts)
 * — mobil yalnızca ham fotoğraf baytını gönderir, OCR sonucu dışında hiçbir şey
 * (profil, kullanıcı kimliği) backend'e gitmez (E2 — sağlık profili cihazda kalır).
 *
 * Çıktı OCR sonucudur, KARAR değildir: `confidence` ve `engine` her zaman
 * taşınır (bkz. product-data-provenance skill — kaynak sınıfı `user_ocr`,
 * asla "doğrulanmış" sayılmaz). Bu sözleşme bir alerjen/sağlık kararı
 * ÜRETMEZ — yalnızca görüntüden metin çıkarır.
 */
export type OcrEngineName = 'tesseract' | 'google_vision';

export interface OcrRecognizeInput {
  /** Ham fotoğraf baytı — sunucuda işlenir, bu fonksiyon dışında saklanmaz (A/B akışları). */
  buffer: Buffer;
  /** 'image/jpeg' | 'image/png' — motor seçimini etkilemez, yalnız doğrulama/log için. */
  mimeType: string;
}

export interface OcrRecognizeResult {
  /** Ham OCR metni — HENÜZ yapılandırılmış veri değildir, projeksiyon/eşleme ayrı adımdır. */
  text: string;
  /** 0-100 arası motorun kendi güven puanı (motordan motora farklı ölçeklenebilir). */
  confidence: number;
  engine: OcrEngineName;
  /** Tek bir recognize() çağrısının toplam süresi (ms) — performans ölçümü, görev onayı ek 1. */
  durationMs: number;
  /**
   * `process.memoryUsage().heapUsed` farkı (bayt) — YAKLAŞIKTIR (GC zamanlaması
   * etkiler), tek bir isteğin hassas bellek ölçümü değil, kaba bir gösterge.
   */
  memoryDeltaBytes: number;
}

export interface OcrEngine {
  readonly name: OcrEngineName;
  recognize(input: OcrRecognizeInput): Promise<OcrRecognizeResult>;
}
