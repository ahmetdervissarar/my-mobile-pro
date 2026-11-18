// RafSkoru — Katalog ürünü için fiyatsız RafSkoru (paylaşılan, önbellekli)
// src/price/rafScore/catalogRafScore.ts
//
// search/suggestions.ts ile AYNI hesaplayıcı zincirinden türetilir (bkz. M4
// onayı: "ürün sayfasıyla aynı hesaplayıcı") — bu dosya o zinciri paylaşılan,
// tek bir yere taşır; suggestions.ts da artık BUNU çağırır, kopya mantık yok.
//
// scoreCoverageKey/Label: hangi bileşenlerden (fiyat hariç — bu bağlam zaten
// fiyatsız) puan üretildiğini taşır. Alternatif önerisi görevi onayı: "iki
// ürünün puanı aynı bileşen kümesinden hesaplanmış olmalı" karşılaştırması
// BUNUNLA yapılır (bkz. apps/backend/src/price/alternatives/catalogAlternatives.ts).
import type { CatalogProduct } from '../../catalog/catalog.js';
import { getEffectiveCatalogCacheKey, getEffectiveProductFacts } from '../../catalog/effectiveCatalog.js';
import {
  productFactsToContentScoreInput,
  productFactsToHealthScoreInput,
  productFactsToSustainabilityInput,
} from '../productFacts/adapters.js';
import { calculateContentScore } from '../contentScore/contentScoreCalculator.js';
import { calculateHealthScore } from '../healthScore/healthScoreCalculator.js';
import { calculateSustainabilityScore } from '../sustainability/sustainabilityScorer.js';
import { calculateRafScore } from './rafScoreCalculator.js';
import { buildOutOfScopeRafScore } from './scoreScope.js';
import type { RafScoreResult } from './types.js';

export interface CatalogRafScoreResult {
  rafScore: RafScoreResult;
  /** "content", "content+health", "content+health+sustainability" gibi, sıralı ve karşılaştırılabilir. Boşsa puan hiç hesaplanamadı demektir. */
  scoreCoverageKey: string;
  /** Kullanıcıya gösterilecek kısa Türkçe kapsam etiketi (ör. "yalnız içerik"). */
  scoreCoverageLabel: string;
}

const COVERAGE_LABELS: Record<string, string> = {
  content: 'yalnız içerik',
  health: 'yalnız sağlık',
  sustainability: 'yalnız sürdürülebilirlik',
  'content+health': 'sağlık + içerik',
  'content+sustainability': 'içerik + sürdürülebilirlik',
  'health+sustainability': 'sağlık + sürdürülebilirlik',
  'content+health+sustainability': 'tam',
};

function buildCoverageKey(rafScore: RafScoreResult): string {
  return rafScore.components
    .filter((component) => component.key !== 'price' && component.isAvailable)
    .map((component) => component.key)
    .sort()
    .join('+');
}

function labelForCoverageKey(key: string): string {
  if (!key) return 'veri yok';
  return COVERAGE_LABELS[key] ?? key;
}

let cachedCatalogLoadedAt: string | null = null;
const cacheByProductId = new Map<string, CatalogRafScoreResult>();

/**
 * Bellekte tek seferlik hesaplanır (aynı önbellek deseni: suggestions.ts'teki
 * getRafScoreForProduct). Girdi, ürün sayfasıyla AYNI birleştirmedir: OFF
 * katalog verisi + varsa insan onaylı etiket kaydı (effectiveCatalog.ts,
 * ADR-009 İş 1.3d). Önbellek, katalog yeniden yüklendiğinde VEYA onaylı kayıt
 * kümesi değiştiğinde (yeni onay) temizlenir.
 */
export function getCatalogRafScore(product: CatalogProduct): CatalogRafScoreResult | undefined {
  const cacheKey = getEffectiveCatalogCacheKey();
  if (cachedCatalogLoadedAt !== cacheKey) {
    cacheByProductId.clear();
    cachedCatalogLoadedAt = cacheKey;
  }

  const cached = cacheByProductId.get(product.productId);
  if (cached) return cached;

  const facts = getEffectiveProductFacts(product);
  if (!facts) return undefined;

  // Puan kapsamı (ADR-009 §11): ürün sayfasıyla AYNI "kapsam dışı" sonucu.
  const exclusion = facts.scoreScopeExclusion ?? product.scoreScopeExclusion ?? null;
  if (exclusion) {
    const outOfScope: CatalogRafScoreResult = {
      rafScore: buildOutOfScopeRafScore(exclusion),
      scoreCoverageKey: '',
      scoreCoverageLabel: 'kapsam dışı',
    };
    cacheByProductId.set(product.productId, outOfScope);
    return outOfScope;
  }

  const healthScore = calculateHealthScore(productFactsToHealthScoreInput(facts));
  const contentScore = calculateContentScore(productFactsToContentScoreInput(facts));
  const sustainabilityScore = calculateSustainabilityScore(productFactsToSustainabilityInput(facts));

  const rafScore = calculateRafScore({
    priceScore: null,
    healthScore: healthScore.score,
    contentScore: contentScore.score,
    sustainabilityScore: sustainabilityScore.score,
  });

  const scoreCoverageKey = buildCoverageKey(rafScore);
  const result: CatalogRafScoreResult = {
    rafScore,
    scoreCoverageKey,
    scoreCoverageLabel: labelForCoverageKey(scoreCoverageKey),
  };

  cacheByProductId.set(product.productId, result);
  return result;
}

/** Yalnız testler için — katalog yeniden yüklendiğinde önbelleğin de temizlendiğini doğrulamak amacıyla. */
export function __resetCatalogRafScoreCacheForTesting(): void {
  cachedCatalogLoadedAt = null;
  cacheByProductId.clear();
}
