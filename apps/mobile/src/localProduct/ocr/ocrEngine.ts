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

/**
 * UYARI (product-data-contract-reviewer bulgu #2): bu kimlik `resolution/providers.ts::photoEvidenceId`
 * (`${draft.id}:photo:${kind}`, draft kapsamlı, `FieldEvidence.source.evidenceId` kanıt zincirine giren
 * TEK kimlik) İLE AYNI ŞEY DEĞİLDİR ve onun yerine KULLANILMAMALIDIR. Bu fonksiyon yalnız
 * `OcrRunResult.photoEvidenceId` (ekranda gösterilen, henüz taslağa/kanıt zincirine yazılmamış geçici
 * provenance bilgisi) için vardır — draft henüz kaydedilmeden (dolayısıyla `draft.id` olmadan) OCR
 * çalışabildiği için ayrı, kararlı (fotoğraf tür+çekim zamanı veya hash tabanlı) bir kimliğe ihtiyaç
 * duyar. Draft kaydedildikten sonraki gerçek kanıt kimliği için HER ZAMAN `providers.ts::photoEvidenceId`
 * kullanılır; bu iki fonksiyon birbirinin yerine geçmez.
 */
export function photoOcrEvidenceId(photo: CapturedPhoto): string {
  return photo.contentHash ? `photo-hash:${photo.contentHash}` : `photo:${photo.kind}:${photo.takenAt}`;
}

/**
 * Motoru geç seçer (lazy): `MlKitOcrEngine` yalnız kapasite `ready` iken oluşturulur, bu sayede
 * native paket importu yalnız gerektiğinde tetiklenir (Expo Go'da hâlâ çökmez, çünkü orada zaten
 * `ready` olmaz). Dinamik `import()` başarısız olursa (ör. bundler/native bağlama hatası — kapasite
 * `ready` desin bile) ASLA fırlatmaz; kontrollü biçimde `UnavailableOcrEngine`'e düşer, elle giriş
 * akışını hiçbir zaman engellemez. Çağıran taraf (`ReviewFieldCard.tsx::handleRunOcr`) yine de kendi
 * try/catch'ini taşır — bu, tek bir savunma katmanına güvenmemek içindir.
 */
export async function createOcrEngine(): Promise<OcrEngine> {
  const capability = getOcrCapability();
  if (capability.available) {
    try {
      const { MlKitOcrEngine } = await import('./mlKitOcrEngine');
      return new MlKitOcrEngine();
    } catch {
      // Beklenmeyen import hatası — sessizce güvenli tarafa düş, hiçbir ayrıntı sızdırma.
    }
  }
  const { UnavailableOcrEngine } = await import('./unavailableOcrEngine');
  return new UnavailableOcrEngine();
}
