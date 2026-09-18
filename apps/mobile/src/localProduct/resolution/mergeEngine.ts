/**
 * RafSkoru — Alan bazlı birleştirme motoru (ADR-005).
 * src/localProduct/resolution/mergeEngine.ts
 *
 * Kurallar:
 * - Yalnız `exact_gtin` adaylar birleştirilir; barkodsuz aday ve farklı GTIN dışarıda kalır (görünür).
 * - Mevcut yapılandırılmış alan korunur; eksik alan yalnız kanıtlı adayla tamamlanır (user_ocr → düşük güven).
 * - Çatışma saklanmaz: farklı değerler `unresolved` kalır; güncel ambalaj kanıtı `displayHint` ile
 *   gösterilir ama insan kararı olmadan üzerine yazılmaz.
 * - Tek bir ürün-geneli güven değeri ÜRETİLMEZ; köken alan bazındadır (`fieldSources`).
 * - Alerjen beyanı yalnız okunabilir kaynaktan gelir; OCR/elle metin `allergenCandidateText`te ayrı kalır.
 */

import type { AllergenDeclaration, FieldSource, ProductFactField } from '../../contracts/generated';
import type {
  FieldConflict,
  FieldEvidence,
  MergedFieldOf,
  MergedFields,
  MergedProductRecord,
  ResolutionCandidate,
} from './types';

export const ALL_FIELDS: readonly ProductFactField[] = [
  'productName',
  'brand',
  'imageUrl',
  'netQuantity',
  'ingredientsText',
  'allergenDeclaration',
  'nutrition',
  'nutriScoreGrade',
  'novaGroup',
  'trafficLight',
];

const ABSENT: AllergenDeclaration = { status: 'absent', declaredTags: [], traceTags: [], source: null };

/**
 * Çatışmada korunacak "mevcut" değer sırası: doğrulanmış > OFF (mevcut kayıt) > üretici (doğrulama
 * kaydı yoksa otomatik yüksek güven sayılmaz) > kullanıcı. Üretici/ambalaj değeri görünür kalır ama
 * insan kararı olmadan mevcut kaydın üzerine yazmaz.
 */
const STRUCTURED_PRIORITY: Record<FieldSource['source'], number> = {
  rafskoru_verified: 0,
  off: 1,
  manufacturer: 2,
  user_ocr: 3,
  beta_inference: 9,
};

function isStructuredSource(e: FieldEvidence): boolean {
  return e.source.source === 'off' || e.source.source === 'manufacturer' || e.source.source === 'rafskoru_verified';
}

function valueKey(e: FieldEvidence): string | null {
  if (e.structuredValue !== null && e.structuredValue !== undefined) {
    return typeof e.structuredValue === 'string' ? e.structuredValue.trim().toLowerCase() : JSON.stringify(e.structuredValue);
  }
  return e.rawText ? `raw:${e.rawText.trim().toLowerCase()}` : null;
}

function newer(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && (!b || a > b));
}

function mergeField<K extends ProductFactField>(field: K, all: readonly FieldEvidence[]): { merged: MergedFieldOf<K>; conflict: FieldConflict | null } {
  const evidence = all.filter((e): e is Extract<FieldEvidence, { field: K }> => e.field === field && valueKey(e) !== null && e.supersededByEvidenceId === null);
  const base: MergedFieldOf<K> = {
    field,
    value: null,
    candidateText: null,
    selectedEvidenceId: null,
    selectedSource: null,
    evidence,
    conflict: 'none',
    resolutionRule: null,
    displayHint: null,
  };
  if (evidence.length === 0) return { merged: base, conflict: null };

  const select = (e: Extract<FieldEvidence, { field: K }>): void => {
    base.selectedEvidenceId = e.id;
    base.selectedSource = e.source;
    base.value = (e.structuredValue ?? null) as MergedFieldOf<K>['value'];
    base.candidateText = e.structuredValue === null || e.structuredValue === undefined ? e.rawText : null;
  };

  const verified = evidence.filter((e) => e.verified);
  if (verified.length > 0) {
    const pick = verified.reduce((best, e) => (newer(e.source.observedAt, best.source.observedAt) ? e : best));
    select(pick);
    base.resolutionRule = 'verified_over_unverified';
    const others = evidence.filter((e) => valueKey(e) !== valueKey(pick));
    if (others.length > 0) {
      base.conflict = 'resolved';
      return {
        merged: base,
        conflict: { field, state: 'resolved', rule: 'verified_over_unverified', evidenceIds: evidence.map((e) => e.id), preferredEvidenceId: pick.id, note: 'Doğrulanmış kayıt doğrulanmamış adaya tercih edildi.' },
      };
    }
    return { merged: base, conflict: null };
  }

  if (evidence.length === 1) {
    select(evidence[0]);
    base.resolutionRule = 'single_candidate';
    return { merged: base, conflict: null };
  }

  const keys = new Set(evidence.map((e) => valueKey(e)));
  const byPriority = [...evidence].sort((a, b) => STRUCTURED_PRIORITY[a.source.source] - STRUCTURED_PRIORITY[b.source.source]);
  if (keys.size === 1) {
    select(byPriority[0]);
    base.resolutionRule = 'source_priority';
    return { merged: base, conflict: null };
  }

  // Farklı değerler: mevcut yapılandırılmış değer KORUNUR, çatışma açık kalır (insan kararı).
  const structured = byPriority.find(isStructuredSource);
  const packaging = evidence
    .filter((e) => e.source.source === 'user_ocr')
    .reduce<Extract<FieldEvidence, { field: K }> | null>((best, e) => (best === null || newer(e.source.observedAt, best.source.observedAt) ? e : best), null);
  base.conflict = 'unresolved';
  if (structured) select(structured);
  // fetchedAt gözlem değildir: yapılandırılmış kaynağın gerçek observedAt'i yoksa ambalaj fotoğrafı
  // tek gerçek gözlemdir ve gösterilir; varsa daha yeni olan gösterilir.
  const structuredObservedAt = structured?.source.observedAt ?? null;
  if (packaging && (!structured || !structuredObservedAt || newer(packaging.source.observedAt, structuredObservedAt))) {
    base.displayHint = { evidenceId: packaging.id, reason: 'newer_packaging_observation' };
  }
  return {
    merged: base,
    conflict: {
      field,
      state: 'unresolved',
      rule: null,
      evidenceIds: evidence.map((e) => e.id),
      preferredEvidenceId: base.displayHint?.evidenceId ?? null,
      note: structured
        ? 'Kaynaklar farklı değer veriyor; mevcut kayıt korunuyor, güncel ambalaj kanıtı gösteriliyor. Üzerine yazmak için insan kararı gerekir.'
        : 'Doğrulanmamış adaylar birbiriyle çelişiyor; değer seçilmedi.',
    },
  };
}

export function mergeCandidates(gtin: string | null, candidates: readonly ResolutionCandidate[]): MergedProductRecord {
  const included = candidates.filter((c) => c.matchLevel === 'exact_gtin');
  const excludedCandidateIds = candidates.filter((c) => c.matchLevel !== 'exact_gtin').map((c) => c.id);
  const allEvidence = included.flatMap((c) => c.fields);

  const fields = {} as MergedFields;
  const conflicts: FieldConflict[] = [];
  const fieldSources: MergedProductRecord['fieldSources'] = {};
  const missingFields: ProductFactField[] = [];

  for (const field of ALL_FIELDS) {
    const { merged, conflict } = mergeField(field, allEvidence);
    (fields as Record<ProductFactField, MergedFieldOf<ProductFactField>>)[field] = merged;
    if (conflict) conflicts.push(conflict);
    if (merged.selectedSource) fieldSources[field] = merged.selectedSource;
    if (merged.value === null && merged.candidateText === null) missingFields.push(field);
  }

  // Alerjen beyanı: yalnız okunabilir kaynak; user_ocr metni ayrı tutulur ve beyana dönüşmez.
  const declarationField = fields.allergenDeclaration;
  type DeclarationEvidence = Extract<FieldEvidence, { field: 'allergenDeclaration' }>;
  const declarationEvidence = declarationField.evidence.filter((e): e is DeclarationEvidence => e.field === 'allergenDeclaration');
  // Alan seçimi `mergeField` ile yapılır (verified > tek aday > öncelik); burada ikinci bir seçim
  // mekanizması KURULMAZ — aksi hâlde sağlayıcı sırasına göre OFF beyanı doğrulanmış beyanı gölgeleyebilirdi
  // (product-data-contract-reviewer F1, 2026-09-18). Seçilen kanıt okunabilir yapılandırılmış beyan değilse
  // (ör. yalnız user_ocr metni seçildi) beyan okunabilir sayılmaz.
  const selectedDeclaration = declarationEvidence.find((e) => e.id === declarationField.selectedEvidenceId) ?? null;
  const readable =
    selectedDeclaration && isStructuredSource(selectedDeclaration) && selectedDeclaration.structuredValue?.status === 'readable'
      ? selectedDeclaration
      : null;
  const ocr = declarationEvidence.find((e) => e.source.source === 'user_ocr' && e.rawText) ?? null;
  const ocrText = ocr?.rawText ?? null;
  let allergenDeclaration: AllergenDeclaration = ABSENT;
  if (readable?.structuredValue) {
    allergenDeclaration = readable.structuredValue;
  } else if (ocr) {
    allergenDeclaration = { status: 'unreadable', declaredTags: [], traceTags: [], source: ocr.source };
  }
  fields.allergenDeclaration = { ...declarationField, value: readable?.structuredValue ?? null, candidateText: ocrText };
  if (readable) fieldSources.allergenDeclaration = readable.source;
  else delete fieldSources.allergenDeclaration;

  const matchLevel = included.length > 0 ? 'exact_gtin' : candidates.some((c) => c.matchLevel === 'candidate_no_gtin') ? 'candidate_no_gtin' : 'none';

  return {
    gtin,
    matchLevel,
    fields,
    fieldSources,
    conflicts,
    missingFields,
    hasUnresolvedConflict: conflicts.some((c) => c.state === 'unresolved'),
    excludedCandidateIds,
    allergenDeclaration,
    allergenCandidateText: ocrText,
  };
}
