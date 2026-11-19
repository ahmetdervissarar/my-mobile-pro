/**
 * RafSkoru — İnsan onaylı etiket kaydından ProductFacts (ADR-009 §4, §7a)
 * apps/backend/src/price/productFacts/verifiedLabelFacts.ts
 *
 * Saf fonksiyonlardır; veritabanına veya ağa dokunmaz ve henüz hiçbir
 * çözümleme yoluna BAĞLI DEĞİLDİR (bağlama: Faz 1, İş 1.3b).
 *
 * Taşınan alanlar: productName, ingredientsText ve — koşulları sağlanırsa —
 * etiketteki besin tablosundan hesaplanan Nutri-Score (İş 1.3c).
 *
 * ALERJEN ALANLARINA DOKUNULMAZ. Onaylı kayıttan alerjen beyanı üretmek
 * alerjen kapısına dokunan ayrı, incelemeli bir iştir. Tek başına onaylı
 * kayıt allergenInfo.dataStatus='unknown' taşır; birleştirmede tabandaki
 * alerjen alanları aynen korunur.
 *
 * Nutri-Score yalnız şu koşulların HEPSİ sağlanınca hesaplanır; aksi hâlde
 * not üretilmez ve neden (skipReason) döndürülür — tahmin yoktur:
 *   - ürün türü biliniyor (OFF kategorisi, onaylayan veya kullanıcı beyanı)
 *   - besin tablosunun birimi (100 g / 100 ml) okunmuş ve türle uyumlu
 *   - zorunlu besin değerleri okunmuş (enerji, şeker, doymuş yağ, tuz, protein)
 *   - içecekte içindekiler metni var (tatlandırıcı olup olmadığı oradan görülür)
 */
import type { LabelFields, LabelProductKindSource, VerifiedLabelProduct } from '../../labelStore/types.js';
import {
  computeNutriScore2023,
  type NutriScoreCategory,
  type NutriScoreGrade,
} from '../../nutriScore/nutriScore2023.js';
import { getConfidence } from './openFoodFactsAdapter.js';
import type { ScoreScopeExclusion } from '../rafScore/scoreScope.js';
import { clampConfidenceToSource } from './sourcePolicy.js';
import type { ProductFacts, ProductFactsFieldKey, ProductFactsFieldSource, ProductFactsMissingField } from './types.js';

export interface VerifiedLabelMergeConflict {
  field: ProductFactsFieldKey;
  baseValue: string;
  verifiedValue: string;
  baseObservedAt: string | null;
  verifiedObservedAt: string;
  /**
   * ingredientsText: ADR-009 §7a — daha yeni tarihli insan onaylı kayıt geçerli.
   * nutriScoreGrade: etiketten HESAPLANAN not varsayım içerebildiği için
   * (ör. meyve-sebze oranı 0 kabul edilir) tabandaki notun yerine geçmez;
   * fark yalnız bildirilir ve karar insana bırakılır (her zaman 'base').
   */
  winner: 'base' | 'verified';
}

export type LabelNutriScoreCategorySource = 'off_category' | LabelProductKindSource;

export interface LabelNutriScoreDerivation {
  grade: NutriScoreGrade;
  category: NutriScoreCategory;
  categorySource: LabelNutriScoreCategorySource;
  /** Hesabın yaptığı varsayımlar (ör. fiber_assumed_0, fvl_assumed_0). */
  assumptions: string[];
  algorithmVersion: string;
}

export type LabelNutriScoreSkipReason =
  | 'no_nutrition'
  | 'unknown_product_kind'
  | 'not_applicable'
  | 'basis_unknown'
  | 'basis_mismatch'
  | 'insufficient_nutrients'
  | 'beverage_sweeteners_unknown';

export type LabelNutriScoreOutcome =
  | { status: 'derived'; derivation: LabelNutriScoreDerivation }
  | { status: 'skipped'; reason: LabelNutriScoreSkipReason; missing?: string[] };

export interface VerifiedLabelMergeOptions {
  /**
   * Tabandaki ürünün OFF kategorisinden türetilmiş Nutri-Score türü
   * (CatalogProduct.nutriScoreCategory). Bilinmiyorsa null/verilmez.
   */
  baseNutriScoreCategory?: NutriScoreCategory | null;
}

export interface VerifiedLabelMergeResult {
  facts: ProductFacts;
  /** Çelişki sessizce çözülmez; çağıran taraf bunları kayda geçirir. */
  conflicts: VerifiedLabelMergeConflict[];
  nutriScore: LabelNutriScoreOutcome;
}

export interface VerifiedLabelFactsResult {
  facts: ProductFacts;
  nutriScore: LabelNutriScoreOutcome;
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

// Kalorisiz tatlandırıcılar: catalog/nutriScoreCategory.ts'teki
// SWEETENER_ADDITIVE_TAGS ile AYNI E kodları + etikette geçen adları.
const SWEETENER_E_CODE_PATTERN = /(?<![a-z0-9])e[\s-]?(950|951|952|954|955|960|961|962|969)(?![0-9])/;
const SWEETENER_NAME_PATTERN =
  /asesülfam|asesulfam|acesulfam|aspartam|siklamat|cyclamat|sakarin|saccharin|sukraloz|sucralos|steviol|stevia|neotam|advantam/;

/** İçindekiler metninde kalorisiz tatlandırıcı geçiyor mu? Yalnız OKUNMUŞ metne bakar. */
export function ingredientsMentionNonNutritiveSweetener(ingredientsText: string): boolean {
  const text = ingredientsText.toLocaleLowerCase('tr-TR');
  return SWEETENER_E_CODE_PATTERN.test(text) || SWEETENER_NAME_PATTERN.test(text);
}

/**
 * Etiketteki besin tablosundan Nutri-Score. Koşullardan biri eksikse not
 * üretmez; hangi koşulun eksik olduğunu döndürür.
 */
export function deriveNutriScoreFromLabel(
  fields: LabelFields,
  kind: { category: NutriScoreCategory; source: LabelNutriScoreCategorySource } | null,
): LabelNutriScoreOutcome {
  if (!kind) return { status: 'skipped', reason: 'unknown_product_kind' };
  if (kind.category === 'not_applicable') return { status: 'skipped', reason: 'not_applicable' };

  const nutrition = fields.nutritionPer100;
  const isBeverage = kind.category === 'beverage';
  let hasNonNutritiveSweeteners: boolean | null = null;

  // Su, besin tablosu olmadan da sınıflanır (algoritma kuralı).
  if (kind.category !== 'water') {
    if (!nutrition) return { status: 'skipped', reason: 'no_nutrition' };
    if (nutrition.basis === null) return { status: 'skipped', reason: 'basis_unknown' };
    // İçecek 100 ml, diğer türler 100 g üzerinden puanlanır; yoğunluk
    // bilinmeden birimler birbirine çevrilmez.
    if ((nutrition.basis === '100ml') !== isBeverage) return { status: 'skipped', reason: 'basis_mismatch' };

    if (isBeverage) {
      if (!hasText(fields.ingredientsText)) return { status: 'skipped', reason: 'beverage_sweeteners_unknown' };
      hasNonNutritiveSweeteners = ingredientsMentionNonNutritiveSweetener(fields.ingredientsText);
    }
  }

  const result = computeNutriScore2023({
    category: kind.category,
    energyKcal: nutrition?.energyKcal ?? null,
    sugars: nutrition?.sugars ?? null,
    saturatedFat: nutrition?.saturatedFat ?? null,
    fat: nutrition?.fat ?? null,
    salt: nutrition?.salt ?? null,
    proteins: nutrition?.protein ?? null,
    fiber: nutrition?.fiber ?? null,
    fruitsVegLegumesPercent: null,
    hasNonNutritiveSweeteners,
  });

  if (result.status === 'computed') {
    return {
      status: 'derived',
      derivation: {
        grade: result.grade,
        category: kind.category,
        categorySource: kind.source,
        assumptions: result.assumptions,
        algorithmVersion: result.algorithmVersion,
      },
    };
  }
  if (result.status === 'not_applicable') return { status: 'skipped', reason: 'not_applicable' };
  return { status: 'skipped', reason: 'insufficient_nutrients', missing: result.missing };
}

function verifiedKind(
  verified: VerifiedLabelProduct,
): { category: NutriScoreCategory; source: LabelNutriScoreCategorySource } | null {
  if (!verified.productKind || !verified.productKindSource) return null;
  // Alkollü içeceğe (ADR-009 §11) ve gıda dışı ürüne (§14) Nutri-Score uygulanmaz.
  const category: NutriScoreCategory = scoreScopeExclusionForKind(verified.productKind)
    ? 'not_applicable'
    : (verified.productKind as NutriScoreCategory);
  return { category, source: verified.productKindSource };
}

/**
 * Ürün türünden puan kapsamı dışı bırakma nedeni. Yalnız yapılandırılmış türe
 * bakar; ürün adından çıkarım yoktur. Kayıt için scoreScopeExclusionForVerified
 * kullanılır (yalnız onaylayanın seçimi geçerlidir).
 */
export function scoreScopeExclusionForKind(kind: VerifiedLabelProduct['productKind']): ScoreScopeExclusion | null {
  if (kind === 'alcoholic_beverage') return 'alcoholic_beverage';
  if (kind === 'non_food') return 'non_food';
  return null;
}

/**
 * Onaylı kayıttan kapsam dışı bırakma: YALNIZ onaylayanın seçtiği tür
 * (productKindSource 'approver') ürünü puan kapsamı dışına çıkarır (ADR-009
 * §11, §14). Fotoğrafı gönderenin onaylanmamış beyanı ('user_declared')
 * bunu yapamaz; o beyan yalnız Nutri-Score hesaplamamaya yol açabilir.
 */
export function scoreScopeExclusionForVerified(verified: VerifiedLabelProduct): ScoreScopeExclusion | null {
  return verified.productKindSource === 'approver' ? scoreScopeExclusionForKind(verified.productKind) : null;
}

/** Barkod için yalnız onaylı etiket kaydı varken (OFF'ta hiç yokken) kullanılır. */
export function productFactsFromVerifiedLabel(verified: VerifiedLabelProduct): VerifiedLabelFactsResult {
  const productName = hasText(verified.fields.productName) ? verified.fields.productName : null;
  const ingredientsText = hasText(verified.fields.ingredientsText) ? verified.fields.ingredientsText : null;
  const nutriScore = deriveNutriScoreFromLabel(verified.fields, verifiedKind(verified));
  const grade = nutriScore.status === 'derived' ? nutriScore.derivation.grade : null;

  const missingFields: ProductFactsMissingField[] = [];
  if (!productName) missingFields.push('productName');
  missingFields.push('imageUrl');
  if (!ingredientsText) missingFields.push('ingredientsText');
  missingFields.push('allergens');
  if (!grade) missingFields.push('nutrition', 'nutriScoreGrade');
  missingFields.push('novaGroup', 'trafficLight');

  const facts: ProductFacts = {
    barcode: verified.barcode,
    productName,
    imageUrl: null,
    nutriScoreGrade: grade,
    novaGroup: null,
    trafficLight: null,
    ingredientsText,
    // additives bilerek yok: boş dizi "katkısız" anlamına gelirdi (bkz. catalogAdapter.ts).
    allergenInfo: { dataStatus: 'unknown', declaredAllergens: [], traceAllergens: [], source: 'none' },
    dataSource: 'rafskoru_verified',
    ...(scoreScopeExclusionForVerified(verified) ? { scoreScopeExclusion: scoreScopeExclusionForVerified(verified) } : {}),
    isComplete: false,
    missingFields,
    confidence: clampConfidenceToSource('rafskoru_verified', getConfidence(missingFields)),
    sourceUrl: null,
    observedAt: verified.observedAt,
    verifiedAt: verified.approvedAt,
  };

  return { facts, nutriScore };
}

/**
 * OFF tabanlı veriyi insan onaylı etiket kaydıyla alan alan birleştirir.
 *
 * - Onaylı kayıttaki boş alan tabandaki değeri SİLMEZ.
 * - productName: taban adı varsa korunur (arama/sepet ile aynı ad görünsün);
 *   onaylı kayıt yalnız eksik adı tamamlar.
 * - ingredientsText: taban boşsa onaylı kayıt tamamlar; ikisi de dolu ve
 *   farklıysa §7a uygulanır ve çelişki döndürülür.
 * - nutriScoreGrade: taban notu yoksa etiketten hesaplanan not tamamlar;
 *   taban notu varsa korunur, fark çelişki olarak döndürülür.
 * - Ürün türü önceliği: onaylayanın belirlediği tür > OFF kategorisi >
 *   kullanıcı beyanı.
 * - Alerjen beyan/iz listeleri, dataStatus, isComplete ve confidence tabandan
 *   aynen gelir. Tek istisna: içindekiler onaylı kayıttan alındıysa
 *   catalogAllergenData.ingredientsEvidence aynı metni taşır (yalnız kanıt
 *   metni; sınıflandırma değişmez).
 * - İki içindekiler metni farklıysa (hangisi kazanırsa kazansın) alerjen
 *   kontrolü İKİSİNE bakar: allergenCheckIngredientsText ve kanıt metni iki
 *   metni birlikte taşır (ADR-009 §12). Ekranda gösterilen ingredientsText
 *   tek metindir.
 * - Girdi nesneleri değiştirilmez.
 */
export function mergeVerifiedLabelIntoFacts(
  base: ProductFacts,
  verified: VerifiedLabelProduct,
  options: VerifiedLabelMergeOptions = {},
): VerifiedLabelMergeResult {
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
  // İki kaynağın içindekiler metni farklıysa alerjen kontrolü İKİSİNE birden
  // bakar (ADR-009 §12). Hangisi ekranda gösterilirse gösterilsin diğeri
  // kanıttan düşmez: onaylı metin eksik okunmuş/kısaltılmışsa OFF metnindeki
  // alerjen, OFF metni eskiyse onaylı metindeki yeni alerjen yine uyarı üretir.
  let otherIngredientsForAllergenCheck: string | null = null;
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
        otherIngredientsForAllergenCheck = ingredientsText;
        ingredientsText = verifiedIngredients;
        fieldSources.ingredientsText = verifiedSource;
      } else {
        otherIngredientsForAllergenCheck = verifiedIngredients;
      }
    }
  }
  const allergenCheckIngredientsText =
    hasText(ingredientsText) && hasText(otherIngredientsForAllergenCheck)
      ? `${ingredientsText}\n${otherIngredientsForAllergenCheck}`
      : null;

  const approverKind = verified.productKindSource === 'approver' ? verifiedKind(verified) : null;
  const offKind = options.baseNutriScoreCategory
    ? { category: options.baseNutriScoreCategory, source: 'off_category' as const }
    : null;
  const nutriScore = deriveNutriScoreFromLabel(verified.fields, approverKind ?? offKind ?? verifiedKind(verified));

  let nutriScoreGrade = base.nutriScoreGrade ?? null;
  if (nutriScore.status === 'derived') {
    const labelGrade = nutriScore.derivation.grade;
    if (!nutriScoreGrade) {
      nutriScoreGrade = labelGrade;
      fieldSources.nutriScoreGrade = verifiedSource;
      filled.add('nutriScoreGrade');
      filled.add('nutrition');
    } else if (nutriScoreGrade !== labelGrade) {
      conflicts.push({
        field: 'nutriScoreGrade',
        baseValue: nutriScoreGrade,
        verifiedValue: labelGrade,
        baseObservedAt: base.observedAt ?? null,
        verifiedObservedAt: verified.observedAt,
        winner: 'base',
      });
    }
  }

  // Kapsam dışı bırakma yalnız daraltır: OFF veya onaylı kayıttan biri ürünü
  // kapsam dışı sayıyorsa (alkollü içecek §11, gıda dışı ürün §14) Nutri-Score
  // uygulanmaz — katalogun daha önce hesapladığı not da gösterilmez. Neden
  // olarak onaylayanın seçtiği tür önceliklidir (insan kararı).
  const scopeExclusion: ScoreScopeExclusion | null =
    scoreScopeExclusionForVerified(verified) ?? base.scoreScopeExclusion ?? null;
  const outOfScope = scopeExclusion !== null;
  if (outOfScope) {
    nutriScoreGrade = null;
    delete fieldSources.nutriScoreGrade;
    filled.delete('nutriScoreGrade');
    filled.delete('nutrition');
  }

  const usedVerified = Object.values(fieldSources).some((entry) => entry?.source === 'rafskoru_verified');

  // İçindekiler onaylı kayıttan geldiyse, mobil alerjen satırının baktığı
  // kanıt metni de AYNI metin olmalıdır (İş 1.3b, inceleme bulgusu 1). Aksi
  // hâlde risk motoru onaylı metinden uyarı üretirken alerjen satırı aynı
  // alerjen için "belirtilmemiş" diyebilirdi. Beyan/iz listeleri ve
  // dataStatus DEĞİŞMEZ: bu yalnız mevcut "daha az temkinli olamaz"
  // yükseltmesinin girdisini tamamlar, sonucu asla daha az temkinli yapamaz.
  const ingredientsFromVerified = fieldSources.ingredientsText?.source === 'rafskoru_verified';
  const verifiedLang =
    verified.fields.ingredientsLang === null
      ? null
      : verified.fields.ingredientsLang.toLowerCase().startsWith('tr')
        ? ('tr' as const)
        : ('other' as const);
  const catalogAllergenData = !base.catalogAllergenData
    ? base.catalogAllergenData
    : allergenCheckIngredientsText
      ? {
          // İki metin farklı: kanıt metni ikisini birlikte taşır (ADR-009 §12).
          ...base.catalogAllergenData,
          ingredientsEvidence: {
            text: allergenCheckIngredientsText,
            lang: ingredientsFromVerified ? verifiedLang : base.catalogAllergenData.ingredientsEvidence.lang,
            source: 'off_and_rafskoru_verified' as const,
          },
        }
      : ingredientsFromVerified && hasText(ingredientsText)
        ? {
            ...base.catalogAllergenData,
            ingredientsEvidence: { text: ingredientsText, lang: verifiedLang, source: 'rafskoru_verified' as const },
          }
        : base.catalogAllergenData;

  const facts: ProductFacts = {
    ...base,
    productName,
    ingredientsText,
    ...(allergenCheckIngredientsText ? { allergenCheckIngredientsText } : {}),
    nutriScoreGrade,
    ...(catalogAllergenData ? { catalogAllergenData } : {}),
    missingFields: base.missingFields?.filter((field) => !filled.has(field)),
    ...(Object.keys(fieldSources).length > 0 ? { fieldSources } : {}),
    ...(usedVerified ? { verifiedAt: verified.approvedAt } : {}),
    ...(scopeExclusion ? { scoreScopeExclusion: scopeExclusion } : {}),
  };

  return { facts, conflicts, nutriScore };
}
