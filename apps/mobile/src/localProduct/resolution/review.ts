/**
 * RafSkoru — İnsan alan incelemesi (saf mantık; I/O yok).
 * src/localProduct/resolution/review.ts
 *
 * Katkı taslağındaki aday alanlar fotoğrafla yan yana insan tarafından "Doğrula / Düzelt /
 * Okunamıyor" ile işaretlenir. Sonuç `locally_reviewed_candidate`tır: `rafskoru_verified` DEĞİLDİR,
 * alerjen beyanı asla `readable` olmaz, düzeltme eski kanıtı silmez (geçmiş korunur).
 */

import type { AllergenDeclaration, ProductFactField } from '../../contracts/generated';
import { DRAFT_TEXT_FIELDS } from '../contributionDraft';
import type { CapturedPhoto, ContributionDraft, DraftTextField } from '../types';
import { draftCandidate, photoEvidenceId } from './providers';
import type { FieldEvidence, HumanFieldCheck, HumanFieldDecision, LocallyReviewedRecord, MergedProductRecord } from './types';

export interface ReviewItem {
  field: DraftTextField;
  label: string;
  isAllergen: boolean;
  candidateText: string | null;
  candidateEvidenceId: string | null;
  isFixture: boolean;
  photo: CapturedPhoto | null;
  photoEvidenceId: string | null;
  /** Yapılandırılmış kaynakta (ör. OFF) aynı alan için mevcut değer; çatışma görünür kalsın diye. */
  existingValueText: string | null;
  existingSourceLabel: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  off: 'Open Food Facts',
  rafskoru_verified: 'RafSkoru doğrulanmış kayıt',
  manufacturer: 'Üretici resmî kaynağı',
  user_ocr: 'Kullanıcı girişi (doğrulanmamış)',
  beta_inference: 'Tahmin (ürün verisi değil)',
};

function existingText(merged: MergedProductRecord | null, field: ProductFactField): { text: string | null; label: string | null } {
  if (!merged) return { text: null, label: null };
  const f = merged.fields[field];
  const structured = f.evidence.find((e) => e.source.source !== 'user_ocr' && e.structuredValue !== null);
  if (!structured) return { text: null, label: null };
  const v = structured.structuredValue;
  const text = typeof v === 'string' ? v : field === 'allergenDeclaration' ? null : JSON.stringify(v);
  return { text, label: SOURCE_LABEL[structured.source.source] ?? structured.source.source };
}

/** Alerjen alanı her zaman ilk sıradadır (bilgi hiyerarşisi 1: alerjen kapısı). */
export function buildReviewItems(draft: ContributionDraft, merged: MergedProductRecord | null): ReviewItem[] {
  const candidate = draftCandidate(draft.gtin, draft);
  const photoByKind = new Map(draft.photos.map((p) => [p.kind, p] as const));
  const items = DRAFT_TEXT_FIELDS.map(({ field, label, step }) => {
    const ev = candidate.fields.find((e) => e.field === field) ?? null;
    const photo = photoByKind.get(step) ?? null;
    const existing = existingText(merged, field);
    return {
      field,
      label,
      isAllergen: field === 'allergenDeclaration',
      candidateText: ev?.rawText ?? null,
      candidateEvidenceId: ev?.id ?? null,
      isFixture: ev?.isFixture ?? false,
      photo,
      photoEvidenceId: photo ? photoEvidenceId(draft, photo.kind) : null,
      existingValueText: existing.text,
      existingSourceLabel: existing.label,
    } satisfies ReviewItem;
  });
  return [...items.filter((i) => i.isAllergen), ...items.filter((i) => !i.isAllergen)];
}

export interface FieldDecisionInput {
  decision: HumanFieldDecision;
  correctedText?: string | null;
}

export type ReviewDecisions = Partial<Record<DraftTextField, FieldDecisionInput>>;

export function isReviewComplete(items: readonly ReviewItem[], decisions: ReviewDecisions): boolean {
  return items.every((item) => {
    const d = decisions[item.field];
    if (!d) return false;
    if (d.decision === 'corrected') return Boolean(d.correctedText && d.correctedText.trim());
    if (d.decision === 'confirmed') return Boolean(item.candidateText);
    return true;
  });
}

export function applyHumanFieldChecks(draft: ContributionDraft, decisions: ReviewDecisions, now: string): LocallyReviewedRecord {
  if (!draft.gtin) throw new Error('İnceleme kaydı barkodsuz oluşturulamaz.');
  const candidate = draftCandidate(draft.gtin, draft);
  const evidence: FieldEvidence[] = candidate.fields.map((e) => ({ ...e }));
  const checks: HumanFieldCheck[] = [];
  const items = buildReviewItems(draft, null);

  for (const item of items) {
    const input = decisions[item.field];
    if (!input) continue;
    const original = evidence.find((e) => e.id === item.candidateEvidenceId) ?? null;
    const base = { field: item.field, candidateEvidenceId: item.candidateEvidenceId, candidateText: item.candidateText, photoEvidenceId: item.photoEvidenceId, checkedAt: now };

    if (input.decision === 'unreadable') {
      checks.push({ ...base, decision: 'unreadable', reviewedText: null, resultingEvidenceId: null });
      continue;
    }
    if (input.decision === 'confirmed') {
      if (!original) continue;
      checks.push({ ...base, decision: 'confirmed', reviewedText: original.rawText, resultingEvidenceId: original.id });
      continue;
    }
    const corrected = input.correctedText?.trim();
    if (!corrected) continue;
    const newId = `${candidate.id}:${item.field}:review:${now}`;
    const isString = item.field === 'productName' || item.field === 'ingredientsText';
    const created = {
      id: newId,
      field: item.field,
      structuredValue: isString ? corrected : null,
      rawText: corrected,
      source: { source: 'user_ocr', confidence: 'low', observedAt: draft.observedAt, evidenceId: item.photoEvidenceId, isSynthetic: false },
      candidateId: candidate.id,
      entryMethod: 'human_review',
      isFixture: false,
      verified: false,
      supersededByEvidenceId: null,
    } as FieldEvidence;
    if (original) original.supersededByEvidenceId = newId; // eski kanıt SİLİNMEZ
    evidence.push(created);
    checks.push({ ...base, decision: 'corrected', reviewedText: corrected, resultingEvidenceId: newId });
  }

  const allergenCheck = checks.find((c) => c.field === 'allergenDeclaration') ?? null;
  const allergenPhoto = draft.photos.some((p) => p.kind === 'allergen');
  let allergenDeclaration: AllergenDeclaration;
  if (allergenCheck && allergenCheck.decision !== 'unreadable' && allergenCheck.reviewedText) {
    // Kullanıcı kaynaklı beyan hiçbir zaman `readable` olmaz (ReadableDeclarationSourceKind).
    allergenDeclaration = {
      status: 'unreadable',
      declaredTags: [],
      traceTags: [],
      source: { source: 'user_ocr', confidence: 'low', observedAt: draft.observedAt, evidenceId: allergenCheck.photoEvidenceId, isSynthetic: false },
    };
  } else if (allergenPhoto) {
    allergenDeclaration = { status: 'unreadable', declaredTags: [], traceTags: [], source: { source: 'user_ocr', confidence: 'low', observedAt: draft.observedAt, isSynthetic: false } };
  } else {
    allergenDeclaration = { status: 'absent', declaredTags: [], traceTags: [], source: null };
  }

  return {
    id: `review-${draft.gtin}-${now}`,
    status: 'locally_reviewed_candidate',
    gtin: draft.gtin,
    draftId: draft.id,
    checks,
    evidence,
    allergenDeclaration,
    allergenState: 'unknown_or_unverified',
    createdAt: now,
    boundary: { notVerified: 'not_rafskoru_verified', nextTask: 'rafskoru_verification', upload: 'no_upload_in_this_build' },
  };
}

/** Kullanıcıya gösterilen özet; teknik alan adı yerine Türkçe etiket, olumlu güvenlik iddiası yok. */
export function summarizeReviewedRecord(record: LocallyReviewedRecord): string[] {
  const label = (field: ProductFactField) => DRAFT_TEXT_FIELDS.find((f) => f.field === field)?.label ?? field;
  const lines = [
    'Durum: yerel incelenmiş aday kayıt. Doğrulanmış ürün DEĞİLDİR; skorlara ve alerjen kararına girmez.',
    `Barkod: ${record.gtin}`,
  ];
  for (const c of record.checks) {
    const verb = c.decision === 'confirmed' ? 'doğrulandı (aday)' : c.decision === 'corrected' ? 'düzeltildi (aday)' : 'okunamıyor → veri yok';
    lines.push(`${label(c.field)}: ${verb}`);
  }
  lines.push('Alerjen durumu: veri yok / doğrulanmamış. Bu bir garanti değildir; etiketi kontrol edin.');
  lines.push('Gönderim: bu sürümde kapalı. Sonraki adım: RafSkoru doğrulaması (ayrı görev).');
  return lines;
}
