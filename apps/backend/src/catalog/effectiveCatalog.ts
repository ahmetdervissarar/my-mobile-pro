/**
 * RafSkoru — Onaylı etiket kayıtlarıyla tamamlanmış katalog görünümü (ADR-009, İş 1.3d)
 * apps/backend/src/catalog/effectiveCatalog.ts
 *
 * Ürün sayfası, OFF verisini insan onaylı etiket kaydıyla birleştirir
 * (priceProviderService → applyVerifiedLabel). Liste ekranları (arama,
 * kategori, sepet, alternatifler) katalogu doğrudan okuduğu için aynı ürün
 * listede farklı puan ve alerjen durumu gösterebiliyordu. Bu modül listelere
 * AYNI birleştirmenin sonucunu verir:
 *
 *   getEffectiveProductFacts   → puanlama girdisi (ürün sayfasıyla birebir aynı)
 *   getEffectiveCatalogProduct → liste satırı (ad, Nutri-Score, alerjen kanıt metni)
 *   getEffectiveCatalogProducts→ arama/süzme için bütün ürünler
 *
 * Katalogun kendisi (getCatalog) DEĞİŞTİRİLMEZ: ürün sayfası birleştirmeyi
 * katalog verisi üzerinden kendisi yapar; katalog zaten birleştirilmiş olsaydı
 * alan bazındaki köken bilgisi (fieldSources) kaybolurdu.
 *
 * Onaylı kayıtlar bellekte tutulur ve onay sayacı (getVerifiedRevision) ya da
 * katalog yüklemesi değişince yenilenir. Onaylanmamış aday kayıtlar hiçbir
 * zaman kullanılmaz. Alerjen beyan/iz listeleri ve veri durumu değişmez;
 * yalnız içindekiler onaylı kayıttan geldiyse kanıt metni tamamlanır.
 */
import { getVerifiedRevision, isLabelStoreDbReady, listCurrentVerified } from '../labelStore/db.js';
import type { VerifiedLabelProduct } from '../labelStore/types.js';
import { productFactsFromCatalog } from '../price/productFacts/catalogAdapter.js';
import type { ProductFacts } from '../price/productFacts/types.js';
import { resolveWithVerifiedLabel, type VerifiedLabelResolution } from '../price/productFacts/verifiedLabelResolver.js';
import { foldSearchText } from '../search/suggestions.js';
import { getCatalog, type CatalogNutriScore, type CatalogProduct } from './catalog.js';

interface VerifiedEntry {
  product: CatalogProduct;
  facts: ProductFacts | null;
}

let cacheKey: string | null = null;
let verifiedByBarcode = new Map<string, VerifiedLabelProduct>();
const verifiedEntries = new Map<string, VerifiedEntry>();
let effectiveProducts: CatalogProduct[] | null = null;

function computeCacheKey(): string {
  return `${getCatalog().loadedAt}|${isLabelStoreDbReady() ? getVerifiedRevision() : 'kapalı'}`;
}

function refresh(): void {
  const key = computeCacheKey();
  if (key === cacheKey) return;

  cacheKey = key;
  verifiedEntries.clear();
  effectiveProducts = null;
  verifiedByBarcode = new Map();

  if (!isLabelStoreDbReady()) return;
  try {
    for (const verified of listCurrentVerified()) verifiedByBarcode.set(verified.barcode, verified);
  } catch (err) {
    console.warn(`[effective-catalog] onaylı kayıtlar okunamadı; listeler yalnız OFF verisini kullanacak: ${(err as Error).message}`);
    verifiedByBarcode = new Map();
  }
}

function overlayProduct(product: CatalogProduct, resolution: VerifiedLabelResolution): CatalogProduct {
  const facts = resolution.facts;
  if (!facts) return product;

  const sources = facts.fieldSources ?? {};

  const name =
    sources.productName?.source === 'rafskoru_verified' ? (facts.productName ?? product.name) : product.name;

  const derived = resolution.nutriScore?.status === 'derived' ? resolution.nutriScore.derivation : null;
  const nutriScore: CatalogNutriScore =
    sources.nutriScoreGrade?.source === 'rafskoru_verified' && derived
      ? {
          grade: derived.grade,
          status: 'computed',
          source: 'rafskoru_label',
          algorithmVersion: derived.algorithmVersion,
          assumptions: derived.assumptions,
        }
      : product.nutriScore;

  // Birleştirme alerjen sınıflandırmasını değiştirmez; yalnız kanıt metnini
  // tamamlayabilir (bkz. verifiedLabelFacts.ts).
  const allergenData = facts.catalogAllergenData ?? product.allergenData;

  if (name === product.name && nutriScore === product.nutriScore && allergenData === product.allergenData) {
    return product;
  }

  return {
    ...product,
    name,
    nutriScore,
    allergenData,
    searchText: name === product.name ? product.searchText : foldSearchText(`${name ?? ''} ${product.brand ?? ''}`),
  };
}

function getVerifiedEntry(product: CatalogProduct, verified: VerifiedLabelProduct): VerifiedEntry {
  const cached = verifiedEntries.get(product.productId);
  if (cached) return cached;

  const base = productFactsFromCatalog(product.productId);
  let entry: VerifiedEntry = { product, facts: base };

  if (base) {
    try {
      const resolution = resolveWithVerifiedLabel(product.productId, base, product.nutriScoreCategory, verified);
      entry = { product: overlayProduct(product, resolution), facts: resolution.facts };
    } catch (err) {
      console.warn(`[effective-catalog] onaylı etiket uygulanamadı; OFF verisiyle devam ediliyor: ${(err as Error).message}`);
    }
  }

  verifiedEntries.set(product.productId, entry);
  return entry;
}

/** Liste önbelleklerinin anahtarı: katalog yüklemesi veya onaylı kayıt kümesi değişince değişir. */
export function getEffectiveCatalogCacheKey(): string {
  refresh();
  return cacheKey!;
}

/** Liste satırı için ürün. Onaylı kaydı yoksa AYNI nesne döner. */
export function getEffectiveCatalogProduct(product: CatalogProduct): CatalogProduct {
  refresh();
  const verified = verifiedByBarcode.get(product.productId);
  return verified ? getVerifiedEntry(product, verified).product : product;
}

/** Puanlama girdisi — ürün sayfasının kullandığı birleştirmeyle birebir aynı. */
export function getEffectiveProductFacts(product: CatalogProduct): ProductFacts | null {
  refresh();
  const verified = verifiedByBarcode.get(product.productId);
  return verified ? getVerifiedEntry(product, verified).facts : productFactsFromCatalog(product.productId);
}

/** Arama ve süzme için bütün katalog ürünleri, onaylı kayıtlarla tamamlanmış hâliyle. */
export function getEffectiveCatalogProducts(): CatalogProduct[] {
  refresh();
  if (!effectiveProducts) {
    const products = getCatalog().products;
    effectiveProducts = verifiedByBarcode.size === 0 ? products : products.map(getEffectiveCatalogProduct);
  }
  return effectiveProducts;
}

/** Yalnız testler için. */
export function __resetEffectiveCatalogForTesting(): void {
  cacheKey = null;
  verifiedByBarcode = new Map();
  verifiedEntries.clear();
  effectiveProducts = null;
}
