/**
 * RafSkoru — Puan kapsamı (ADR-009 §11)
 * src/price/rafScoreScope.ts
 *
 * Backend, puan kapsamı dışındaki ürün (alkollü içecek §11, gıda dışı ürün
 * §14) için RafSkoru'yu
 * "raf_score_out_of_scope" gerekçesiyle, puansız döndürür. Bu durum "veri
 * yetersiz" değildir; ekranlar bunu ayrı bir metinle gösterir. Alerjen
 * uyarıları bu durumdan etkilenmez.
 */
import type { RafScoreResult } from './types';

export const RAF_SCORE_OUT_OF_SCOPE_REASON_CODE = 'raf_score_out_of_scope';

export const RAF_SCORE_OUT_OF_SCOPE_LABEL = 'Puan kapsamında değil';

export const RAF_SCORE_OUT_OF_SCOPE_EXPLANATION =
  'Alkollü içecekler RafSkoru puan kapsamında değildir. Alerjen bilgisi yine gösterilir; ambalaj etiketini kontrol edin.';

export const RAF_SCORE_NON_FOOD_EXPLANATION =
  'Gıda dışı ürünler (kozmetik, temizlik vb.) RafSkoru puan kapsamında değildir. İçerik ve alerjen bilgisi için ambalaj etiketini kontrol edin.';

/**
 * Kapsam dışı gerekçesinin açıklaması; nedeni (params.scope) bilinmiyorsa
 * alkollü içecek metnine düşmez, genel bir metin döner.
 */
export function rafScoreOutOfScopeExplanation(scope: unknown): string {
  if (scope === 'alcoholic_beverage') return RAF_SCORE_OUT_OF_SCOPE_EXPLANATION;
  if (scope === 'non_food') return RAF_SCORE_NON_FOOD_EXPLANATION;
  return 'Bu ürün RafSkoru puan kapsamında değildir. Ambalaj etiketini kontrol edin.';
}

export function isRafScoreOutOfScope(rafScore: RafScoreResult | null | undefined): boolean {
  return Boolean(rafScore?.reasons?.some((reason) => reason.code === RAF_SCORE_OUT_OF_SCOPE_REASON_CODE));
}
