/**
 * RafSkoru — Etiket onay ekranının saf kuralları (ADR-009 §3, İş 1.5a)
 * apps/backend/src/labelStore/review.ts
 *
 * Bu modül yeni karar ÜRETMEZ; onaylayana gösterilecek uyarıları adayın
 * kendi verisinden çıkarır ve onay/ret isteklerini denetler. Veritabanına
 * ve ağa dokunmaz (bkz. reviewRoutes.ts).
 *
 * Uyarılar yalnız hatırlatmadır: hiçbiri bir alanı değiştirmez, alerjen
 * değerlendirmesi veya puan üretmez. Alerjen kuralı gevşetilmez: içindekiler
 * okunmamışsa alerjen/eser ifadesi tek başına alerjen bilgisi sayılmaz.
 */
import { LabelStoreValidationError } from './db.js';
import { assertFieldsBackedByPhotos } from './importReads.js';
import type { LabelCandidate, LabelFields, LabelPhotoSlot, LabelProductKind, LabelRead } from './types.js';

export type LabelReviewFlagCode =
  | 'reads_differ'
  | 'nutrition_without_nutrition_photo'
  | 'statements_without_ingredients'
  | 'manufacturer_free_from_claim'
  | 'ingredients_may_be_incomplete'
  | 'reader_notes';

export interface LabelReviewFlag {
  code: LabelReviewFlagCode;
  message: string;
}

/** Onaylayanın seçebileceği ürün türleri; null = bilinmiyor (Nutri-Score hesaplanmaz). */
export const LABEL_REVIEW_PRODUCT_KINDS: readonly { key: LabelProductKind | null; label: string }[] = [
  { key: 'general', label: 'Genel gıda' },
  { key: 'beverage', label: 'İçecek (alkolsüz)' },
  { key: 'water', label: 'Su' },
  { key: 'cheese', label: 'Peynir' },
  { key: 'fat_oil_nuts_seeds', label: 'Yağ, kuruyemiş, tohum' },
  { key: 'red_meat', label: 'Kırmızı et ürünü' },
  { key: 'not_applicable', label: 'Nutri-Score uygulanmaz (ör. baharat, çay, kahve)' },
  { key: 'alcoholic_beverage', label: 'Alkollü içecek (puanlanmaz)' },
  { key: null, label: 'Bilinmiyor' },
];

export const LABEL_REJECT_REASONS = [
  { key: 'not_food', label: 'Gıda değil' },
  { key: 'wrong_photo', label: 'Yanlış veya etiketsiz fotoğraf' },
  { key: 'unreadable', label: 'Etiket okunamıyor' },
  { key: 'duplicate', label: 'Aynı ürünün başka adayı var' },
  { key: 'other', label: 'Başka bir neden' },
] as const;

export type LabelRejectReasonCode = (typeof LABEL_REJECT_REASONS)[number]['key'];

const APPROVER_MAX_LENGTH = 60;
const REJECT_NOTE_MAX_LENGTH = 500;

// "… içermez", "glutensiz" gibi ifadeler üreticinin beyanıdır; RafSkoru'nun
// iddiası olarak gösterilmez (CLAUDE.md iddia sınırı).
const FREE_FROM_PATTERN = /içermez|içermemektedir|bulunmaz|bulunmamaktadır|yoktur|glutensiz|glütensiz|\bfree\b/;

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function reads(candidate: LabelCandidate): LabelRead[] {
  return [candidate.extractRead, candidate.verifyRead].filter((read): read is LabelRead => read !== null);
}

/** Onaylayana gösterilecek uyarılar; adayın verisini değiştirmez. */
export function labelReviewFlags(candidate: LabelCandidate): LabelReviewFlag[] {
  const flags: LabelReviewFlag[] = [];
  const all = reads(candidate);
  const slots = new Set(candidate.photos.map((photo) => photo.slot));

  if (candidate.status === 'disagreed' && (candidate.differingFields?.length ?? 0) > 0) {
    flags.push({
      code: 'reads_differ',
      message: `İki okuma şu alanlarda ayrıştı: ${candidate.differingFields!.join(', ')}. Fotoğrafa bakıp doğrusunu girin.`,
    });
  }

  if (!slots.has('nutrition') && all.some((read) => read.fields.nutritionPer100 !== null)) {
    flags.push({
      code: 'nutrition_without_nutrition_photo',
      message: 'Besin değerleri içindekiler fotoğrafından okundu (ayrı besin tablosu fotoğrafı yok). Satırları fotoğrafla tek tek karşılaştırın.',
    });
  }

  if (
    all.some(
      (read) =>
        !hasText(read.fields.ingredientsText) &&
        (hasText(read.fields.allergenStatementText) || hasText(read.fields.traceStatementText)),
    )
  ) {
    flags.push({
      code: 'statements_without_ingredients',
      message:
        'İçindekiler okunamadı ama alerjen/eser ifadesi okundu. İçindekiler olmadan alerjen bilgisi verilmez; bu ifade tek başına alerjen değerlendirmesine girmez.',
    });
  }

  const claimFields = ['ingredientsText', 'allergenStatementText', 'traceStatementText'] as const;
  if (
    all.some((read) =>
      claimFields.some((key) => hasText(read.fields[key]) && FREE_FROM_PATTERN.test(read.fields[key]!.toLocaleLowerCase('tr-TR'))),
    )
  ) {
    flags.push({
      code: 'manufacturer_free_from_claim',
      message:
        '"… içermez" / "glutensiz" gibi bir ifade var. Bu üreticinin beyanıdır; RafSkoru bunu kendi iddiası olarak göstermez.',
    });
  }

  if (all.some((read) => hasText(read.fields.ingredientsText) && /(,|…|\.\.\.)\s*$/.test(read.fields.ingredientsText!))) {
    flags.push({
      code: 'ingredients_may_be_incomplete',
      message: 'İçindekiler listesi virgül veya üç noktayla bitiyor; liste eksik olabilir. Fotoğrafta devamı olup olmadığına bakın.',
    });
  }

  if (all.some((read) => hasText(read.notes))) {
    flags.push({ code: 'reader_notes', message: 'Okuyucuların notları var; onaydan önce okuyun.' });
  }

  return flags;
}

export interface ParsedApproveRequest {
  approvedBy: string;
  fields: LabelFields;
  productKind: LabelProductKind | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePerson(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new LabelStoreValidationError(`${fieldName} boş olamaz.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > APPROVER_MAX_LENGTH) {
    throw new LabelStoreValidationError(`${fieldName} en fazla ${APPROVER_MAX_LENGTH} karakter olabilir.`);
  }
  return trimmed;
}

/**
 * Onay isteği kuralları (depo kurallarına EK):
 *   - alanlar her zaman açıkça gönderilir (ekran ne gösterdiyse o onaylanır)
 *   - ürün türü açıkça seçilir; "bilinmiyor" (null) da bir seçimdir
 *   - içindekiler doluysa onaylayan fotoğrafla karşılaştırdığını işaretler
 *   - alanlar fotoğraflarla desteklenmelidir (içe aktarma kuralının aynısı)
 * Alanların biçim denetimi depoda (approveCandidate) yapılır.
 */
export function parseApproveRequest(body: unknown, candidate: LabelCandidate): ParsedApproveRequest {
  if (!isPlainObject(body)) throw new LabelStoreValidationError('İstek gövdesi nesne olmalı.');

  const approvedBy = parsePerson(body.approvedBy, 'Onaylayan');

  if (!isPlainObject(body.fields)) throw new LabelStoreValidationError('Onaylanacak alanlar gönderilmeli.');
  const fields = body.fields as unknown as LabelFields;

  if (!('productKind' in body)) throw new LabelStoreValidationError('Ürün türü seçilmeli ("Bilinmiyor" da seçilebilir).');
  const productKind = body.productKind as LabelProductKind | null;
  if (!LABEL_REVIEW_PRODUCT_KINDS.some((kind) => kind.key === productKind)) {
    throw new LabelStoreValidationError('Ürün türü geçersiz.');
  }

  if (hasText(fields.ingredientsText) && body.ingredientsChecked !== true) {
    throw new LabelStoreValidationError('İçindekiler fotoğrafla karşılaştırıldı olarak işaretlenmeli.');
  }

  const slots = new Set<LabelPhotoSlot>(candidate.photos.map((photo) => photo.slot));
  assertFieldsBackedByPhotos(fields, slots, 'Onay');

  return { approvedBy, fields, productKind };
}

export interface ParsedRejectRequest {
  rejectedBy: string;
  reason: string;
}

/** Ret: sabit bir neden seçilir; "başka bir neden" için açıklama zorunludur. */
export function parseRejectRequest(body: unknown): ParsedRejectRequest {
  if (!isPlainObject(body)) throw new LabelStoreValidationError('İstek gövdesi nesne olmalı.');

  const rejectedBy = parsePerson(body.rejectedBy, 'Reddeden');
  const reason = LABEL_REJECT_REASONS.find((item) => item.key === body.reasonCode);
  if (!reason) throw new LabelStoreValidationError('Ret nedeni seçilmeli.');

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (note.length > REJECT_NOTE_MAX_LENGTH) {
    throw new LabelStoreValidationError(`Açıklama en fazla ${REJECT_NOTE_MAX_LENGTH} karakter olabilir.`);
  }
  if (reason.key === 'other' && note.length === 0) {
    throw new LabelStoreValidationError('"Başka bir neden" için açıklama yazılmalı.');
  }

  return { rejectedBy, reason: `${reason.key}: ${reason.label}${note ? ` — ${note}` : ''}` };
}
