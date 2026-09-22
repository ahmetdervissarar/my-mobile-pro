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
import type { AllergenKey, OffImportRecord } from '../tools/offTurkey/normalize.js';
import { classifyAllergenTags } from '../tools/offTurkey/offAllergenMap.js';
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

/**
 * Katalog düzeyinde yalnız üç durum vardır — not_listed_in_available_data
 * BURADA yoktur; o yalnız çip düzeyinde, profil alerjeni başına bir
 * sonuçtur (bkz. src/riskEngine/catalogAllergenChip.ts, mobil).
 * - present: ham etiketlerin TAMAMI bilinen bir kovaya (A veya B) düştü.
 * - partial: en az bir ham etiket hiçbir kovaya düşmedi (rawUnmapped doldu).
 * - unknown_or_unverified: hiç ham etiket yok (içindekiler olsa da olmasa da).
 */
export type CatalogAllergenDataStatus = 'present' | 'partial' | 'unknown_or_unverified';

export interface CatalogIngredientsEvidence {
  text: string | null;
  lang: 'tr' | 'other' | null;
  source: 'off';
}

export interface CatalogAllergenData {
  declared: AllergenKey[];
  traces: AllergenKey[];
  /** AB/TR zorunlu alerjenlerden profilde modellenmemiş ama tanınan ham etiketler (ör. en:celery). */
  recognizedUnmodeled: string[];
  /** Ne modellenmiş ne tanınan ham etiketler — 'partial' durumunu tetikler. */
  rawUnmapped: string[];
  dataStatus: CatalogAllergenDataStatus;
  /**
   * Ham içindekiler metni — yalnız çipin "daha az temkinli olamaz" yükseltmesi
   * için kullanılır (bkz. mobil catalogAllergenChip.ts). İçerik skoru bu alanı
   * KULLANMAZ.
   */
  ingredientsEvidence: CatalogIngredientsEvidence;
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
  /** JSON.parse başarısız olan satır sayısı — bu satırlar sessizce atlanır. */
  malformedLineCount: number;
  /** Aynı GTIN'de çelişen alerjen verisiyle karşılaşılan ürün sayısı (bkz. resolveDuplicateProducts). */
  duplicateConflictCount: number;
}

function createEmptyCatalog(): Catalog {
  return {
    products: [],
    byId: new Map(),
    loadedAt: new Date().toISOString(),
    sourcePath: null,
    malformedLineCount: 0,
    duplicateConflictCount: 0,
  };
}

const UNKNOWN_ALLERGEN_DATA: CatalogAllergenData = {
  declared: [],
  traces: [],
  recognizedUnmodeled: [],
  rawUnmapped: [],
  dataStatus: 'unknown_or_unverified',
  ingredientsEvidence: { text: null, lang: null, source: 'off' },
};

function allergenSetsDiffer(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((value) => !b.includes(value));
}

function allergenDataConflicts(a: CatalogAllergenData, b: CatalogAllergenData): boolean {
  return a.dataStatus !== b.dataStatus || allergenSetsDiffer(a.declared, b.declared) || allergenSetsDiffer(a.traces, b.traces);
}

/**
 * Aynı GTIN birden çok satırda geçebilir (ör. OFF'un farklı Nutri-Score
 * partisyonlarından çekilmiş çakışan kayıtlar). Alerjen verisi TUTARLIYSA
 * (aynı declared/traces/dataStatus) son kaydı sessizce kullanır. ÇELİŞİYORSA
 * — hangisinin doğru olduğunu bilemeyeceğimizden — fail-closed davranır:
 * o ürünün alerjen verisi unknown_or_unverified'a düşürülür ve sayaç artar.
 */
function resolveDuplicateProducts(products: CatalogProduct[]): {
  products: CatalogProduct[];
  duplicateConflictCount: number;
} {
  const indexById = new Map<string, number>();
  const resolved: CatalogProduct[] = [];
  let duplicateConflictCount = 0;

  for (const product of products) {
    const existingIndex = indexById.get(product.productId);

    if (existingIndex === undefined) {
      indexById.set(product.productId, resolved.length);
      resolved.push(product);
      continue;
    }

    const existing = resolved[existingIndex]!;

    if (allergenDataConflicts(existing.allergenData, product.allergenData)) {
      duplicateConflictCount += 1;
      resolved[existingIndex] = { ...product, allergenData: UNKNOWN_ALLERGEN_DATA };
    } else {
      resolved[existingIndex] = product;
    }
  }

  return { products: resolved, duplicateConflictCount };
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

/**
 * OFF notu varsa her zaman ONA öncelik verilir (status='off'); kendi
 * hesabımız (rafskoru_computed) yalnız OFF'ta not YOKSA denenir. Sıra
 * bilerek bu şekildedir — bkz. görev onayı: "OFF değeri varsa status='off'
 * ve OFF değeri gösterilir; computed yalnızca OFF yoksa."
 */
function buildNutriScore(record: OffImportRecord): CatalogNutriScore {
  if (record.nutriscoreGrade) {
    return {
      grade: record.nutriscoreGrade.toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E',
      status: 'off',
      source: 'off',
      algorithmVersion: null,
      assumptions: [],
    };
  }

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

  return { grade: null, status: 'insufficient_data', source: null, algorithmVersion: null, assumptions: [] };
}

function buildNova(record: OffImportRecord): CatalogNova {
  if (record.novaGroup) {
    return { group: record.novaGroup, source: 'off' };
  }

  return { group: null, source: null };
}

/**
 * OFF kaydının hazır declared/traces/dataStatus alanlarına GÜVENİLMEZ; her
 * yüklemede ham rawDeclared/rawTraces'ten, paylaşılan üç-kova tablosuyla
 * yeniden türetilir. Bu sayede eski (fix'ten önce üretilmiş) JSONL
 * dökümleri bile re-import gerekmeden doğru sınıflanır.
 */
function buildAllergenData(record: OffImportRecord): CatalogAllergenData {
  const declaredClass = classifyAllergenTags(record.allergens.rawDeclared);
  const tracesClass = classifyAllergenTags(record.allergens.rawTraces);

  const recognizedUnmodeled = [...new Set([...declaredClass.recognizedUnmodeled, ...tracesClass.recognizedUnmodeled])];
  const rawUnmapped = [...new Set([...declaredClass.unmapped, ...tracesClass.unmapped])];

  const hasRawTags = record.allergens.rawDeclared.length > 0 || record.allergens.rawTraces.length > 0;

  const dataStatus: CatalogAllergenDataStatus = !hasRawTags
    ? 'unknown_or_unverified'
    : rawUnmapped.length > 0
      ? 'partial'
      : 'present';

  return {
    declared: declaredClass.mapped,
    traces: tracesClass.mapped,
    recognizedUnmodeled,
    rawUnmapped,
    dataStatus,
    ingredientsEvidence: { text: record.ingredientsText, lang: record.ingredientsLang, source: 'off' },
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
    const rawProducts: CatalogProduct[] = [];
    let malformedLineCount = 0;

    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const record = JSON.parse(trimmed) as OffImportRecord;
        rawProducts.push(buildCatalogProduct(record));
      } catch {
        // Bozuk JSONL satırı atlanır; katalog kısmi kalmaya devam eder.
        malformedLineCount += 1;
      }
    }

    const { products, duplicateConflictCount } = resolveDuplicateProducts(rawProducts);

    currentCatalog = {
      products,
      byId: new Map(products.map((product) => [product.productId, product])),
      loadedAt: new Date().toISOString(),
      sourcePath: path,
      malformedLineCount,
      duplicateConflictCount,
    };
    console.log(
      `[catalog] ${products.length} ürün yüklendi (${path}). ` +
        `Bozuk satır: ${malformedLineCount}. Çelişen mükerrer GTIN: ${duplicateConflictCount}.`,
    );
  } catch (err) {
    console.warn(`[catalog] ${path} okunamadı (${(err as Error).message}); katalog boş kaldı.`);
    currentCatalog = createEmptyCatalog();
  }

  return currentCatalog;
}

export function getCatalog(): Catalog {
  return currentCatalog;
}
