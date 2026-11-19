/**
 * RafSkoru — Etiket okumalarının depoya aday olarak alınması (ADR-009 §3, İş 1.4)
 * apps/backend/src/labelStore/importReads.ts
 *
 * Girdi: bir ürün için fotoğraflar + iki BAĞIMSIZ okuma (çıkarım ve doğrulama).
 * Çıktı: 'agreed' veya 'disagreed' durumunda bir aday kayıt. Onay bu modülün
 * işi DEĞİLDİR; aday, insan onaylayana kadar hiçbir ekrana ulaşmaz.
 *
 * Ek korumalar (okuyucu kurallarının kodla denetlenmesi):
 *   - besin değeri yalnız besin tablosu VEYA içindekiler fotoğrafı varsa kabul
 *     edilir (İş 1.5a, proje sahibi kararı 2026-11-19: tablo çoğu ambalajda
 *     içindekilerle aynı yüzde; onay ekranı bu durumu ayrıca işaretler ve
 *     onaylayan fotoğrafla karşılaştırır). Yalnız ön yüz fotoğrafıyla besin
 *     değeri kabul edilmez.
 *   - içindekiler fotoğrafı yoksa içindekiler, alerjen ve eser ifadesi kabul edilmez
 *   - aynı barkod için aynı fotoğraf kümesi ikinci kez içe aktarılmaz
 *   - bütün yazımlar tek işlemdedir; hata olursa yarım aday kalmaz
 */
import { compareLabelReads } from './compareReads.js';
import {
  createCandidate,
  listCandidatesForBarcode,
  LabelStoreValidationError,
  recordExtraction,
  recordVerification,
  runInLabelStoreTransaction,
  validateLabelRead,
} from './db.js';
import type {
  LabelCandidate,
  LabelFields,
  LabelPhotoRef,
  LabelPhotoSlot,
  LabelPhotoSource,
  LabelProductKind,
  LabelRead,
} from './types.js';

export interface LabelReadImport {
  barcode: string;
  photoSource: LabelPhotoSource;
  photos: LabelPhotoRef[];
  observedAt: string;
  declaredProductKind?: LabelProductKind | null;
  extractRead: LabelRead;
  verifyRead: LabelRead;
}

export type LabelReadImportResult =
  | { status: 'imported'; candidate: LabelCandidate }
  | { status: 'duplicate'; candidate: LabelCandidate };

const INGREDIENT_SLOT_FIELDS = ['ingredientsText', 'allergenStatementText', 'traceStatementText'] as const;

function photoSetKey(photos: { slot: string; ref: string }[]): string {
  return photos
    .map((photo) => `${photo.slot}|${photo.ref.trim()}`)
    .sort()
    .join('\n');
}

/** Bir okuma, fotoğrafı çekilmemiş bir bölümden değer taşıyorsa reddeder. */
function assertReadBackedByPhotos(read: LabelRead, slots: Set<LabelPhotoSlot>, label: string): void {
  assertFieldsBackedByPhotos(read?.fields, slots, label);
}

/**
 * Alanlar, fotoğrafı çekilmemiş bir bölümden değer taşıyorsa reddeder.
 * İçe aktarma ve onay (onaylayanın düzelttiği alanlar) aynı kuralı kullanır.
 */
export function assertFieldsBackedByPhotos(
  fields: Partial<LabelFields> | undefined,
  slots: Set<LabelPhotoSlot>,
  label: string,
): void {
  if (!fields || typeof fields !== 'object') return; // biçim denetimi depoda yapılır

  if (!slots.has('nutrition') && !slots.has('ingredients') && fields.nutritionPer100 != null) {
    throw new LabelStoreValidationError(
      `${label}: besin tablosu veya içindekiler fotoğrafı yokken besin değeri var.`,
    );
  }
  if (!slots.has('ingredients')) {
    for (const key of INGREDIENT_SLOT_FIELDS) {
      if (fields[key] != null) {
        throw new LabelStoreValidationError(`${label}: içindekiler fotoğrafı yokken ${key} var.`);
      }
    }
  }
}

export function importLabelReads(input: LabelReadImport): LabelReadImportResult {
  if (!input || typeof input !== 'object') throw new LabelStoreValidationError('Girdi nesne olmalı.');
  if (!Array.isArray(input.photos)) throw new LabelStoreValidationError('photos liste olmalı.');

  const slots = new Set(input.photos.map((photo) => photo?.slot as LabelPhotoSlot));
  assertReadBackedByPhotos(input.extractRead, slots, 'Çıkarım okuması');
  assertReadBackedByPhotos(input.verifyRead, slots, 'Doğrulama okuması');

  const key = photoSetKey(input.photos.filter((photo) => photo && typeof photo.ref === 'string'));
  if (typeof input.barcode === 'string') {
    const existing = listCandidatesForBarcode(input.barcode).find((candidate) => photoSetKey(candidate.photos) === key);
    if (existing) return { status: 'duplicate', candidate: existing };
  }

  // İki okuma da depo kurallarıyla önce denetlenir; karşılaştırma temizlenmiş
  // hâller üzerinden yapılır.
  const extractRead = validateLabelRead(input.extractRead);
  const verifyRead = validateLabelRead(input.verifyRead);
  const differingFields = compareLabelReads(extractRead, verifyRead);

  const candidate = runInLabelStoreTransaction(() => {
    const created = createCandidate({
      barcode: input.barcode,
      photoSource: input.photoSource,
      photos: input.photos,
      observedAt: input.observedAt,
      declaredProductKind: input.declaredProductKind ?? null,
    });
    recordExtraction(created.id, extractRead);
    return recordVerification(created.id, verifyRead, differingFields);
  });

  return { status: 'imported', candidate };
}
