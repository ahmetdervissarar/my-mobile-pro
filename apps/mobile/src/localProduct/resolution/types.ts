/**
 * RafSkoru — Ürün içerik çözümleme sözleşmeleri (Aşama 6, ADR-005).
 * src/localProduct/resolution/types.ts
 *
 * Kaynak merdivenindeki her kaynak bir ADAY üretir; adaylar alan alan kanıt (`FieldEvidence`) taşır.
 * Tek bir ürün-geneli güven değeri YOKTUR (product-data-provenance: güven alan bazındadır).
 * Kimlik: aynı GTIN → güçlü eşleşme; farklı GTIN asla birleştirilmez; barkodsuz eşleşme yalnız
 * aday olabilir. OCR/elle giriş yalnız `user_ocr` kaynaklı, `verified=false` kanıttır.
 * Sözleşme tipleri `src/contracts/generated.ts`'ten alınır; kopyalanmaz.
 */

import type {
  AllergenDeclaration,
  ConflictResolutionRule,
  ConflictState,
  FieldSource,
  FieldSourceMap,
  ProductFactField,
  ProductFactValueMap,
  SourceKind,
} from '../../contracts/generated';

export type ResolutionProviderId = 'off' | 'verified_local' | 'contribution_draft' | 'manufacturer_official';

/**
 * - exact_gtin: sorgulanan GTIN ile kaynağın GTIN'i (14 haneye normalize) birebir aynı.
 * - candidate_no_gtin: yalnız marka + normalize ad + varyant + net miktar ile bulunmuş ADAY;
 *   otomatik doğrulanmış ürün olamaz ve alan birleştirmesine GİRMEZ.
 * - none: kimlik eşleşmesi yok.
 */
export type MatchLevel = 'exact_gtin' | 'candidate_no_gtin' | 'none';

export type FieldEntryMethod = 'structured' | 'manual' | 'ocr' | 'fixture' | 'human_review';

/** Serbest metin taşıyabilen alanlar; yapılandırılmış değeri olmayan aday metin `rawText`'te kalır. */
export type StringValuedField = Extract<ProductFactField, 'productName' | 'brand' | 'imageUrl' | 'ingredientsText'>;

export interface FieldEvidenceOf<K extends ProductFactField> {
  /** evidenceId — köken kaydı bu kimliğe bağlanır. */
  id: string;
  field: K;
  /** Yapılandırılmış değer (OFF etiketi, doğrulanmış beyan). OCR/elle giriş çoğu alanda null bırakır. */
  structuredValue: ProductFactValueMap[K] | null;
  /** Ham aday metin (OCR/elle giriş). Alerjen ve içerik gerçeği sayılmaz; yalnız adaydır. */
  rawText: string | null;
  source: FieldSource;
  candidateId: string;
  entryMethod: FieldEntryMethod;
  isFixture: boolean;
  /** Yalnız `source.source === 'rafskoru_verified'` iken true; başka hiçbir yol true yapamaz. */
  verified: boolean;
  /** Düzeltme sonrası bu kanıtın yerini alan kanıt; kayıt silinmez, geçmiş korunur. */
  supersededByEvidenceId: string | null;
}

export type FieldEvidence = { [K in ProductFactField]: FieldEvidenceOf<K> }[ProductFactField];

export interface CandidateIdentity {
  gtin: string | null;
  productName: string | null;
  brand: string | null;
  variant: string | null;
  netQuantityText: string | null;
}

export interface ResolutionCandidate {
  id: string;
  providerId: ResolutionProviderId;
  sourceKind: SourceKind;
  matchLevel: MatchLevel;
  identity: CandidateIdentity;
  /** Normalize kimlik anahtarı (marka+ad+varyant+miktar); barkodsuz adaylar için. Eşleşme iddiası değildir. */
  identityKey: string | null;
  /** Ambalaj kanıtı kimlikleri (fotoğraf). Dosya yolu sözleşmede taşınmaz. */
  packagingEvidenceIds: readonly string[];
  fields: readonly FieldEvidence[];
  reference: string | null;
  fetchedAt: string | null;
  sourceModifiedAt: string | null;
  /** Gerçek gözlem (ambalaj fotoğrafı zamanı). OFF için null: `last_modified_t` gözlem değildir. */
  observedAt: string | null;
  isSynthetic: boolean;
  /** Kaynağın kendi tamlık beyanı (OFF `completeness`); ürün-geneli güven değeri DEĞİLDİR. */
  sourceCompleteness: 'complete' | 'partial' | 'insufficient' | null;
}

export type ProviderStatus = 'ok' | 'not_found' | 'unavailable' | 'not_implemented' | 'skipped';

export interface ProviderResult {
  providerId: ResolutionProviderId;
  status: ProviderStatus;
  candidates: readonly ResolutionCandidate[];
  /** Neden bulunamadı / neden atlandı — kullanıcıya ve rapora görünür; veri uydurulmaz. */
  reason: string | null;
}

export interface ResolutionQuery {
  gtin: string | null;
  identityHint: Partial<CandidateIdentity> | null;
}

export interface ResolutionProvider {
  id: ResolutionProviderId;
  sourceKind: SourceKind;
  resolve(query: ResolutionQuery): Promise<ProviderResult>;
}

export interface MergedFieldDisplayHint {
  evidenceId: string;
  reason: 'newer_packaging_observation';
}

export interface MergedFieldOf<K extends ProductFactField> {
  field: K;
  /** Seçilmiş yapılandırılmış değer; çatışma çözülmemişse mevcut (yapılandırılmış) değer korunur veya null. */
  value: ProductFactValueMap[K] | null;
  /** Yapılandırılmış değeri olmayan aday metin (OCR/elle); doğrulanmamış. */
  candidateText: string | null;
  selectedEvidenceId: string | null;
  selectedSource: FieldSource | null;
  evidence: readonly FieldEvidence[];
  conflict: ConflictState;
  resolutionRule: ConflictResolutionRule | null;
  /** Çatışmada daha güncel ambalaj kanıtı GÖSTERİLİR ama insan kararı olmadan üzerine yazmaz. */
  displayHint: MergedFieldDisplayHint | null;
}

export type MergedFields = { [K in ProductFactField]: MergedFieldOf<K> };

export interface FieldConflict {
  field: ProductFactField;
  state: Exclude<ConflictState, 'none'>;
  rule: ConflictResolutionRule | null;
  evidenceIds: readonly string[];
  /** Görüntülenmesi önerilen kanıt (ör. güncel ambalaj); seçim değildir. */
  preferredEvidenceId: string | null;
  note: string;
}

export interface MergedProductRecord {
  gtin: string | null;
  matchLevel: MatchLevel;
  fields: MergedFields;
  fieldSources: FieldSourceMap<ProductFactField>;
  conflicts: readonly FieldConflict[];
  missingFields: readonly ProductFactField[];
  hasUnresolvedConflict: boolean;
  /** Birleştirmeye alınmayan adaylar (barkodsuz aday, farklı GTIN) — görünür kalır, gizlenmez. */
  excludedCandidateIds: readonly string[];
  /** Yalnız okunabilir kaynaktan (off/rafskoru_verified/manufacturer). user_ocr beyanı okunabilir yapamaz. */
  allergenDeclaration: AllergenDeclaration;
  /** OCR/elle alerjen aday metni; beyana DÖNÜŞMEZ, ayrı gösterilir. */
  allergenCandidateText: string | null;
}

export type ResolutionUiState =
  | 'searching_sources'
  | 'off_partial'
  | 'exact_gtin_match'
  | 'multiple_candidates'
  | 'official_source_conflict'
  | 'packaging_photo_needed'
  | 'ocr_candidate_pending_review'
  | 'field_unreadable'
  | 'local_candidate_saved'
  | 'data_still_insufficient';

export interface ProductResolutionAttempt {
  id: string;
  gtin: string | null;
  startedAt: string;
  completedAt: string;
  providerResults: readonly ProviderResult[];
  candidates: readonly ResolutionCandidate[];
  merged: MergedProductRecord;
  uiState: ResolutionUiState;
}

export type HumanFieldDecision = 'confirmed' | 'corrected' | 'unreadable';

export interface HumanFieldCheck {
  field: ProductFactField;
  decision: HumanFieldDecision;
  candidateEvidenceId: string | null;
  candidateText: string | null;
  /** `corrected` için düzeltilmiş metin; `confirmed` için aday metnin aynısı; `unreadable` için null. */
  reviewedText: string | null;
  photoEvidenceId: string | null;
  checkedAt: string;
  /** Kontrol sonucu üretilen kanıt (confirmed/corrected). unreadable → null. */
  resultingEvidenceId: string | null;
}

/**
 * Cihazda insan tarafından alan alan incelenmiş ADAY kayıt. `rafskoru_verified` DEĞİLDİR ve hiçbir
 * yolla ona dönüşmez; skorlara ve alerjen kararına girmez. Alerjen durumu daima `unknown_or_unverified`.
 */
export interface LocallyReviewedRecord {
  id: string;
  status: 'locally_reviewed_candidate';
  gtin: string;
  draftId: string;
  checks: readonly HumanFieldCheck[];
  /** Tüm kanıtlar — düzeltmede eski kanıt silinmez, `supersededByEvidenceId` ile bağlanır. */
  evidence: readonly FieldEvidence[];
  allergenDeclaration: AllergenDeclaration;
  allergenState: 'unknown_or_unverified';
  createdAt: string;
  boundary: { notVerified: 'not_rafskoru_verified'; nextTask: 'rafskoru_verification'; upload: 'no_upload_in_this_build' };
}
