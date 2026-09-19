/**
 * RafSkoru — Cihaz içi OCR aday sonucu tipleri (Aşama 7, ADR-006).
 * src/localProduct/ocr/types.ts
 *
 * Bu tipler yalnız cihazda üretilen, doğrulanmamış OCR ADAYINI taşır. Alerjen eşleşmesine, risk
 * motoruna, RafSkoru'na veya alternatif filtresine hiçbir alanı doğrudan girmez. `source`,
 * `verificationLevel`, `confidence` sabittir (product-data-provenance: user_ocr → her zaman low).
 * Mevcut `DraftTextField`/`CapturedPhoto` tiplerini tekrar üretmez; oradan alır.
 */

import type { DraftTextField } from '../types';

export interface OcrTextFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrLine {
  text: string;
  frame: OcrTextFrame | null;
}

export interface OcrBlock {
  text: string;
  frame: OcrTextFrame | null;
  lines: readonly OcrLine[];
}

/** candidate: metin bulundu · no_text: görüntü işlendi ama metin yok · failed: işlenemedi. */
export type OcrRunStatus = 'candidate' | 'no_text' | 'failed';

export type OcrEngineId = 'mlkit_latin' | 'unavailable';

export interface OcrRunResult {
  field: DraftTextField;
  status: OcrRunStatus;
  /** Ham, düzenlenmemiş cihaz OCR çıktısı. Kullanıcı düzeltmesiyle ASLA üzerine yazılmaz. */
  rawText: string | null;
  blocks: readonly OcrBlock[];
  engine: OcrEngineId;
  engineVersion: string | null;
  /** Fotoğrafın kararlı kimliği (tür + çekim zamanından türetilir); draft henüz kaydedilmemiş olabilir. */
  photoEvidenceId: string;
  capturedAt: string;
  recognizedAt: string;
  source: 'user_ocr';
  verificationLevel: 'unverified';
  confidence: 'low';
  /** `status==='failed'` iken kullanıcıya gösterilecek Türkçe, teknik olmayan mesaj. */
  errorMessage: string | null;
}
