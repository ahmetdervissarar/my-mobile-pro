/**
 * RafSkoru — Katkı taslağı oluşturma ve yerel saklama.
 * src/localProduct/contributionDraft.ts
 *
 * Taslak `candidate` durumundadır; doğrulanmış ürüne dönüşmez, skorlara ve alerjen
 * kararına girmez. Saf mantık: I/O yok (saklama `contributionDraftStorage.ts`).
 * Kişisel profil, konum veya kimlik yazılmaz.
 */

import type { AllergenDeclaration, ProductFactField } from '../contracts/generated';
import type {
  CapturedPhoto,
  ContributionDraft,
  DraftTextField,
  OcrCandidate,
  PackageCaptureStep,
  PackageCaptureStepKind,
} from './types';

/**
 * Çekim sırasında fotoğraf yalnız geçici önbellek dosyasıdır (`expo-camera` cache URI'si). Taslak
 * kaydedilirken `photoStorage.ts` (`expo-file-system`, Aşama 6B onaylı bağımlılık) dosyayı uygulamanın
 * belge klasörüne kopyalar; kopyalama başarısızsa taslak "kaydedildi" sayılmaz.
 */
export const PHOTO_TEMPORARY_STORAGE_NOTICE =
  'Çekilen fotoğraf şimdilik geçici önbellek dosyasıdır; taslağı kaydettiğinde bu cihazdaki RafSkoru klasörüne kopyalanır.';

export const PHOTO_PERSISTENT_STORAGE_NOTICE =
  'Fotoğraflar uygulamanın özel depolama alanında saklanır; uygulama tarafından sunucuya, galeriye veya başka bir servise gönderilmez. "Taslağı ve fotoğrafları sil" ile kaldırılır.';

export function hasPersistentPhotos(photos: readonly CapturedPhoto[]): boolean {
  return photos.length > 0 && photos.every((p) => p.storage === 'persistent' && Boolean(p.persistentUri));
}

export const PACKAGE_CAPTURE_STEPS: readonly PackageCaptureStep[] = [
  {
    kind: 'front',
    title: 'Ön yüz',
    why: 'Ürün adı ve markanın hangi ürüne ait olduğunu doğrulamak için.',
    skipConsequence: 'Ürün adı doğrulanamaz; taslak barkodla eşleşir ama adı "eksik" kalır.',
    required: false,
  },
  {
    kind: 'barcode',
    title: 'Barkod',
    why: 'Kayıt yalnız barkodla (GTIN) eşleşir. Ad veya kategoriden eşleştirme yapılmaz.',
    skipConsequence: 'Barkod olmadan taslak oluşturulamaz.',
    required: true,
  },
  {
    kind: 'ingredients',
    title: 'İçindekiler',
    why: 'İçerik listesi, alerjen beyanı ve katkı maddeleri bu bölümden okunur.',
    skipConsequence: 'İçindekiler "eksik" kalır; içerik değerlendirmesi yapılamaz.',
    required: false,
  },
  {
    kind: 'allergen',
    title: 'Alerjen beyanı / "içerebilir"',
    why: '"İçerir" ve "içerebilir" ifadeleri ayrı ayrı kaydedilir. Bu bölüm okunamazsa alerjen durumu "doğrulanmamış" kalır.',
    skipConsequence: 'Alerjen durumu "veri yok / doğrulanmamış" olur. Bu, ürünün alerjen içermediği anlamına gelmez.',
    required: false,
  },
  {
    kind: 'nutrition',
    title: 'Besin tablosu',
    why: '100 g/ml başına şeker, tuz ve yağ değerleri sağlık göstergeleri için gerekir.',
    skipConsequence: 'Besin değerleri "eksik" kalır; sağlık göstergesi kısmi veya boş olur.',
    required: false,
  },
  {
    kind: 'quantity',
    title: 'Net miktar',
    why: 'Birim fiyat ve porsiyon karşılaştırması için ambalaj miktarı gerekir.',
    skipConsequence: 'Net miktar "eksik" kalır; birim karşılaştırması yapılamaz.',
    required: false,
  },
];

export const DRAFT_TEXT_FIELDS: readonly { field: DraftTextField; label: string; step: PackageCaptureStepKind }[] = [
  { field: 'productName', label: 'Ürün adı (ön yüzden)', step: 'front' },
  { field: 'ingredientsText', label: 'İçindekiler metni', step: 'ingredients' },
  { field: 'allergenDeclaration', label: 'Alerjen beyanı metni ("içerir" / "içerebilir")', step: 'allergen' },
  { field: 'nutrition', label: 'Besin tablosu (100 g/ml)', step: 'nutrition' },
  { field: 'netQuantity', label: 'Net miktar (ör. 500 g)', step: 'quantity' },
];

export interface CreateContributionDraftInput {
  gtin: string | null;
  photos: CapturedPhoto[];
  skippedSteps: PackageCaptureStepKind[];
  candidates: OcrCandidate[];
  packagingVersion: string | null;
  now: string;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Kullanıcı kaynaklı alerjen beyanı hiçbir zaman `readable` olmaz (sözleşme:
 * `ReadableDeclarationSourceKind` yalnız off/rafskoru_verified/manufacturer).
 * Metin girildiyse `unreadable` (aday var, doğrulanmadı); girilmediyse `absent`.
 * Her iki durumda alerjen durumu `unknown_or_unverified`dir.
 */
export function toDraftAllergenDeclaration(
  allergenCandidate: OcrCandidate | undefined,
  observedAt: string | null,
): AllergenDeclaration {
  if (allergenCandidate && hasText(allergenCandidate.text)) {
    return {
      status: 'unreadable',
      declaredTags: [],
      traceTags: [],
      source: { source: 'user_ocr', confidence: 'low', observedAt, isSynthetic: allergenCandidate.isFixture },
    };
  }
  return { status: 'absent', declaredTags: [], traceTags: [], source: null };
}

/** Taslak kimliği = barkod + zaman; fotoğraf klasörü adı da bundan türer (profil/konum/kimlik içermez). */
export function contributionDraftId(gtin: string | null, now: string): string {
  return `draft-${gtin ?? 'nogtin'}-${now}`;
}

export function createContributionDraft(input: CreateContributionDraftInput): ContributionDraft {
  const observedAt = input.photos.length > 0 ? input.photos[0].takenAt : null;
  const candidateByField = new Map(input.candidates.map((c) => [c.field, c] as const));
  const allergenDeclaration = toDraftAllergenDeclaration(candidateByField.get('allergenDeclaration'), observedAt);

  const missingFields: ProductFactField[] = [];
  for (const { field } of DRAFT_TEXT_FIELDS) {
    if (!hasText(candidateByField.get(field)?.text)) missingFields.push(field);
  }
  if (!input.photos.some((p) => p.kind === 'front')) missingFields.push('imageUrl');

  return {
    id: contributionDraftId(input.gtin, input.now),
    status: 'candidate',
    gtin: input.gtin,
    createdAt: input.now,
    observedAt,
    packagingVersion: hasText(input.packagingVersion) ? input.packagingVersion!.trim() : null,
    photos: input.photos,
    skippedSteps: input.skippedSteps,
    candidates: input.candidates,
    allergenDeclaration,
    allergenState: 'unknown_or_unverified',
    missingFields,
    submission: { status: 'not_submitted', boundary: 'no_upload_in_this_build', nextTask: 'human_verification' },
  };
}

/** Kullanıcıya gösterilen taslak özeti; teknik alan adları yerine Türkçe etiketler. */
export function summarizeContributionDraft(draft: ContributionDraft): string[] {
  const lines: string[] = [];
  lines.push(`Durum: aday kayıt (doğrulanmadı). Skorlara ve alerjen kararına girmez.`);
  lines.push(`Barkod: ${draft.gtin ?? 'yok'}`);
  lines.push(`Fotoğraf: ${draft.photos.length} · Atlanan adım: ${draft.skippedSteps.length}`);
  if (draft.photos.length > 0) lines.push(hasPersistentPhotos(draft.photos) ? PHOTO_PERSISTENT_STORAGE_NOTICE : PHOTO_TEMPORARY_STORAGE_NOTICE);
  lines.push(`Gözlem zamanı: ${draft.observedAt ?? 'yok'}`);
  lines.push(`Ambalaj sürümü: ${draft.packagingVersion ?? 'belirtilmedi'}`);
  lines.push('Alerjen durumu: veri yok / doğrulanmamış. Bu bir garanti değildir; etiketi kontrol edin.');
  if (draft.candidates.some((c) => c.isFixture)) {
    lines.push('Uyarı: bazı alanlar GELİŞTİRME FIXTURE metnidir; gerçek ambalaj verisi değildir.');
  }
  lines.push('Gönderim: bu sürümde kapalı. Sonraki adım insan doğrulaması.');
  return lines;
}
