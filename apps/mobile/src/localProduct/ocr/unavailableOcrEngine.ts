/**
 * RafSkoru — OCR kullanılamıyor motoru (Aşama 7, ADR-006).
 * src/localProduct/ocr/unavailableOcrEngine.ts
 *
 * Bayrak kapalıyken veya native modül yokken (Expo Go, native modülsüz derleme) kullanılır.
 * Ekran normalde bu durumda düğmeyi zaten pasif gösterir; bu sınıf yine de çağrılırsa güvenli,
 * çökmeyen bir "failed" sonucu döner — elle giriş akışı bundan etkilenmez.
 */

import { photoOcrEvidenceId } from './ocrEngine';
import type { OcrEngine, OcrRecognizeInput } from './ocrEngine';
import type { OcrRunResult } from './types';

export class UnavailableOcrEngine implements OcrEngine {
  readonly id = 'unavailable' as const;

  async recognize({ photo, field }: OcrRecognizeInput): Promise<OcrRunResult> {
    const now = new Date().toISOString();
    return {
      field,
      status: 'failed',
      rawText: null,
      blocks: [],
      engine: 'unavailable',
      engineVersion: null,
      photoEvidenceId: photoOcrEvidenceId(photo),
      capturedAt: photo.takenAt,
      recognizedAt: now,
      source: 'user_ocr',
      verificationLevel: 'unverified',
      confidence: 'low',
      errorMessage: 'OCR bu cihazda kullanılamıyor — elle yazabilirsiniz.',
    };
  }
}
