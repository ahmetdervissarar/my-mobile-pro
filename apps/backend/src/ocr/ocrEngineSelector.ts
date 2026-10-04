/**
 * RafSkoru — OCR Motor Seçici
 * apps/backend/src/ocr/ocrEngineSelector.ts
 *
 * AŞAMA 1 (feat/ocr-pipeline, görev onayı + yanıt a): `@google-cloud/vision`
 * paketi ŞİMDİ EKLENMEDİ. Bu seçici, anahtar geldiğinde TEK bir dosya
 * (googleVisionEngine.ts, henüz yok) eklenip aşağıdaki TODO'nun yerine
 * `return googleVisionEngine;` yazılarak devreye alınacak şekilde
 * tasarlandı — başka hiçbir çağıran (search/label uç noktaları) değişmez,
 * hepsi `getActiveOcrEngine()` çağırır.
 *
 * `OCR_GOOGLE_VISION_API_KEY` şimdiden okunuyor (henüz kullanılmıyor) ki
 * ortam değişkeni adı/yeri sabitlensin; değer asla log'a yazılmaz.
 */
import { tesseractEngine } from './tesseractEngine.js';
import type { OcrEngine } from './ocrEngine.js';

export function getActiveOcrEngine(): OcrEngine {
  const googleVisionApiKey = process.env.OCR_GOOGLE_VISION_API_KEY?.trim();

  if (googleVisionApiKey) {
    // TODO (anahtar geldiğinde, ayrı onay): googleVisionEngine.ts eklenip
    // burada `return googleVisionEngine;` yazılacak. Şimdilik anahtar
    // VARSA bile tesseract'a düşer — sessizce yanlış motora geçmemek için
    // bu bilgi çağırana loglanır (anahtarın DEĞERİ değil, yalnız varlığı).
    console.warn(
      '[ocr] OCR_GOOGLE_VISION_API_KEY tanımlı ama Google Vision motoru henüz eklenmedi — tesseract kullanılıyor.',
    );
  }

  return tesseractEngine;
}
