/**
 * RafSkoru — İnsan onaylı etiket kaydından ProductFacts (ADR-009 §4, §7a)
 * apps/backend/src/price/productFacts/verifiedLabelFacts.ts
 *
 * Saf fonksiyonlardır; veritabanına veya ağa dokunmaz ve henüz hiçbir
 * çözümleme yoluna BAĞLI DEĞİLDİR (bağlama: Faz 1, İş 1.3b).
 *
 * Kapsam bilerek dardır:
 *   - Yalnız productName ve ingredientsText taşınır. Etiketteki besin
 *     tablosundan Nutri-Score hesabı ürün türünü (kategori) gerektirir ve
 *     ayrı bir iştir; burada hesaplanmaz, tahmin edilmez.
 *   - ALERJEN ALANLARINA DOKUNULMAZ. Onaylı kayıttan alerjen beyanı üretmek
 *     alerjen kapısına dokunan ayrı, incelemeli bir iştir. Tek başına onaylı
 *     kayıt allergenInfo.dataStatus='unknown' taşır; birleştirmede tabandaki
 *     alerjen alanları aynen korunur.
 */
import type { VerifiedLabelProduct } from '../../labelStore/types.js';
import { getConfidence } from './openFoodFactsAdapter.js';
import { clampConfidenceToSource } from './sourcePolicy.js';
import type { ProductFacts, ProductFactsFieldKey, ProductFactsFieldSource, ProductFactsMissingField } from './types.js';

export interface VerifiedLabelMergeConflict {
  field: ProductFactsFieldKey;
  baseValue: string;
  verifiedValue: string;
  baseObservedAt: string | null;
  verifiedObservedAt: string;
  /** ADR-009 §7a: daha yeni tarihli insan onaylı kayıt geçerlidir. */
  winner: 'base' | 'verified';
}

export interface VerifiedLabelMergeResult {
  facts: ProductFacts;
  /** Çelişki sessizce çözülmez; çağıran taraf bunları kayda geçirir. */
  conflicts: VerifiedLabelMergeConflict[];
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeForComparison(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;,]+$/, '');
}

/** Tabanın gözlem zamanı yoksa veya geçersizse, tarihli insan onaylı kayıt yeni sayılır. */
function isVerifiedNewer(baseObservedAt: string | null | undefined, verifiedObservedAt: string): boolean {
  const base = baseObservedAt ? Date.parse(baseObservedAt) : Number.NaN;
  if (Number.isNaN(base)) return true;
  return Date.parse(verifiedObservedAt) > base;
}

/** Barkod için yalnız onaylı etiket kaydı varken (OFF'ta hiç yokken) kullanılır. */
export function productFactsFromVerifiedLabel(verified: VerifiedLabelProduct): ProductFacts {
  const productName = hasText(verified.fields.productName) ? verified.fields.productName : null;
  const ingredientsText = hasText(verified.fields.ingredientsText) ? verified.fields.ingredientsText : null;

  const missingFields: ProductFactsMissingField[] = [];
  if (!productName) missingFields.push('productName');
  missingFields.push('imageUrl');
  if (!ingredientsText) missingFields.push('ingredientsText');
  missingFields.push('allergens', 'nutrition', 'nutriScoreGrade', 'novaGroup', 'trafficLight');

  return {
    barcode: verified.barcode,
    productName,
    imageUrl: null,
    nutriScoreGrade: null,
    novaGroup: null,
    trafficLight: null,
    ingredientsText,
    // additives bilerek yok: boş dizi "katkısız" anlamına gelirdi (bkz. catalogAdapter.ts).
    allergenInfo: { dataStatus: 'unknown', declaredAllergens: [], traceAllergens: [], source: 'none' },
    dataSource: 'rafskoru_verified',
    isComplete: false,
    missingFields,
    confidence: clampConfidenceToSource('rafskoru_verified', getConfidence(missingFields)),
    sourceUrl: null,
    observedAt: verified.observedAt,
    verifiedAt: verified.approvedAt,
  };
}

/**
 * OFF tabanlı veriyi insan onaylı etiket kaydıyla alan alan birleştirir.
 *
 * - Onaylı kayıttaki boş alan tabandaki değeri SİLMEZ.
 * - productName: taban adı varsa korunur (arama/sepet ile aynı ad görünsün);
 *   onaylı kayıt yalnız eksik adı tamamlar.
 * - ingredientsText: taban boşsa onaylı kayıt tamamlar; ikisi de dolu ve
 *   farklıysa §7a uygulanır ve çelişki döndürülür.
 * - Alerjen alanları, isComplete ve confidence tabandan aynen gelir.
 * - Girdi nesneleri değiştirilmez.
 */
export function mergeVerifiedLabelIntoFacts(base: ProductFacts, verified: VerifiedLabelProduct): VerifiedLabelMergeResult {
  if (base.dataSource !== 'off') {
    throw new Error(`Onaylı etiket yalnız OFF tabanlı veriyle birleştirilir (taban: ${base.dataSource}).`);
  }
  if (hasText(base.barcode) && base.barcode !== verified.barcode) {
    throw new Error('Farklı barkodlu kayıtlar birleştirilemez.');
  }

  const verifiedSource: ProductFactsFieldSource = { source: 'rafskoru_verified', observedAt: verified.observedAt };
  const fieldSources: Partial<Record<ProductFactsFieldKey, ProductFactsFieldSource>> = { ...(base.fieldSources ?? {}) };
  const conflicts: VerifiedLabelMergeConflict[] = [];
  const filled = new Set<ProductFactsMissingField>();

  let productName = base.productName ?? null;
  if (!hasText(productName) && hasText(verified.fields.productName)) {
    productName = verified.fields.productName;
    fieldSources.productName = verifiedSource;
    filled.add('productName');
  }

  let ingredientsText = base.ingredientsText ?? null;
  const verifiedIngredients = verified.fields.ingredientsText;
  if (hasText(verifiedIngredients)) {
    if (!hasText(ingredientsText)) {
      ingredientsText = verifiedIngredients;
      fieldSources.ingredientsText = verifiedSource;
      filled.add('ingredientsText');
    } else if (normalizeForComparison(ingredientsText) !== normalizeForComparison(verifiedIngredients)) {
      const verifiedWins = isVerifiedNewer(base.observedAt, verified.observedAt);
      conflicts.push({
        field: 'ingredientsText',
        baseValue: ingredientsText,
        verifiedValue: verifiedIngredients,
        baseObservedAt: base.observedAt ?? null,
        verifiedObservedAt: verified.observedAt,
        winner: verifiedWins ? 'verified' : 'base',
      });
      if (verifiedWins) {
        ingredientsText = verifiedIngredients;
        fieldSources.ingredientsText = verifiedSource;
      }
    }
  }

  const usedVerified = Object.values(fieldSources).some((entry) => entry?.source === 'rafskoru_verified');

  const facts: ProductFacts = {
    ...base,
    productName,
    ingredientsText,
    missingFields: base.missingFields?.filter((field) => !filled.has(field)),
    ...(Object.keys(fieldSources).length > 0 ? { fieldSources } : {}),
    ...(usedVerified ? { verifiedAt: verified.approvedAt } : {}),
  };

  return { facts, conflicts };
}
