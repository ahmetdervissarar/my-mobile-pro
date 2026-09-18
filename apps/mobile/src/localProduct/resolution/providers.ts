/**
 * RafSkoru — Çözümleme sağlayıcıları (ADR-005).
 * src/localProduct/resolution/providers.ts
 *
 * 1. `off`: mevcut backend `ProductFacts` (OFF) → aday. Mobil OFF'a doğrudan çağrı yapmaz.
 * 2. `verified_local`: doğrulanmış yerel kayıt için GERÇEK arayüz + boş depo (bu sürümde kayıt yok).
 * 3. `contribution_draft`: cihazdaki katkı taslağı → `user_ocr` kanıtları (verified=false).
 * 4. `manufacturer_official`: hukuken kullanılabilir bir yöntem BULUNAMADI → uygulanmadı; sahte
 *    adapter yazılmaz, yalnız `not_implemented` sonucu kaydedilir (araştırma raporu, 2026-09-18).
 */

import type { FieldSource, ProductFactField, VerifiedLocalProduct } from '../../contracts/generated';
import { toAllergenDeclaration, isInsufficientRecord } from '../productDataState';
import type { ContributionDraft, ProductFactsWire } from '../types';
import { classifyMatch } from './identity';
import type {
  FieldEvidence,
  ProviderResult,
  ResolutionCandidate,
  ResolutionProvider,
  ResolutionQuery,
} from './types';

function evidence<K extends ProductFactField>(
  input: Omit<Extract<FieldEvidence, { field: K }>, 'supersededByEvidenceId' | 'verified'> & { verified?: boolean },
): FieldEvidence {
  return { ...input, verified: input.verified === true && input.source.source === 'rafskoru_verified', supersededByEvidenceId: null } as FieldEvidence;
}

// ── OFF (backend ProductFacts) ────────────────────────────────────────────────

export function offCandidateFromProductFacts(gtin: string | null, facts: ProductFactsWire): ResolutionCandidate {
  const candidateId = `off:${facts.barcode ?? gtin ?? 'unknown'}`;
  // Backend `observedAt` çekim zamanıdır, ambalaj gözlemi değildir → fetchedAt'e yazılır (provenance).
  const source: FieldSource = {
    source: 'off',
    confidence: facts.confidence ?? 'medium',
    fetchedAt: facts.observedAt ?? null,
    observedAt: null,
    reference: facts.sourceUrl ?? null,
    isSynthetic: false,
  };
  const fields: FieldEvidence[] = [];
  const push = <K extends ProductFactField>(field: K, structuredValue: Extract<FieldEvidence, { field: K }>['structuredValue']) => {
    if (structuredValue === null || structuredValue === undefined) return;
    fields.push(evidence({ id: `${candidateId}:${field}`, field, structuredValue, rawText: null, source, candidateId, entryMethod: 'structured', isFixture: false } as never));
  };
  if (facts.productName?.trim()) push('productName', facts.productName.trim());
  if (facts.imageUrl?.trim()) push('imageUrl', facts.imageUrl.trim());
  if (facts.ingredientsText?.trim()) push('ingredientsText', facts.ingredientsText.trim());
  if (facts.nutriScoreGrade) push('nutriScoreGrade', facts.nutriScoreGrade);
  if (facts.novaGroup) push('novaGroup', facts.novaGroup);
  if (facts.trafficLight && (facts.trafficLight.sugar || facts.trafficLight.salt || facts.trafficLight.saturatedFat || facts.trafficLight.fat)) {
    push('trafficLight', facts.trafficLight);
  }
  const declaration = toAllergenDeclaration(facts);
  if (declaration.status === 'readable') push('allergenDeclaration', declaration);

  const identity = { gtin: facts.barcode ?? gtin, productName: facts.productName ?? null, brand: null, variant: null, netQuantityText: null };
  return {
    id: candidateId,
    providerId: 'off',
    sourceKind: 'off',
    matchLevel: classifyMatch(gtin, identity),
    identity,
    identityKey: null,
    packagingEvidenceIds: [],
    fields,
    reference: facts.sourceUrl ?? null,
    fetchedAt: facts.observedAt ?? null,
    sourceModifiedAt: null,
    observedAt: null,
    isSynthetic: false,
    sourceCompleteness: facts.completeness ?? (facts.isComplete ? 'complete' : 'partial'),
  };
}

export function createOffProvider(fetchFacts: (gtin: string) => Promise<ProductFactsWire | null>): ResolutionProvider {
  return {
    id: 'off',
    sourceKind: 'off',
    async resolve(query: ResolutionQuery): Promise<ProviderResult> {
      if (!query.gtin) return { providerId: 'off', status: 'skipped', candidates: [], reason: 'Barkod yok; OFF yalnız barkodla sorgulanır.' };
      let facts: ProductFactsWire | null;
      try {
        facts = await fetchFacts(query.gtin);
      } catch {
        return { providerId: 'off', status: 'unavailable', candidates: [], reason: 'Open Food Facts kaynağına ulaşılamadı.' };
      }
      if (!facts) return { providerId: 'off', status: 'not_found', candidates: [], reason: 'Open Food Facts kaydı yok.' };
      if (facts.dataSource !== 'off') {
        return { providerId: 'off', status: 'skipped', candidates: [], reason: 'Kayıt OFF kaynaklı değil (tahmin verisi ürün verisi sayılmaz).' };
      }
      if (isInsufficientRecord(facts)) {
        return { providerId: 'off', status: 'not_found', candidates: [], reason: 'Open Food Facts kaydı var ama kullanılabilir alan yok (yetersiz).' };
      }
      return { providerId: 'off', status: 'ok', candidates: [offCandidateFromProductFacts(query.gtin, facts)], reason: null };
    },
  };
}

// ── Doğrulanmış yerel kayıt (gerçek arayüz, boş durum) ────────────────────────

export interface VerifiedLocalStore {
  findByGtin(gtin: string): Promise<VerifiedLocalProduct | null>;
}

/** Bu sürümde doğrulanmış kayıt YOKTUR; depo her zaman boş döner. Sahte kayıt üretmez. */
export const emptyVerifiedLocalStore: VerifiedLocalStore = {
  async findByGtin() {
    return null;
  },
};

export function verifiedCandidateFromRecord(gtin: string, record: VerifiedLocalProduct): ResolutionCandidate | null {
  if (record.status !== 'verified') return null;
  const candidateId = `verified_local:${record.id}`;
  const fields: FieldEvidence[] = record.claims.map((claim) =>
    evidence({
      id: `${candidateId}:${claim.field}`,
      field: claim.field,
      structuredValue: claim.value,
      rawText: null,
      source: { ...claim.provenance, isSynthetic: false },
      candidateId,
      entryMethod: 'structured',
      isFixture: false,
      verified: true,
    } as never),
  );
  const identity = { gtin: record.gtin, productName: null, brand: null, variant: null, netQuantityText: null };
  return {
    id: candidateId,
    providerId: 'verified_local',
    sourceKind: 'rafskoru_verified',
    matchLevel: classifyMatch(gtin, identity),
    identity,
    identityKey: null,
    packagingEvidenceIds: [...record.evidenceIds],
    fields,
    reference: null,
    fetchedAt: null,
    sourceModifiedAt: record.updatedAt,
    observedAt: null,
    isSynthetic: false,
    sourceCompleteness: null,
  };
}

export function createVerifiedLocalProvider(store: VerifiedLocalStore): ResolutionProvider {
  return {
    id: 'verified_local',
    sourceKind: 'rafskoru_verified',
    async resolve(query: ResolutionQuery): Promise<ProviderResult> {
      if (!query.gtin) return { providerId: 'verified_local', status: 'skipped', candidates: [], reason: 'Barkod yok.' };
      const record = await store.findByGtin(query.gtin);
      if (!record) {
        return { providerId: 'verified_local', status: 'not_found', candidates: [], reason: 'Doğrulanmış yerel kayıt yok (bu sürümde depo boş).' };
      }
      const candidate = verifiedCandidateFromRecord(query.gtin, record);
      if (!candidate) return { providerId: 'verified_local', status: 'not_found', candidates: [], reason: 'Kayıt doğrulanmış durumda değil.' };
      return { providerId: 'verified_local', status: 'ok', candidates: [candidate], reason: null };
    },
  };
}

// ── Cihazdaki katkı taslağı (user_ocr) ────────────────────────────────────────

export function photoEvidenceId(draft: ContributionDraft, kind: string): string {
  return `${draft.id}:photo:${kind}`;
}

const DRAFT_FIELD_STEP: Record<string, string> = {
  productName: 'front',
  ingredientsText: 'ingredients',
  allergenDeclaration: 'allergen',
  nutrition: 'nutrition',
  netQuantity: 'quantity',
};

export function draftCandidate(gtin: string | null, draft: ContributionDraft): ResolutionCandidate {
  const candidateId = `draft:${draft.id}`;
  const photoKinds = new Set(draft.photos.map((p) => p.kind));
  const fields: FieldEvidence[] = [];
  for (const c of draft.candidates) {
    if (!c.text || !c.text.trim()) continue;
    const step = DRAFT_FIELD_STEP[c.field];
    const hasPhoto = step ? photoKinds.has(step as never) : false;
    const source: FieldSource = {
      source: 'user_ocr',
      confidence: 'low',
      observedAt: draft.observedAt,
      evidenceId: hasPhoto ? photoEvidenceId(draft, step) : null,
      isSynthetic: c.isFixture,
    };
    const isString = c.field === 'productName' || c.field === 'ingredientsText';
    fields.push(
      evidence({
        id: `${candidateId}:${c.field}`,
        field: c.field,
        structuredValue: isString ? c.text.trim() : null,
        rawText: c.text.trim(),
        source,
        candidateId,
        entryMethod: c.entryMethod === 'fixture' ? 'fixture' : 'manual',
        isFixture: c.isFixture,
      } as never),
    );
  }
  const nameCandidate = draft.candidates.find((c) => c.field === 'productName')?.text ?? null;
  const identity = { gtin: draft.gtin, productName: nameCandidate, brand: null, variant: null, netQuantityText: null };
  return {
    id: candidateId,
    providerId: 'contribution_draft',
    sourceKind: 'user_ocr',
    matchLevel: classifyMatch(gtin, identity),
    identity,
    identityKey: null,
    packagingEvidenceIds: draft.photos.map((p) => photoEvidenceId(draft, p.kind)),
    fields,
    reference: null,
    fetchedAt: null,
    sourceModifiedAt: null,
    observedAt: draft.observedAt,
    isSynthetic: draft.candidates.some((c) => c.isFixture),
    sourceCompleteness: null,
  };
}

export function createContributionDraftProvider(loadDraft: (gtin: string) => Promise<ContributionDraft | null>): ResolutionProvider {
  return {
    id: 'contribution_draft',
    sourceKind: 'user_ocr',
    async resolve(query: ResolutionQuery): Promise<ProviderResult> {
      if (!query.gtin) return { providerId: 'contribution_draft', status: 'skipped', candidates: [], reason: 'Barkod yok.' };
      const draft = await loadDraft(query.gtin);
      if (!draft) return { providerId: 'contribution_draft', status: 'not_found', candidates: [], reason: 'Cihazda bu barkod için katkı taslağı yok.' };
      return { providerId: 'contribution_draft', status: 'ok', candidates: [draftCandidate(query.gtin, draft)], reason: null };
    },
  };
}

// ── Resmî üretici kaynağı: uygulanmadı ────────────────────────────────────────

export const MANUFACTURER_PROVIDER_NOT_IMPLEMENTED: ProviderResult = {
  providerId: 'manufacturer_official',
  status: 'not_implemented',
  candidates: [],
  reason:
    'Resmî üretici kataloğu için kullanım hakkı açık bir yöntem bulunamadı (araştırma 2026-09-18); sahte adapter yazılmadı.',
};
