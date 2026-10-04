/**
 * RafSkoru — Tesseract OCR Motoru (varsayılan)
 * apps/backend/src/ocr/tesseractEngine.ts
 *
 * AŞAMA 1 (feat/ocr-pipeline, görev onayı): `tesseract.js` (WASM, Apache-2.0)
 * — sistem paketi GEREKTİRMEZ. Türkçe dil verisi `@tesseract.js-data/tur`
 * (MIT) npm paketinden YEREL diskten okunur.
 *
 * KRİTİK: `langPath` AÇIKÇA verilmezse tesseract.js varsayılan olarak
 * `cdn.jsdelivr.net`'ten indirmeye çalışır (bkz. node_modules/tesseract.js/
 * src/worker-script/index.js, "If langPath if not explicitly set by the
 * user, the jsdelivr CDN is used"). Bu, üretim sunucusunun çıkış (egress)
 * politikası CDN'i engellerse (bu geliştirme ortamında olduğu gibi) OCR'ı
 * tamamen BOZAR. Bu yüzden `langPath` HER ZAMAN yerel pakete işaret eder —
 * motor hiçbir ağ çağrısı yapmaz (doğrulandı: bu kum havuzunda jsdelivr
 * engelliyken worker başarıyla kuruldu, bkz. tesseractEngine.smoke.ts).
 *
 * Worker tekil (singleton) ve yeniden kullanılır — her istekte yeniden
 * kurmak (WASM init + dil verisi okuma) saniyeler sürer (bkz. smoke test
 * raporundaki ilk açılış süresi).
 */
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createWorker, type Worker } from 'tesseract.js';

import turLanguageData from '@tesseract.js-data/tur';

import type { OcrEngine, OcrRecognizeInput, OcrRecognizeResult } from './ocrEngine.js';

/**
 * `cachePath` AÇIKÇA verilmezse tesseract.js, `.gz` dosyasını açıp ham
 * `tur.traineddata`'yı çalışma dizinine (process.cwd()) yazar — hangi
 * dizinden başlatıldığına bağlı, repo köküne bile yazabilir (bu dosya
 * eklenirken tam olarak bu yaşandı, bkz. görev raporu). Sabit, repo-göreli
 * bir önbellek dizini vererek bu belirsizliği ortadan kaldırıyoruz;
 * `apps/backend/data/ocr-cache/` `.gitignore`'da.
 */
const ocrCacheDir = fileURLToPath(new URL('../../data/ocr-cache/', import.meta.url));

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    mkdirSync(ocrCacheDir, { recursive: true });
    workerPromise = createWorker('tur', undefined, {
      langPath: turLanguageData.langPath,
      gzip: turLanguageData.gzip,
      cachePath: ocrCacheDir,
    });
  }
  return workerPromise;
}

/** Yalnız testler için — her testte temiz bir worker/ölçüm başlasın diye. */
export async function __resetTesseractWorkerForTesting(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

export const tesseractEngine: OcrEngine = {
  name: 'tesseract',

  async recognize({ buffer }: OcrRecognizeInput): Promise<OcrRecognizeResult> {
    const startedAt = Date.now();
    const heapBefore = process.memoryUsage().heapUsed;

    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);

    return {
      text: data.text,
      confidence: data.confidence,
      engine: 'tesseract',
      durationMs: Date.now() - startedAt,
      memoryDeltaBytes: process.memoryUsage().heapUsed - heapBefore,
    };
  },
};
