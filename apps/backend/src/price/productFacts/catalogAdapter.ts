// Yerel OFF-TR katalogdan (bellekte, sunucu açılışında yüklenmiş) ProductFacts
// üretir — canlı OFF isteği YAPILMAZ. Katalogda GTIN yoksa null döner; çağıran
// bu durumda canlı OFF yoluna düşer (bkz. priceProviderService.ts, tryFetchProductFacts).
import { getCatalog, type CatalogProduct } from '../../catalog/catalog.js';
import { classifyTrafficLightLevel } from './trafficLightClassifier.js';
import type {
  ProductFacts,
  ProductFactsAllergenInfo,
  ProductFactsConfidence,
  ProductFactsMissingField,
  ProductFactsNovaGroup,
  ProductFactsNutriScoreGrade,
  ProductFactsTrafficLight,
} from './types.js';

function buildTrafficLightFromCatalogNutrition(
  nutrition: CatalogProduct['nutrition100g'],
): ProductFactsTrafficLight {
  return {
    fat: null, // Katalog nutrition100g bugün toplam yağ taşımıyor (yalnız doymuş yağ).
    saturatedFat: classifyTrafficLightLevel(nutrition.saturatedFat, 'saturatedFat'),
    sugars: classifyTrafficLightLevel(nutrition.sugars, 'sugars'),
    salt: classifyTrafficLightLevel(nutrition.salt, 'salt'),
  };
}

const MISSING_FIELD_MAP: Record<string, ProductFactsMissingField> = {
  name: 'productName',
  image: 'imageUrl',
  ingredients: 'ingredientsText',
  allergens: 'allergens',
  nutriscore: 'nutriScoreGrade',
  nova: 'novaGroup',
};

function mapMissingFields(catalogMissing: string[]): ProductFactsMissingField[] {
  const mapped = new Set<ProductFactsMissingField>();
  for (const field of catalogMissing) {
    const known = MISSING_FIELD_MAP[field];
    if (known) {
      mapped.add(known);
      continue;
    }
    if (field.startsWith('nutrition.')) mapped.add('nutrition');
  }
  return [...mapped];
}

function mapConfidence(completeness: CatalogProduct['completeness']): ProductFactsConfidence {
  if (completeness === 'complete') return 'high';
  if (completeness === 'insufficient') return 'low';
  return 'medium';
}

/**
 * `allergens`/`traceAllergens`/`allergenInfo` alanları burada kanonik
 * AllergenKey değerleriyle (ör. 'milk') doldurulur — katalog ham OFF
 * etiketlerini (ör. 'en:milk') saklamıyor. Bu yalnız eski, profil-farkında
 * olmayan "İçerik" listesi gibi KOZMETİK gösterimleri etkiler (İngilizce
 * anahtar kelime görünebilir); GÜVENLİK kararı için hiçbir yerde
 * KULLANILMAZ — o yalnız catalogAllergenData üzerinden, AYNI birleştirme
 * fonksiyonuyla yapılır.
 */
export function productFactsFromCatalog(gtin: string): ProductFacts | null {
  const product = getCatalog().byId.get(gtin);
  if (!product) return null;

  const allergenInfo: ProductFactsAllergenInfo = {
    dataStatus: product.allergenData.dataStatus === 'unknown_or_unverified' ? 'unknown' : 'present',
    declaredAllergens: product.allergenData.declared,
    traceAllergens: product.allergenData.traces,
    source: 'off_structured',
  };

  return {
    barcode: product.productId,
    productName: product.name,
    imageUrl: product.imageUrl,
    nutriScoreGrade: (product.nutriScore.grade as ProductFactsNutriScoreGrade | null) ?? null,
    novaGroup: (product.nova.group as ProductFactsNovaGroup | null) ?? null,
    trafficLight: buildTrafficLightFromCatalogNutrition(product.nutrition100g),
    nutrition100g: product.nutrition100g,
    nutritionBasis: product.nutritionBasis,
    ingredientsText: product.allergenData.ingredientsEvidence.text,
    additives: [],
    allergens: product.allergenData.declared,
    traceAllergens: product.allergenData.traces,
    allergenInfo,
    catalogAllergenData: product.allergenData,
    dataSource: 'off',
    isComplete: product.completeness === 'complete',
    missingFields: mapMissingFields(product.missingFields),
    confidence: mapConfidence(product.completeness),
    sourceUrl: product.provenance.url,
    observedAt: product.provenance.observedAt,
  };
}
