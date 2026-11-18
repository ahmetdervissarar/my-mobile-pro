/**
 * RafSkoru — Puan kapsamı (ADR-009 §11)
 * src/price/rafScoreScope.ts
 *
 * Backend, puan kapsamı dışındaki ürün (alkollü içecek) için RafSkoru'yu
 * "raf_score_out_of_scope" gerekçesiyle, puansız döndürür. Bu durum "veri
 * yetersiz" değildir; ekranlar bunu ayrı bir metinle gösterir. Alerjen
 * uyarıları bu durumdan etkilenmez.
 */
import type { RafScoreResult } from './types';

export const RAF_SCORE_OUT_OF_SCOPE_REASON_CODE = 'raf_score_out_of_scope';

export const RAF_SCORE_OUT_OF_SCOPE_LABEL = 'Puan kapsamında değil';

export const RAF_SCORE_OUT_OF_SCOPE_EXPLANATION =
  'Alkollü içecekler RafSkoru puan kapsamında değildir. Alerjen bilgisi yine gösterilir; ambalaj etiketini kontrol edin.';

export function isRafScoreOutOfScope(rafScore: RafScoreResult | null | undefined): boolean {
  return Boolean(rafScore?.reasons?.some((reason) => reason.code === RAF_SCORE_OUT_OF_SCOPE_REASON_CODE));
}
