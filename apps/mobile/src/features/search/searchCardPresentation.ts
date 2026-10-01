/**
 * RafSkoru — Arama Kartı Sunum Mantığı (saf, RN'siz)
 * src/features/search/searchCardPresentation.ts
 *
 * Katmanlı sadeleştirme (onaylı plan): arama kartı en fazla 3 satır.
 * Satır 2: marka · miktar (arama ucu fiyat DÖNDÜRMEZ — bu yüzden fiyat
 * segmenti hiç yazılmaz; "Fiyat: Veri yok" her kartta tekrar etmesin,
 * bkz. cihaz testi 1 Ekim madde 3). Satır 3: profil çakışması varsa
 * alerjen rozeti, yoksa puan rozeti. Cihaz testi 1 Ekim madde 4: liste
 * puanı artık ürün sayfasıyla AYNI hesaplayıcıdan geliyor (rafScore
 * suggestion'a eklendi) — yalnız zaten hesaplanmış AllergenStatusLine/
 * RafScoreResult'ı seçer, yeni bir karar ÜRETMEZ.
 *
 * Mükerrer barkod son eki (aynı marka+boyut) bu satıra KATILMAZ — ayrı,
 * daralmayan bir metin olarak render edilir (bkz. SearchResultRow), aksi
 * halde numberOfLines={1} satır sonundaki son eki keser (bkz. cihaz testi
 * 1 Ekim madde 4).
 */
import { getScorePillLabel } from '../../ui/scoreVerdict';
import { isRafScorePriceless } from '../../price/rafScorePriceless';
import type { RafScoreResult } from '../../price/types';
import type { AllergenStatusLine } from '../productResult/allergenStatusLine';

export function getSearchCardMetaLine(input: {
  brand?: string;
  packageSize?: { amount: number; unit: string };
}): string | null {
  const parts = [
    input.brand,
    input.packageSize ? `${input.packageSize.amount} ${input.packageSize.unit}` : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : null;
}

export interface SearchCardBadge {
  /** true ise alerjen rengiyle (kırmızı/nötr/sarı) gösterilir, false ise puan rozeti. */
  isAllergenBadge: boolean;
  text: string;
}

/**
 * Çakışma varsa alerjen rozeti (mevcut "Alerjen uyarısı öncelikli" kuralı
 * puandan ÖNCE gelir — bkz. P2 invariant). Yoksa puan rozeti: rafScore
 * doluysa gerçek puan ("Puan (fiyatsız): N" dahil), yoksa "Puan: Veri yok".
 */
export function getSearchCardBadge(allergenLine: AllergenStatusLine, rafScore?: RafScoreResult): SearchCardBadge {
  if (allergenLine.tone === 'danger') {
    return { isAllergenBadge: true, text: allergenLine.text };
  }

  return {
    isAllergenBadge: false,
    text: getScorePillLabel({ score: rafScore?.score ?? null, isPriceless: isRafScorePriceless(rafScore) }),
  };
}
