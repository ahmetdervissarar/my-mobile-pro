// RafSkoru — Ürün Kataloğu
// src/catalog/catalog.ts
//
// apps/backend/data/off-tr/products.jsonl'i (npm run import:off-tr çıktısı)
// sunucu açılışında belleğe yükler. Dosya yoksa katalog boş kalır; hiçbir
// uç nokta bu yüzden çökmez (bkz. görev değişmez kural 6). Veritabanı veya
// dış servis kullanılmaz.
import { existsSync, readFileSync } from 'node:fs';

import { computeNutriScore2023 } from '../nutriScore/nutriScore2023.js';
import { foldSearchText } from '../search/suggestions.js';
import type {
  AllergenDataStatus,
  AllergenKey,
  OffImportRecord,
} from '../tools/offTurkey/normalize.js';
import { categoryFromOffTags, hasNonNutritiveSweetenerTag } from './nutriScoreCategory.js';
import { mapOffCategoriesToProductGroupKey } from './productGroupMap.js';

export type CatalogPackageUnit = 'ml' | 'g' | 'unit';

export interface CatalogPackageSize {
  amount: number;
  unit: CatalogPackageUnit;
}

export type CatalogNutriScoreSource = 'rafskoru_computed' | 'off' | null;
export type CatalogNutriScoreStatus = 'computed' | 'off' | 'insufficient_data';

export interface CatalogNutriScore {
  grade: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  status: CatalogNutriScoreStatus;
  source: CatalogNutriScoreSource;
  algorithmVersion: string | null;
  assumptions: string[];
}

export interface CatalogNova {
  group: 1 | 2 | 3 | 4 | null;
  source: 'off' | null;
}

export interface CatalogAllergenData {
  declared: AllergenKey[];
  traces: AllergenKey[];
  dataStatus: AllergenDataStatus;
}

export interface CatalogProduct {
  productId: string;
  name: string | null;
  brand: string | null;
  quantityText: string | null;
  packageSize?: CatalogPackageSize;
  productGroupKey: string;
  imageUrl: string | null;
  nutriScore: CatalogNutriScore;
  nova: CatalogNova;
  allergenData: CatalogAllergenData;
  provenance: OffImportRecord['provenance'];
  missingFields: string[];
  completeness: OffImportRecord['completeness'];
  /** Arama eşleştirmesi için önceden katlanmış ad+marka metni. Dışa aktarılmaz. */
  searchText: string;
}

export interface Catalog {
  products: CatalogProduct[];
  byId: Map<string, CatalogProduct>;
  loadedAt: string;
  sourcePath: string | null;
}

function createEmptyCatalog(): Catalog {
  return { products: [], byId: new Map(), loadedAt: new Date().toISOString(), sourcePath: null };
}

let currentCatalog: Catalog = createEmptyCatalog();

/** "1 L", "500 g", "250 ml", "1 kg", "6 adet" gibi açık biçimler dışında hiçbir şey ayrıştırmaz. */
export function parsePackageSize(quantityText: string | null): CatalogPackageSize | undefined {
  if (!quantityText) return undefined;

  const match = /^([0-9]+(?:[.,][0-9]+)?)\s*(ml|l|g|kg|adet)$/i.exec(quantityText.trim());
  if (!match) return undefined;

  const amount = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  const unit = match[2].toLowerCase();
  if (unit === 'l') return { amount: amount * 1000, unit: 'ml' };
  if (unit === 'kg') return { amount: amount * 1000, unit: 'g' };
  if (unit === 'ml') return { amount, unit: 'ml' };
  if (unit === 'g') return { amount, unit: 'g' };
  return { amount, unit: 'unit' };
}

function buildNutriScore(record: OffImportRecord): CatalogNutriScore {
  const category = categoryFromOffTags(record.categories);
  const n = record.nutrition100g;

  const result = computeNutriScore2023({
    category,
    energyKcal: n.energyKcal,
    sugars: n.sugars,
    saturatedFat: n.saturatedFat,
    fat: n.fat,
    salt: n.salt,
    proteins: n.proteins,
    fiber: n.fiber,
    fruitsVegLegumesPercent: null,
    hasNonNutritiveSweeteners: hasNonNutritiveSweetenerTag(record.additives),
  });

  if (result.status === 'computed') {
    return {
      grade: result.grade,
      status: 'computed',
      source: 'rafskoru_computed',
      algorithmVersion: result.algorithmVersion,
      assumptions: result.assumptions,
    };
  }

  if (record.nutriscoreGrade) {
    return {
      grade: record.nutriscoreGrade.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E',
      status: 'off',
      source: 'off',
      algorithmVersion: null,
      assumptions: [],
    };
  }

  return { grade: null, status: 'insufficient_data', source: null, algorithmVersion: null, assumptions: [] };
}

function buildNova(record: OffImportRecord): CatalogNova {
  if (record.novaGroup) {
    return { group: record.novaGroup, source: 'off' };
  }

  return { group: null, source: null };
}

/** OFF'tan gelen alerjen durumu aynen korunur; burada yeniden yorumlanmaz. */
function buildAllergenData(record: OffImportRecord): CatalogAllergenData {
  return {
    declared: record.allergens.declared,
    traces: record.allergens.traces,
    dataStatus: record.allergens.dataStatus,
  };
}

export function buildCatalogProduct(record: OffImportRecord): CatalogProduct {
  const packageSize = parsePackageSize(record.quantity);

  return {
    productId: record.gtin,
    name: record.name,
    brand: record.brand,
    quantityText: record.quantity,
    ...(packageSize ? { packageSize } : {}),
    productGroupKey: mapOffCategoriesToProductGroupKey(record.categories),
    imageUrl: record.imageUrl,
    nutriScore: buildNutriScore(record),
    nova: buildNova(record),
    allergenData: buildAllergenData(record),
    provenance: record.provenance,
    missingFields: record.missingFields,
    completeness: record.completeness,
    searchText: foldSearchText(`${record.name ?? ''} ${record.brand ?? ''}`),
  };
}

/**
 * JSONL dosyasından katalogu belleğe yükler. Dosya yoksa veya okunamazsa
 * katalog boş kalır ve bir uyarı log'lanır; hata fırlatılmaz.
 */
export function loadCatalog(path: string): Catalog {
  if (!existsSync(path)) {
    console.warn(`[catalog] ${path} bulunamadı; katalog boş yüklendi.`);
    currentCatalog = createEmptyCatalog();
    return currentCatalog;
  }

  try {
    const raw = readFileSync(path, 'utf8');
    const products: CatalogProduct[] = [];

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const record = JSON.parse(trimmed) as OffImportRecord;
        products.push(buildCatalogProduct(record));
      } catch {
        // Bozuk JSONL satırı atlanır; katalog kısmi kalmaya devam eder.
      }
    }

    currentCatalog = {
      products,
      byId: new Map(products.map((product) => [product.productId, product])),
      loadedAt: new Date().toISOString(),
      sourcePath: path,
    };
    console.log(`[catalog] ${products.length} ürün yüklendi (${path}).`);
  } catch (err) {
    console.warn(`[catalog] ${path} okunamadı (${(err as Error).message}); katalog boş kaldı.`);
    currentCatalog = createEmptyCatalog();
  }

  return currentCatalog;
}

export function getCatalog(): Catalog {
  return currentCatalog;
}
