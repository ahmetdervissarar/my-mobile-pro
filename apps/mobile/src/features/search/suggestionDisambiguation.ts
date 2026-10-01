/**
 * RafSkoru — Arama: aynı marka+boyuttaki farklı GTIN'leri ayırt et (D4)
 * src/features/search/suggestionDisambiguation.ts
 *
 * Cihaz testi (30 Eylül): "Süt · Dost · 1000 ml" ve "%3.1 Yağlı Süt · Dost ·
 * 1000 ml" ayırt edilemiyordu. Kanıt: FARKLI GTIN, mükerrer değil —
 * gizleme/birleştirme YOK (veri kaybı riski). Aynı marka+boyutta birden
 * fazla kayıt varsa, her birine barkodun son 4 hanesini küçük bir ayırt
 * edici olarak ekler; sıralama backend'de suggestions.ts'teki jenerik-ad
 * kuralıyla ayrıca ele alınır.
 */
import type { ProductSearchSuggestion, SearchSuggestion } from '../../api/productSuggestionClient';

function brandSizeKey(suggestion: ProductSearchSuggestion): string | null {
  if (!suggestion.brand || !suggestion.packageSize) return null;
  return [
    suggestion.brand.trim().toLocaleLowerCase('tr-TR'),
    suggestion.packageSize.amount,
    suggestion.packageSize.unit.trim().toLocaleLowerCase('tr-TR'),
  ].join('::');
}

/** productId (barkod) → gösterilecek ayırt edici son ek (ör. "… 2021"). */
export function getDuplicateBarcodeSuffixes(suggestions: SearchSuggestion[]): Map<string, string> {
  const groups = new Map<string, ProductSearchSuggestion[]>();

  for (const suggestion of suggestions) {
    if (suggestion.type !== 'product') continue;
    const key = brandSizeKey(suggestion);
    if (!key) continue;

    const group = groups.get(key) ?? [];
    group.push(suggestion);
    groups.set(key, group);
  }

  const suffixes = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const suggestion of group) {
      const last4 = suggestion.productId.slice(-4);
      suffixes.set(suggestion.productId, `… ${last4}`);
    }
  }

  return suffixes;
}
