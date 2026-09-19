/**
 * RafSkoru — OCR motoru sınırı (Aşama 7, ADR-006).
 * src/localProduct/ocr/ocrEngine.ts
 *
 * Ekran dosyaları native OCR paketini DOĞRUDAN çağırmaz; yalnız bu sınırı kullanır.
 * `getOcrCapability()` içe aktarma sırasında hiçbir zaman hata fırlatmaz (Expo Go / native modül
 * yokluğunda uygulama çökmez); yalnız çalışma zamanında modül varlığını kontrol eder.
 */

import type { CapturedPhoto, DraftTextField } from '../types';
import { isLocalOcrEnabled } from '../featureFlag';
import type { OcrRunResult } from './types';

export type OcrCapabilityReason = 'flag_disabled' | 'native_module_missing' | 'ready';

export interface OcrCapability {
  available: boolean;
  reason: OcrCapabilityReason;
}

export interface OcrRecognizeInput {
  photo: CapturedPhoto;
  field: DraftTextField;
}

export interface OcrEngine {
  readonly id: 'mlkit' | 'unavailable';
  recognize(input: OcrRecognizeInput): Promise<OcrRunResult>;
}

/**
 * `require` kasıtlı olarak burada, fonksiyon içinde: modül grafiği açısından paket her zaman
 * bundle'a girer (gerçek bağımlılık), ama bu çağrı yalnız native modül anahtarının VARLIĞINA
 * bakar; hiçbir metodu çağırmaz. `rn-mlkit-ocr`'ın kendi dışa aktardığı nesneye hiç dokunmayız —
 * o nesne native modül yoksa ilk özellik erişiminde fırlatan bir Proxy'dir (bkz. mlKitOcrEngine.ts).
 */
function isNativeOcrModulePresent(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModules } = require('react-native') as { NativeModules: Record<string, unknown> };
    return Boolean(NativeModules?.RnMlkitOcr);
  } catch {
    return false;
  }
}

export function getOcrCapability(): OcrCapability {
  if (!isLocalOcrEnabled()) return { available: false, reason: 'flag_disabled' };
  if (!isNativeOcrModulePresent()) return { available: false, reason: 'native_module_missing' };
  return { available: true, reason: 'ready' };
}

export function photoOcrEvidenceId(photo: CapturedPhoto): string {
  return photo.contentHash ? `photo-hash:${photo.contentHash}` : `photo:${photo.kind}:${photo.takenAt}`;
}

/**
 * Motoru geç seçer (lazy): `MlKitOcrEngine` yalnız kapasite `ready` iken oluşturulur, bu sayede
 * native paket importu yalnız gerektiğinde tetiklenir (Expo Go'da hâlâ çökmez, çünkü orada zaten
 * `ready` olmaz).
 */
export async function createOcrEngine(): Promise<OcrEngine> {
  const capability = getOcrCapability();
  if (!capability.available) {
    const { UnavailableOcrEngine } = await import('./unavailableOcrEngine');
    return new UnavailableOcrEngine();
  }
  const { MlKitOcrEngine } = await import('./mlKitOcrEngine');
  return new MlKitOcrEngine();
}
