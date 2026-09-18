/**
 * RafSkoru — Çözümleme ekran durumu türetimi ve kullanıcı metinleri (salt projeksiyon, G3).
 * src/localProduct/resolution/uiState.ts
 *
 * On durumun her biri ayrı görünür; renk tek anlam taşıyıcısı değildir (ikon + metin).
 * Metinler ihtiyat dilindedir (E4/P5): "aday", "doğrulanmamış", "veri yok", "etiketi kontrol edin".
 */

import type { LocallyReviewedRecord, ProductResolutionAttempt, ResolutionUiState } from './types';

export interface DeriveUiStateInput {
  attempt: ProductResolutionAttempt | null;
  isSearching: boolean;
  hasPackagingPhotos: boolean;
  review: LocallyReviewedRecord | null;
}

export function deriveResolutionUiState(input: DeriveUiStateInput): ResolutionUiState {
  if (input.isSearching) return 'searching_sources';
  if (input.review) {
    const allUnreadable = input.review.checks.length > 0 && input.review.checks.every((c) => c.decision === 'unreadable');
    return allUnreadable ? 'field_unreadable' : 'local_candidate_saved';
  }
  const attempt = input.attempt;
  if (!attempt) return input.hasPackagingPhotos ? 'ocr_candidate_pending_review' : 'packaging_photo_needed';

  const merged = attempt.merged;
  const exact = attempt.candidates.filter((c) => c.matchLevel === 'exact_gtin');
  const structuredExact = exact.filter((c) => c.sourceKind !== 'user_ocr');
  const noGtinCandidates = attempt.candidates.filter((c) => c.matchLevel === 'candidate_no_gtin');
  const draft = exact.find((c) => c.sourceKind === 'user_ocr') ?? null;

  if (merged.hasUnresolvedConflict && structuredExact.length > 0 && draft) return 'official_source_conflict';
  if (structuredExact.length > 1 || (structuredExact.length === 0 && noGtinCandidates.length > 1)) return 'multiple_candidates';
  if (structuredExact.length === 1) {
    if (structuredExact[0].sourceCompleteness === 'partial' && merged.missingFields.length > 0) return 'off_partial';
    return 'exact_gtin_match';
  }
  if (draft && draft.fields.length > 0) return 'ocr_candidate_pending_review';
  if (!input.hasPackagingPhotos) return 'packaging_photo_needed';
  return 'data_still_insufficient';
}

export interface UiStateCopy {
  icon: string;
  title: string;
  body: string;
  nextAction: string;
}

export const RESOLUTION_UI_COPY: Record<ResolutionUiState, UiStateCopy> = {
  searching_sources: {
    icon: '…',
    title: 'Kaynaklar aranıyor',
    body: 'Open Food Facts, doğrulanmış yerel kayıt ve cihazdaki taslak sırayla kontrol ediliyor.',
    nextAction: 'Bekleyin.',
  },
  off_partial: {
    icon: '◐',
    title: 'Open Food Facts kaydı kısmi',
    body: 'Mevcut alanlar gösterilir; eksik alanlar tahminle doldurulmaz. Paket fotoğrafı eksik alanlar için aday kanıt sağlar.',
    nextAction: 'Eksik alanlar için paket bilgisini ekleyin.',
  },
  exact_gtin_match: {
    icon: '✔',
    title: 'Kesin barkod eşleşmesi bulundu',
    body: 'Kaynak kaydı bu barkodla birebir eşleşiyor. Etiket değişebilir; son karar için ambalaj esastır.',
    nextAction: 'Ambalajla karşılaştırın; farklıysa paket bilgisini ekleyin.',
  },
  multiple_candidates: {
    icon: '≡',
    title: 'Birden fazla olası aday bulundu',
    body: 'Barkodsuz veya birbirinden farklı kaynak adayları var. Hiçbiri otomatik olarak doğrulanmış ürün sayılmaz.',
    nextAction: 'Barkodu okutun veya ambalaj fotoğrafıyla adayı doğrulayın.',
  },
  official_source_conflict: {
    icon: '≠',
    title: 'Kaynak bulundu fakat ambalajla çatışıyor',
    body: 'Kayıtlı değer korunuyor; güncel ambalaj kanıtı yan yana gösteriliyor. İnsan kararı olmadan üzerine yazılmaz.',
    nextAction: 'Alan alan inceleyin: Doğrula, Düzelt veya Okunamıyor.',
  },
  packaging_photo_needed: {
    icon: '📷',
    title: 'Ambalaj fotoğrafı gerekli',
    body: 'Kaynaklarda kullanılabilir kayıt yok. Ad veya kategoriden tahmin yapılmaz.',
    nextAction: 'Paket bilgisini ekleyin (barkod zorunlu).',
  },
  ocr_candidate_pending_review: {
    icon: '✎',
    title: 'Aday metin doğrulama bekliyor',
    body: 'Fotoğraftan yazılan alanlar doğrulanmamış adaydır; skorlara ve alerjen kararına girmez.',
    nextAction: 'Her alanı fotoğrafla karşılaştırıp Doğrula / Düzelt / Okunamıyor seçin.',
  },
  field_unreadable: {
    icon: '?',
    title: 'Alan okunamıyor',
    body: 'Okunamayan alan "veri yok / doğrulanmamış" kalır. Bu bir garanti değildir; etiketi kontrol edin.',
    nextAction: 'Daha net bir fotoğrafla tekrar çekin veya alanı boş bırakın.',
  },
  local_candidate_saved: {
    icon: '▣',
    title: 'Yerel aday kaydedildi',
    body: 'İncelenmiş aday kayıt cihazda tutuluyor; doğrulanmış ürün değildir ve hiçbir yere gönderilmedi.',
    nextAction: 'Sonraki adım: RafSkoru doğrulaması (ayrı görev).',
  },
  data_still_insufficient: {
    icon: '✕',
    title: 'Veri hâlâ yetersiz',
    body: 'Kaynaklar ve ambalaj kanıtı birlikte bile kullanılabilir içerik vermiyor. Eksik alan tahminle doldurulmaz.',
    nextAction: 'Ambalaj fotoğraflarını tekrar çekin veya daha sonra deneyin.',
  },
};
