/**
 * RafSkoru — Yerel ürün kurtarma tipleri.
 * src/localProduct/types.ts
 *
 * Backend `ProductFacts` kanonik kaynaktır; burada yalnız ekran projeksiyonu ve
 * katkı taslağı tipleri tanımlanır. Skor veya alerjen mantığı üretilmez.
 * Sözleşme tipleri `src/contracts/generated.ts`'ten alınır; kopyalanmaz.
 */

import type {
  AllergenDeclaration,
  AllergenDataState,
  PackagingPhotoKind,
  ProductFactField,
  UsabilityCapabilities,
} from '../contracts/generated';
import type { ProductFacts } from '../price/types';

/**
 * Backend `ProductFacts` sözleşmesinde opsiyonel ve geriye uyumlu olan alanlar.
 * Mobil `price/types.ts` korumalı bölgedir; burada yalnız okuma amaçlı genişletme yapılır.
 */
export type ProductFactsWire = ProductFacts & {
  completeness?: 'complete' | 'partial' | 'insufficient';
  capabilities?: UsabilityCapabilities;
};

/** Ürün sonuç ekranındaki üç veri durumu (+ yükleniyor). */
export type ProductDataState = 'loading' | 'usable' | 'partial' | 'not_found';

export interface ProductFieldPresence {
  field: ProductFactField;
  label: string;
  present: boolean;
}

export interface ProductDataView {
  state: ProductDataState;
  /** Kullanıcıya gösterilen kaynak metni ("Open Food Facts", "Kayıt yok"). */
  sourceLabel: string;
  fields: ProductFieldPresence[];
  missingLabels: string[];
  capabilities: UsabilityCapabilities;
  /** Ürün düzeyi alerjen beyanı; kullanıcı kaynaklı beyan hiçbir zaman `readable` olmaz. */
  allergenDeclaration: AllergenDeclaration;
  /** Kısa kullanıcı açıklaması; teknik terim içermez. */
  summary: string;
}

/** Paket çekim adımları — sözleşmedeki `PackagingPhotoKind` alt kümesi ('other' hariç). */
export type PackageCaptureStepKind = Exclude<PackagingPhotoKind, 'other'>;

export interface PackageCaptureStep {
  kind: PackageCaptureStepKind;
  title: string;
  /** Neden gerekli — kısa Türkçe açıklama. */
  why: string;
  /** Atlanırsa ne olur — kullanıcıya görünür sonuç. */
  skipConsequence: string;
  /** Atlanamaz adım (barkod). */
  required: boolean;
}

export interface CapturedPhoto {
  kind: PackageCaptureStepKind;
  /** Cihazdaki geçici dosya; sözleşmeye taşınmaz, yalnız yerel taslakta tutulur. */
  localUri: string;
  takenAt: string;
}

export type OcrCandidateEntryMethod = 'none' | 'manual' | 'fixture';

/**
 * OCR sınırı: bu sürümde OCR entegrasyonu YOK. Aday metin ya kullanıcı tarafından
 * ambalajdan elle yazılır (`manual`) ya da geliştirme fixture'ından gelir (`fixture`).
 * Hiçbir aday doğrulanmış içerik veya alerjen gerçeği sayılmaz.
 */
export interface OcrCandidate {
  field: DraftTextField;
  text: string | null;
  entryMethod: OcrCandidateEntryMethod;
  isFixture: boolean;
  source: 'user_ocr';
  verified: false;
}

export type DraftTextField = Extract<
  ProductFactField,
  'productName' | 'ingredientsText' | 'allergenDeclaration' | 'nutrition' | 'netQuantity'
>;

export interface ContributionDraftSubmission {
  status: 'not_submitted';
  boundary: 'no_upload_in_this_build';
  nextTask: 'human_verification';
}

/**
 * Katkı taslağı: aday veri. Doğrulanmış ürüne dönüşmez; skorlara ve alerjen kararına girmez.
 * Kişisel profil, konum veya kimlik taşımaz.
 */
export interface ContributionDraft {
  id: string;
  status: 'candidate';
  gtin: string | null;
  createdAt: string;
  /** İlk fotoğrafın çekim zamanı = gözlem zamanı. */
  observedAt: string | null;
  packagingVersion: string | null;
  photos: CapturedPhoto[];
  skippedSteps: PackageCaptureStepKind[];
  candidates: OcrCandidate[];
  allergenDeclaration: AllergenDeclaration;
  allergenState: AllergenDataState;
  missingFields: ProductFactField[];
  submission: ContributionDraftSubmission;
}
