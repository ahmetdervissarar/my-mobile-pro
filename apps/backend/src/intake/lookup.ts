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
import { getCurrentVerified, isLabelStoreDbReady } from '../labelStore/db.js';
import type { VerifiedLabelProduct } from '../labelStore/types.js';
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
  const verified = currentVerifiedOrNull(barcode);

  if (catalogProduct) {
    const neededSlots = withoutSlotsCoveredByVerified(neededSlotsFromMissingFields(catalogProduct.missingFields), verified);
    return {
      status: neededSlots.length === 0 ? 'complete' : 'missing_fields',
      neededSlots,
      productName: catalogProduct.name,
    };
  }

  // OFF'ta yok ama insan onaylı etiket kaydı var (İş 1.5d): yalnız kaydın
  // karşılamadığı fotoğraflar istenir.
  if (verified) {
    const neededSlots = withoutSlotsCoveredByVerified(['front', 'ingredients', 'nutrition'], verified);
    return {
      status: neededSlots.length === 0 ? 'complete' : 'missing_fields',
      neededSlots,
      productName: verified.fields.productName,
    };
  }

  return { status: 'new', neededSlots: ['front', 'ingredients', 'nutrition'] };
}

/** Güncel insan onaylı kayıt; depo hazır değilse veya okunamazsa null (lookup düşmez). */
function currentVerifiedOrNull(barcode: string): VerifiedLabelProduct | null {
  if (!isLabelStoreDbReady()) return null;
  try {
    return getCurrentVerified(barcode);
  } catch {
    return null;
  }
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Onaylı kaydın zaten karşıladığı fotoğraf bölümlerini listeden çıkarır.
 * Yalnız ONAYLI kayda bakılır; aday kayıtlar hiçbir fotoğrafı "gereksiz" yapmaz.
 *   - içindekiler: onaylı içindekiler metni varsa
 *   - besin tablosu: birimi ve Nutri-Score'un zorunlu değerleri (enerji,
 *     şeker, doymuş yağ, tuz) okunmuşsa
 *   - ön yüz: onaylı kayıtta ön yüz FOTOĞRAFI varsa (ürün adı tek başına
 *     fotoğraf kanıtının yerine geçmez — sözleşme incelemesi bulgusu A4)
 */
function withoutSlotsCoveredByVerified(
  slots: IntakePhotoSlot[],
  verified: VerifiedLabelProduct | null,
): IntakePhotoSlot[] {
  if (!verified) return slots;
  const { fields } = verified;
  const nutrition = fields.nutritionPer100;
  const covered = new Set<IntakePhotoSlot>();

  if (hasText(fields.ingredientsText)) covered.add('ingredients');
  if (
    nutrition &&
    nutrition.basis !== null &&
    [nutrition.energyKcal, nutrition.sugars, nutrition.saturatedFat, nutrition.salt].every((value) => value !== null)
  ) {
    covered.add('nutrition');
  }
  if (verified.photos.some((photo) => photo.slot === 'front')) covered.add('front');

  return slots.filter((slot) => !covered.has(slot));
}
