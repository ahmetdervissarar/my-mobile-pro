/**
 * RafSkoru — ML Kit tabanlı OCR motoru (Aşama 7, ADR-006).
 * src/localProduct/ocr/mlKitOcrEngine.ts
 *
 * `rn-mlkit-ocr@0.3.1` sarmalayıcısı; yalnız cihazda (`ocrUseBundled:true`, gömülü Latin modeli)
 * çalışır, ağa çıkmaz. Bu dosya yalnız `ocrEngine.ts::createOcrEngine()` kapasite `ready` iken
 * dinamik olarak yükler; ekran dosyaları bu dosyayı DOĞRUDAN içe aktarmaz. Sonuç eşleme mantığı
 * `mapMlkitResult.ts`'te (I/O yok, native import yok) — burada yalnız çağrı + hata yakalama var.
 */

import MlkitOcr from 'rn-mlkit-ocr';

import { photoOcrEvidenceId } from './ocrEngine';
import type { OcrEngine, OcrRecognizeInput } from './ocrEngine';
import { mapMlkitFailure, mapMlkitResult } from './mapMlkitResult';
import type { OcrRunResult } from './types';

/** Kurulu `rn-mlkit-ocr` sürümüyle birlikte güncellenir (package.json ile elle senkron tutulur). */
const ENGINE_VERSION = '0.3.1';

export class MlKitOcrEngine implements OcrEngine {
  readonly id = 'mlkit' as const;

  async recognize({ photo, field }: OcrRecognizeInput): Promise<OcrRunResult> {
    const base = {
      field,
      photoEvidenceId: photoOcrEvidenceId(photo),
      capturedAt: photo.takenAt,
      engineVersion: ENGINE_VERSION,
      recognizedAt: new Date().toISOString(),
    };
    try {
      const result = await MlkitOcr.recognizeText(photo.localUri, 'latin');
      return mapMlkitResult(result, { ...base, recognizedAt: new Date().toISOString() });
    } catch {
      // Hata ayrıntısı (yığın izi, native mesaj) kullanıcıya veya log'a taşınmaz — yalnız durum.
      return mapMlkitFailure({ ...base, recognizedAt: new Date().toISOString() }, 'Okuma başarısız — yeniden deneyin veya elle yazın.');
    }
  }
}
