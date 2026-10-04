/**
 * RafSkoru — Intake barkod lookup kararı
 * apps/backend/src/intake/lookup.ts
 *
 * "Anında cevap" kararının SAF mantığı (bkz. görev planı, gönüllü akışı
 * madde 4) — GTIN doğrulama ve katalog erişimi MEVCUT modüllerden yeniden
 * kullanılır, kopyalanmaz:
 *   - isValidGtin: ../tools/offTurkey/normalize.ts (checksum)
 *   - getCatalog(): ../catalog/catalog.ts (mevcut/eksik alan)
 *   - findSubmissionByBarcode: ./db.ts (bu araçla zaten toplanmış mı)
 */
import { getCatalog } from '../catalog/catalog.js';
import { isValidGtin } from '../tools/offTurkey/normalize.js';

import { abandonSubmission, findSubmissionByBarcode, INTAKE_REOPEN_AFTER_MS } from './db.js';

export type IntakePhotoSlot = 'front' | 'ingredients' | 'nutrition';

export type IntakeLookupStatus = 'invalid_gtin' | 'duplicate' | 'complete' | 'missing_fields' | 'new';

export interface IntakeLookupResult {
  status: IntakeLookupStatus;
  neededSlots: IntakePhotoSlot[];
  productName?: string | null;
  collectedAt?: string;
  volunteerCode?: string;
}

/** catalog.ts'in CompletenessResult.missingFields'ından "besin tablosu fotoğrafı" ile giderilebilecek alanlar. */
const NUTRITION_MISSING_FIELDS = new Set([
  'nutriscore',
  'nova',
  'nutrition.energyKcal',
  'nutrition.sugars',
  'nutrition.saturatedFat',
  'nutrition.salt',
]);

function neededSlotsFromMissingFields(missingFields: string[]): IntakePhotoSlot[] {
  const slots: IntakePhotoSlot[] = [];
  if (missingFields.includes('image')) slots.push('front');
  if (missingFields.includes('ingredients')) slots.push('ingredients');
  if (missingFields.some((field) => NUTRITION_MISSING_FIELDS.has(field))) slots.push('nutrition');
  return slots;
}

/**
 * volunteerCode: "aynı gönüllü tekrar denediğinde yeniden açılsın" kuralı
 * için gerekli — hangi gönüllünün lookup yaptığını bilmeden bu karar
 * verilemez (bkz. görev onayı, madde 4b).
 */
export function evaluateBarcodeLookup(barcode: string, volunteerCode: string): IntakeLookupResult {
  if (!isValidGtin(barcode)) {
    return { status: 'invalid_gtin', neededSlots: [] };
  }

  const existingSubmission = findSubmissionByBarcode(barcode);
  if (existingSubmission) {
    const isSubmissionComplete = existingSubmission.requestedSlots.every((slot) =>
      existingSubmission.receivedSlots.includes(slot),
    );
    const ageMs = Date.now() - new Date(existingSubmission.createdAt).getTime();
    const sameVolunteer = existingSubmission.volunteerCode === volunteerCode;
    const reopenEligible = !isSubmissionComplete && (sameVolunteer || ageMs >= INTAKE_REOPEN_AFTER_MS);

    if (!reopenEligible) {
      return {
        status: 'duplicate',
        neededSlots: [],
        collectedAt: existingSubmission.createdAt,
        volunteerCode: existingSubmission.volunteerCode,
      };
    }

    // Yarım kalan kayıt 2 saati geçmiş YA DA aynı gönüllü tekrar deniyor —
    // barkod kilidi kalıcı olmasın (bkz. görev onayı, madde 4b). Eski kayıt
    // SİLİNMEZ: "terk edilmiş" işaretlenir, fotoğrafları ve admin panelindeki
    // görünürlüğü korunur; aşağıda yeni bir kayıt için yol açılır.
    abandonSubmission(existingSubmission.id);
  }

  const catalogProduct = getCatalog().byId.get(barcode);
  if (catalogProduct) {
    const neededSlots = neededSlotsFromMissingFields(catalogProduct.missingFields);
    return {
      status: neededSlots.length === 0 ? 'complete' : 'missing_fields',
      neededSlots,
      productName: catalogProduct.name,
    };
  }

  return { status: 'new', neededSlots: ['front', 'ingredients', 'nutrition'] };
}
