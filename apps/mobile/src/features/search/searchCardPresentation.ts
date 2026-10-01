/**
 * RafSkoru — Arama Kartı Sunum Mantığı (saf, RN'siz)
 * src/features/search/searchCardPresentation.ts
 *
 * Katmanlı sadeleştirme (onaylı plan): arama kartı en fazla 3 satır.
 * Satır 2: marka · miktar (arama ucu fiyat DÖNDÜRMEZ — bu yüzden fiyat
 * segmenti hiç yazılmaz; "Fiyat: Veri yok" her kartta tekrar etmesin,
 * bkz. cihaz testi 1 Ekim madde 3). Satır 3: profil çakışması varsa
 * alerjen rozeti, yoksa puan rozeti ("Puan: Veri yok" — arama ucu puan
 * da döndürmez). Yeni bir karar üretmez — yalnız zaten hesaplanmış
 * AllergenStatusLine/skor metnini seçer.
 */
import { getScorePillLabel } from '../../ui/scoreVerdict';
import type { AllergenStatusLine } from '../productResult/allergenStatusLine';

export function getSearchCardMetaLine(input: {
  brand?: string;
  packageSize?: { amount: number; unit: string };
  duplicateBarcodeSuffix?: string;
}): string | null {
  const parts = [
    input.brand,
    input.packageSize ? `${input.packageSize.amount} ${input.packageSize.unit}` : undefined,
    input.duplicateBarcodeSuffix,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : null;
}

export interface SearchCardBadge {
  /** true ise alerjen rengiyle (kırmızı/nötr/sarı) gösterilir, false ise puan rozeti. */
  isAllergenBadge: boolean;
  text: string;
}

/** Çakışma varsa alerjen rozeti; yoksa puan rozeti (arama ucu puan döndürmediği için her zaman "Puan: Veri yok"). */
export function getSearchCardBadge(allergenLine: AllergenStatusLine): SearchCardBadge {
  if (allergenLine.tone === 'danger') {
    return { isAllergenBadge: true, text: allergenLine.text };
  }

  return { isAllergenBadge: false, text: getScorePillLabel({ score: null }) };
}
