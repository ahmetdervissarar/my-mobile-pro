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

import { findSubmissionByBarcode } from './db.js';

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

export function evaluateBarcodeLookup(barcode: string): IntakeLookupResult {
  if (!isValidGtin(barcode)) {
    return { status: 'invalid_gtin', neededSlots: [] };
  }

  const existingSubmission = findSubmissionByBarcode(barcode);
  if (existingSubmission) {
    return {
      status: 'duplicate',
      neededSlots: [],
      collectedAt: existingSubmission.createdAt,
      volunteerCode: existingSubmission.volunteerCode,
    };
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
