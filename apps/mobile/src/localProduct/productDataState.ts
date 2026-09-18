/**
 * RafSkoru — Ürün veri durumu projeksiyonu.
 * src/localProduct/productDataState.ts
 *
 * Backend `ProductFacts` → ekranda üç durum. Salt projeksiyondur (G3): alan üretmez,
 * tahmin yapmaz, `beta_inference` kaynaklı veriyi ürün verisi olarak göstermez (D3).
 */

import type { AllergenDeclaration, ProductFactField, UsabilityCapabilities } from '../contracts/generated';
import { evaluateProductRisks } from '../riskEngine/riskEngine';
import type { ProductRiskInput, ProductRiskResult } from '../riskEngine/riskEngine';
import type { TrafficLightNutrition } from '../types/product';
import type { AllergenKey, UserSensitivityProfile } from '../userProfile/userProfileTypes';
import type { ProductDataView, ProductFactsWire, ProductFieldPresence } from './types';

export const PRODUCT_FIELD_LABELS: Record<ProductFactField, string> = {
  productName: 'Ürün adı',
  brand: 'Marka',
  imageUrl: 'Ürün görseli',
  netQuantity: 'Net miktar',
  ingredientsText: 'İçindekiler',
  allergenDeclaration: 'Alerjen beyanı',
  nutrition: 'Besin tablosu',
  nutriScoreGrade: 'Nutri-Score',
  novaGroup: 'NOVA işleme grubu',
  trafficLight: 'Şeker/tuz/yağ düzeyleri',
};

const NO_CAPABILITIES: UsabilityCapabilities = { risk: false, health: false, content: false };

const ABSENT_DECLARATION: AllergenDeclaration = {
  status: 'absent',
  declaredTags: [],
  traceTags: [],
  source: null,
};

/** Yalnız OFF yapılandırılmış etiketi varken beyan `readable` olur; başka kaynak açmaz. */
export function toAllergenDeclaration(facts: ProductFactsWire | null): AllergenDeclaration {
  const info = facts?.allergenInfo;
  if (!facts || facts.dataSource !== 'off' || !info || info.dataStatus !== 'present' || info.source !== 'off_structured') {
    return ABSENT_DECLARATION;
  }
  return {
    status: 'readable',
    declaredTags: [...(info.declaredAllergens ?? [])],
    traceTags: [...(info.traceAllergens ?? [])],
    source: {
      source: 'off',
      confidence: facts.confidence ?? 'medium',
      reference: facts.sourceUrl ?? null,
      fetchedAt: facts.observedAt ?? null,
    },
  };
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasTrafficLight(facts: ProductFactsWire): boolean {
  const tl = facts.trafficLight;
  return Boolean(tl && (tl.sugar || tl.salt || tl.saturatedFat || tl.fat));
}

/** Backend `capabilities` varsa aynen kullanılır; yoksa aynı kuralla alanlardan okunur. */
export function toCapabilities(facts: ProductFactsWire | null): UsabilityCapabilities {
  if (!facts) return NO_CAPABILITIES;
  if (facts.capabilities) return facts.capabilities;
  return {
    risk: facts.allergenInfo?.dataStatus === 'present' && facts.allergenInfo.source === 'off_structured',
    health: Boolean(facts.nutriScoreGrade || facts.novaGroup || hasTrafficLight(facts)),
    content: hasText(facts.ingredientsText) || (facts.additives ?? []).length > 0,
  };
}

function fieldPresence(facts: ProductFactsWire): ProductFieldPresence[] {
  const present: Record<ProductFactField, boolean> = {
    productName: hasText(facts.productName),
    brand: false,
    imageUrl: hasText(facts.imageUrl),
    netQuantity: false,
    ingredientsText: hasText(facts.ingredientsText),
    allergenDeclaration: facts.allergenInfo?.dataStatus === 'present',
    nutrition: hasTrafficLight(facts),
    nutriScoreGrade: Boolean(facts.nutriScoreGrade),
    novaGroup: Boolean(facts.novaGroup),
    trafficLight: hasTrafficLight(facts),
  };
  const shown: ProductFactField[] = [
    'productName',
    'imageUrl',
    'ingredientsText',
    'allergenDeclaration',
    'nutriScoreGrade',
    'novaGroup',
    'trafficLight',
  ];
  return shown.map((field) => ({ field, label: PRODUCT_FIELD_LABELS[field], present: present[field] }));
}

/**
 * Yalnız gerçekten yetersiz kayıt düşer (`completeness === 'insufficient'`). `completeness`
 * alanı yoksa backend `selectUsableProductFacts` ile AYNI kural uygulanır (yalnız `isComplete`);
 * mobil, backend'in attığı bir kaydı göstermez (product-data-contract-reviewer, 2026-09-18).
 */
export function isInsufficientRecord(facts: ProductFactsWire | null): boolean {
  if (!facts) return true;
  if (facts.dataSource !== 'off') return true;
  if (facts.completeness === undefined) return !facts.isComplete;
  return facts.completeness === 'insufficient';
}

export interface DeriveProductDataViewInput {
  facts: ProductFactsWire | null | undefined;
  isLoading: boolean;
  resolveCompleted: boolean;
}

export function deriveProductDataView(input: DeriveProductDataViewInput): ProductDataView {
  const facts = input.facts ?? null;

  if (input.isLoading && !input.resolveCompleted) {
    return {
      state: 'loading',
      sourceLabel: 'Ürün verisi alınıyor',
      fields: [],
      missingLabels: [],
      capabilities: NO_CAPABILITIES,
      allergenDeclaration: ABSENT_DECLARATION,
      summary: 'Ürün kaydı sorgulanıyor.',
    };
  }

  if (isInsufficientRecord(facts) || !facts) {
    return {
      state: 'not_found',
      sourceLabel: 'Kayıt yok',
      fields: [],
      missingLabels: [],
      capabilities: NO_CAPABILITIES,
      allergenDeclaration: ABSENT_DECLARATION,
      summary:
        'Bu barkod için kullanılabilir ürün verisi bulunamadı. Ad veya kategoriden tahmin yapılmaz; paket bilgisini eklersen doğrulama için aday kayıt oluşur.',
    };
  }

  const fields = fieldPresence(facts);
  const missingLabels = fields.filter((f) => !f.present).map((f) => f.label);
  const isUsable = facts.completeness === 'complete' || (facts.completeness === undefined && facts.isComplete);

  return {
    state: isUsable ? 'usable' : 'partial',
    sourceLabel: 'Open Food Facts',
    fields,
    missingLabels,
    capabilities: toCapabilities(facts),
    allergenDeclaration: toAllergenDeclaration(facts),
    summary: isUsable
      ? 'Ürün kaydı kullanılabilir. Bilgiler topluluk katkılı Open Food Facts kaydından gelir; son karar için ambalaj etiketi esastır.'
      : 'Ürün kaydı kısmi. Mevcut alanlar gösterilir; eksik alanlar tahminle doldurulmaz ve aşağıda listelenir.',
  };
}

/**
 * Risk motoru girdisi: yalnız OFF kaynaklı, yetersiz olmayan kayıt. Kısmi kayıt korunur;
 * eksik alanlar motorun kendi "eksik" uyarılarını üretmesine bırakılır (fail-closed).
 * `beta_inference` veya kayıt yoksa null → çağıran taraf "değerlendirilemedi" gösterir.
 */
export function toRiskInputFromProductFacts(
  facts: ProductFactsWire | null | undefined,
  fallbackName: string | null,
  userProfile: UserSensitivityProfile,
): ProductRiskInput | null {
  if (!facts || isInsufficientRecord(facts)) return null;
  // Alerjen listesi yalnız okunabilir (yapılandırılmış OFF) beyandan gelir; beyan yoksa boş liste
  // verilir ve motor kendi "alerjen bilgisi eksik" uyarısını üretir (fail-closed). Ham `allergens`
  // dizisi beyandan bağımsız ikinci bir gerçek kaynağı olamaz.
  const declaration = toAllergenDeclaration(facts);
  return {
    name: facts.productName ?? fallbackName,
    ingredients: facts.ingredientsText ?? null,
    allergens: declaration.status === 'readable' ? [...declaration.declaredTags] : [],
    additives: facts.additives ?? [],
    novaGroup: facts.novaGroup ?? null,
    trafficLight: null,
    nutriScore: facts.nutriScoreGrade ?? null,
    userProfile,
  };
}

/** Alerjen beyanı özeti; ihtiyat dili (E4). Olumlu uygunluk iddiası üretmez. */
export function describeAllergenDeclaration(declaration: AllergenDeclaration): {
  title: string;
  lines: string[];
  tone: 'declared' | 'trace' | 'none_listed' | 'unknown';
} {
  if (declaration.status !== 'readable') {
    return {
      title: 'Alerjen verisi yok / doğrulanmamış',
      lines: ['Bu kayıtta okunabilir alerjen beyanı yok. Ambalaj etiketini kontrol edin.'],
      tone: 'unknown',
    };
  }
  const lines: string[] = [];
  if (declaration.declaredTags.length > 0) {
    lines.push(`Beyana göre içerir: ${declaration.declaredTags.join(', ')}`);
  }
  if (declaration.traceTags.length > 0) {
    lines.push(`İçerebilir (eser / çapraz bulaşma beyanı): ${declaration.traceTags.join(', ')}`);
  }
  if (lines.length === 0) {
    lines.push('Mevcut kayıtta alerjen listelenmemiş. Bu bir garanti değildir; güncel ambalaj etiketini kontrol edin.');
    return { title: 'Alerjen beyanı: listelenmemiş', lines, tone: 'none_listed' };
  }
  lines.push('Kaynak: Open Food Facts yapılandırılmış etiketi. Etiket değişebilir; ambalajı kontrol edin.');
  return {
    title: declaration.declaredTags.length > 0 ? 'Alerjen beyanı' : 'İçerebilir beyanı',
    lines,
    tone: declaration.declaredTags.length > 0 ? 'declared' : 'trace',
  };
}

/**
 * OFF alerjen etiketi → profil anahtarı (allergen-safety skill sözlük tablosu; tek yer).
 * celery, mustard, sulphur-dioxide-and-sulphites, lupin profilde modellenmemiştir → eşlenmez,
 * ürün düzeyinde görünür kalır. crustaceans+molluscs → shellfish birleşimi kesinleşmiş sayılmaz.
 */
export const OFF_ALLERGEN_TAG_TO_PROFILE_KEYS: Readonly<Record<string, readonly AllergenKey[]>> = {
  gluten: ['gluten_wheat'],
  crustaceans: ['shellfish'],
  molluscs: ['shellfish'],
  eggs: ['egg'],
  fish: ['fish'],
  peanuts: ['peanut'],
  soybeans: ['soy'],
  milk: ['milk', 'lactose'],
  nuts: ['tree_nuts'],
  'sesame-seeds': ['sesame'],
};

function normalizeTag(tag: string): string {
  return tag.replace(/^[a-z]{2}:/, '').trim().toLowerCase();
}

export interface ProfileDeclarationMatches {
  /** Profil anahtarı ↔ "beyana göre içerir" etiketi. Motor bu eşleşme için ayrıca uyarı üretir. */
  declared: { profileKey: AllergenKey; tag: string }[];
  /**
   * Profil anahtarı ↔ "içerebilir" (iz) etiketi. Risk motorunun girdisinde iz alanı yoktur
   * (`ProductRiskInput`), bu nedenle yalnız ekran projeksiyonu olarak gösterilir; motor değişikliği
   * insan onayı ister (allergen-safety-reviewer F2, 2026-09-18).
   */
  trace: { profileKey: AllergenKey; tag: string }[];
}

/** Salt projeksiyon: yalnız `readable` beyan ve profil anahtarları; ad/kategori çıkarımı yok. */
export function findProfileDeclarationMatches(
  declaration: AllergenDeclaration,
  profileAllergens: readonly AllergenKey[],
): ProfileDeclarationMatches {
  const empty: ProfileDeclarationMatches = { declared: [], trace: [] };
  if (declaration.status !== 'readable' || profileAllergens.length === 0) return empty;
  const collect = (tags: readonly string[]) => {
    const out: { profileKey: AllergenKey; tag: string }[] = [];
    for (const rawTag of tags) {
      const keys = OFF_ALLERGEN_TAG_TO_PROFILE_KEYS[normalizeTag(rawTag)] ?? [];
      for (const key of keys) if (profileAllergens.includes(key)) out.push({ profileKey: key, tag: normalizeTag(rawTag) });
    }
    return out;
  };
  return { declared: collect(declaration.declaredTags), trace: collect(declaration.traceTags) };
}

/** Fail-closed "değerlendirilemedi" sonucu; boş uyarı listesi göstermez. */
export function unavailableRiskResult(message: string): ProductRiskResult {
  return {
    overallRisk: 'unknown',
    warnings: [
      {
        code: 'FOOD_ANALYSIS_UNAVAILABLE',
        title: 'Gıda analizi yapılamadı',
        message,
        level: 'unknown',
      },
    ],
    isEvaluated: false,
  };
}

export interface EvaluateRecoveryRiskInput {
  facts: ProductFactsWire | null | undefined;
  fallbackName: string | null;
  userProfile: UserSensitivityProfile;
  trafficLight: TrafficLightNutrition | null;
}

/**
 * Bayrak açıkken barkod aramasının TEK risk yolu. Yalnız OFF kaynaklı, yetersiz olmayan kayıt
 * motora girer; aksi hâlde eski (ham `productFacts`/`isComplete`) yola DÜŞÜLMEZ ve fail-closed
 * "değerlendirilemedi" döner (allergen-safety-reviewer F1, 2026-09-18).
 */
export function evaluateRecoveryRisk(input: EvaluateRecoveryRiskInput): ProductRiskResult {
  const riskInput = toRiskInputFromProductFacts(input.facts, input.fallbackName, input.userProfile);
  if (!riskInput) {
    return unavailableRiskResult(
      'Bu barkod için kullanılabilir ürün kaydı yok; alerjen ve içerik değerlendirmesi yapılamadı. Ambalaj etiketini kontrol edin.',
    );
  }
  return evaluateProductRisks({ ...riskInput, trafficLight: input.trafficLight });
}
