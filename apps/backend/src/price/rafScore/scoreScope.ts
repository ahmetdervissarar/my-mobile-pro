/**
 * RafSkoru — Puan kapsamı (ADR-009 §11)
 * apps/backend/src/price/rafScore/scoreScope.ts
 *
 * Proje sahibi kararı (2026-11-18): alkollü içeceklere betada RafSkoru puanı
 * verilmez. Ekranda "puan kapsamında değil" denir; bu durum "veri yok" ile
 * karıştırılmaz. Alerjen uyarıları bu karardan ETKİLENMEZ.
 *
 * Alkollü olduğu YALNIZ yapılandırılmış veriden anlaşılır:
 *   - OFF kategori etiketleri (aşağıdaki liste), veya
 *   - insan onaylı etiket kaydında onaylayanın seçtiği ürün türü.
 * Ürün adından ("bira", "rakı") çıkarım yapılmaz.
 *
 * Ürün sayfası ve listeler AYNI sonuç nesnesini (buildOutOfScopeRafScore)
 * kullanır; böylece ekranlar arasında fark oluşmaz.
 */
import { calculateRafScore } from './rafScoreCalculator.js';
import type { RafScoreResult } from './types.js';

export type ScoreScopeExclusion = 'alcoholic_beverage';

/** OFF taksonomisindeki alkollü içecek kategorileri. */
export const ALCOHOLIC_OFF_CATEGORY_TAGS: readonly string[] = [
  'en:alcoholic-beverages',
  'en:beers',
  'en:wines',
  'en:spirits',
  'en:ciders',
  'en:liqueurs',
];

export const RAF_SCORE_OUT_OF_SCOPE_REASON_CODE = 'raf_score_out_of_scope';

export function scoreScopeExclusionFromOffCategories(tags: readonly string[] | null | undefined): ScoreScopeExclusion | null {
  return Array.isArray(tags) && tags.some((tag) => ALCOHOLIC_OFF_CATEGORY_TAGS.includes(tag)) ? 'alcoholic_beverage' : null;
}

/**
 * Kapsam dışı ürün için puan sonucu: puan yok, durum 'unavailable', tek
 * gerekçe 'raf_score_out_of_scope'. Bileşenlerin hiçbiri mevcut sayılmaz.
 */
export function buildOutOfScopeRafScore(exclusion: ScoreScopeExclusion): RafScoreResult {
  const base = calculateRafScore({ priceScore: null, healthScore: null, contentScore: null, sustainabilityScore: null });
  return {
    ...base,
    score: null,
    status: 'unavailable',
    explanations: [],
    reasons: [
      {
        code: RAF_SCORE_OUT_OF_SCOPE_REASON_CODE,
        category: 'data_quality',
        severity: 'neutral',
        params: { scope: exclusion },
      },
    ],
  };
}

export function isOutOfScopeRafScore(rafScore: RafScoreResult | null | undefined): boolean {
  return Boolean(rafScore?.reasons?.some((reason) => reason.code === RAF_SCORE_OUT_OF_SCOPE_REASON_CODE));
}
