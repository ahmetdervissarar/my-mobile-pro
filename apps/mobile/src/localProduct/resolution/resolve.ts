/**
 * RafSkoru — Çözümleme orkestrasyonu (ADR-005).
 * src/localProduct/resolution/resolve.ts
 *
 * Sağlayıcılar bağımsız çalışır; biri düşerse diğerlerinin sonucu kaybolmaz. Sonuç alan bazlı
 * birleştirilir ve tek bir ekran durumu türetilir. Fiyat, skor veya alerjen kararı üretmez.
 */

import { mergeCandidates } from './mergeEngine';
import { MANUFACTURER_PROVIDER_NOT_IMPLEMENTED } from './providers';
import { deriveResolutionUiState } from './uiState';
import type { LocallyReviewedRecord, ProductResolutionAttempt, ProviderResult, ResolutionProvider, ResolutionQuery } from './types';

export interface RunResolutionOptions {
  now: () => string;
  review?: LocallyReviewedRecord | null;
  hasPackagingPhotos?: boolean;
}

export async function runProductResolution(
  query: ResolutionQuery,
  providers: readonly ResolutionProvider[],
  options: RunResolutionOptions,
): Promise<ProductResolutionAttempt> {
  const startedAt = options.now();
  const settled = await Promise.allSettled(providers.map((p) => p.resolve(query)));
  const providerResults: ProviderResult[] = settled.map((outcome, index) =>
    outcome.status === 'fulfilled'
      ? outcome.value
      : { providerId: providers[index].id, status: 'unavailable', candidates: [], reason: 'Kaynak yanıt vermedi.' },
  );
  providerResults.push(MANUFACTURER_PROVIDER_NOT_IMPLEMENTED);

  const candidates = providerResults.flatMap((r) => r.candidates);
  const merged = mergeCandidates(query.gtin, candidates);
  const completedAt = options.now();
  const draft = candidates.find((c) => c.providerId === 'contribution_draft') ?? null;
  const attempt: ProductResolutionAttempt = {
    id: `resolution-${query.gtin ?? 'nogtin'}-${startedAt}`,
    gtin: query.gtin,
    startedAt,
    completedAt,
    providerResults,
    candidates,
    merged,
    uiState: 'searching_sources',
  };
  attempt.uiState = deriveResolutionUiState({
    attempt,
    isSearching: false,
    hasPackagingPhotos: options.hasPackagingPhotos ?? (draft ? draft.packagingEvidenceIds.length > 0 : false),
    review: options.review ?? null,
  });
  return attempt;
}
