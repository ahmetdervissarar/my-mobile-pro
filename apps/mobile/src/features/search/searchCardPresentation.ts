/**
 * RafSkoru — Arama Kartı Sunum Mantığı (saf, RN'siz)
 * src/features/search/searchCardPresentation.ts
 *
 * Katmanlı sadeleştirme (onaylı plan): arama kartı en fazla 3 satır.
 * Satır 2: marka · miktar · fiyat (arama ucu fiyat DÖNDÜRMEZ — bu yüzden
 * her zaman "Fiyat: Veri yok"; tahmin ÜRETİLMEZ). Satır 3: profil
 * çakışması varsa alerjen rozeti, yoksa puan rozeti ("Puan: Veri yok" —
 * arama ucu puan da döndürmez). Yeni bir karar üretmez — yalnız zaten
 * hesaplanmış AllergenStatusLine/skor metnini seçer.
 */
import { getScorePillLabel } from '../../ui/scoreVerdict';
import type { AllergenStatusLine } from '../productResult/allergenStatusLine';

export function getSearchCardMetaLine(input: {
  brand?: string;
  packageSize?: { amount: number; unit: string };
  duplicateBarcodeSuffix?: string;
}): string {
  return [
    input.brand,
    input.packageSize ? `${input.packageSize.amount} ${input.packageSize.unit}` : undefined,
    'Fiyat: Veri yok',
    input.duplicateBarcodeSuffix,
  ]
    .filter(Boolean)
    .join(' · ');
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
