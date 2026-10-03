// RafSkoru — Katalog-genelinde alternatif ürün önerisi (gerçek 11k+ ürün)
// src/price/alternatives/catalogAlternatives.ts
//
// Görev onayı (alternatif ürün önerisi): mevcut /api/price/alternatives
// (seed-candidates.json, 11 kayıt) buraya TAŞINMADI/değiştirilmedi — bu,
// gerçek katalogdan beslenen YENİ, bağımsız bir yol. Alerjen profiliyle
// eleme BURADA YAPILMAZ (profil cihazdan çıkmaz, bkz. rafskoru-invariants) —
// bu modül yalnız aynı productGroupKey'deki adayları, ham alerjen verisiyle
// ve fiyatsız RafSkoru'yla birlikte döner; profile göre son eleme ve (a)/(b)/(c)
// bölümlemesi mobil tarafta yapılır.
import type { CatalogProduct } from '../../catalog/catalog.js';
import { getCatalog } from '../../catalog/catalog.js';
import { UNCLASSIFIED_PRODUCT_GROUP_KEY } from '../../catalog/productGroupMap.js';
import { findProductGroupRegistryEntry } from '../productGroups/registry.js';
import { getCatalogRafScore } from '../rafScore/catalogRafScore.js';
import type { CatalogRafScoreResult } from '../rafScore/catalogRafScore.js';

export interface CatalogAlternativeProduct {
  productId: string;
  name: string | null;
  brand: string | null;
  quantityText: string | null;
  packageSize: CatalogProduct['packageSize'];
  productGroupKey: string;
  imageUrl: string | null;
  nutriScore: CatalogProduct['nutriScore'];
  nova: CatalogProduct['nova'];
  allergenData: CatalogProduct['allergenData'];
  completeness: CatalogProduct['completeness'];
  rafScore: CatalogRafScoreResult['rafScore'];
  scoreCoverageKey: string;
  scoreCoverageLabel: string;
}

export interface CatalogAlternativesResult {
  /** Katalogda bulunamadı veya grup bilinmiyorsa null — bu durumda candidates her zaman []. */
  currentProduct: CatalogAlternativeProduct | null;
  candidates: CatalogAlternativeProduct[];
}

function toAlternativeProduct(
  product: CatalogProduct,
  scored: CatalogRafScoreResult,
): CatalogAlternativeProduct {
  return {
    productId: product.productId,
    name: product.name,
    brand: product.brand,
    quantityText: product.quantityText,
    packageSize: product.packageSize,
    productGroupKey: product.productGroupKey,
    imageUrl: product.imageUrl,
    nutriScore: product.nutriScore,
    nova: product.nova,
    allergenData: product.allergenData,
    completeness: product.completeness,
    rafScore: scored.rafScore,
    scoreCoverageKey: scored.scoreCoverageKey,
    scoreCoverageLabel: scored.scoreCoverageLabel,
  };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export function getCatalogAlternatives(input: {
  barcode: string;
  limit?: number;
}): CatalogAlternativesResult {
  const catalog = getCatalog();
  const current = catalog.byId.get(input.barcode);

  if (!current) {
    return { currentProduct: null, candidates: [] };
  }

  const currentScored = getCatalogRafScore(current);
  const currentProduct = currentScored ? toAlternativeProduct(current, currentScored) : null;

  const groupKey = current.productGroupKey;
  const registryEntry = findProductGroupRegistryEntry(groupKey);

  // Grup bilinmiyorsa veya grup için alternatif önerisi açıkça kapalıysa
  // (ör. bebek maması — "Restricted in beta unless human-curated allowlist
  // is introduced", bkz. registry.ts notu) bölüm hiç gösterilmez.
  if (
    !currentProduct ||
    groupKey === UNCLASSIFIED_PRODUCT_GROUP_KEY ||
    registryEntry?.alternativeEligibility === 'disabled'
  ) {
    return { currentProduct, candidates: [] };
  }

  const currentScore = currentProduct.rafScore.score;
  const limit = Math.min(Math.max(input.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  const candidates: CatalogAlternativeProduct[] = [];
  for (const product of catalog.products) {
    if (product.productId === current.productId) continue;
    if (product.productGroupKey !== groupKey) continue;

    const scored = getCatalogRafScore(product);
    if (!scored || scored.rafScore.score === null) continue;

    // Mevcut üründen düşük puanlı aday gösterilmez (görev onayı — sıralama
    // güveni). Mevcut ürünün puanı yoksa (nadiren) bu eleme uygulanmaz.
    if (currentScore !== null && scored.rafScore.score < currentScore) continue;

    candidates.push(toAlternativeProduct(product, scored));
  }

  candidates.sort((a, b) => (b.rafScore.score ?? 0) - (a.rafScore.score ?? 0));

  return { currentProduct, candidates: candidates.slice(0, limit) };
}
