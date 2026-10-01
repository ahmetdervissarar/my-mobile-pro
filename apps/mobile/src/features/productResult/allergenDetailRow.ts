/**
 * RafSkoru — Alerjen Ayrıntı Paneli Satır Etiketi
 * src/features/productResult/allergenDetailRow.ts
 *
 * AllergenDetailSheet'in perKey satırları için SUNUM katmanı geçersiz
 * kılması: süt ve laktoz ayrı satırlardır (perKey anahtar bazlı),
 * displayLabelForKey'in TGK mirror kuralı (lactose → "Süt") burada aynen
 * kullanılırsa iki satır da "Süt / Beyan" görünür (bkz. cihaz testi 1 Ekim,
 * madde 1). Karar mantığına (basis, seviye) dokunmaz — yalnız laktoz
 * satırının adını "Laktoz" yapıp nedenini açıklayan bir not ekler.
 * RN'siz tutulur (indicatorTrio.ts/scoreVerdict.ts gibi) — plain Node/tsx
 * altında test edilebilir.
 */
import { displayLabelForKey, type AllergenProfileKeyBasis } from '../../riskEngine/catalogAllergenChip';
import type { AllergenKey } from '../../userProfile/userProfileTypes';

export interface AllergenDetailRowLabel {
  label: string;
  note: string | null;
}

export function getDetailRowLabel(key: AllergenKey, basis: AllergenProfileKeyBasis): AllergenDetailRowLabel {
  if (key === 'lactose' && (basis === 'declared' || basis === 'trace')) {
    return { label: 'Laktoz', note: 'süt beyanı nedeniyle' };
  }
  return { label: displayLabelForKey(key, basis), note: null };
}
