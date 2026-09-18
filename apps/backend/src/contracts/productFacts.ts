/**
 * RafSkoru contracts — ürün verisi tamlığı, kullanılabilirlik ve doğrulanmış yerel beyanlar.
 *
 * Mevcut `price/productFacts/types.ts` ile paralel yaşar; bu pakette hiçbir adapter veya
 * servis bu tipleri kullanmaz. Kısmi veri atılmaz (D2); alan çıkarımı yoktur (D3).
 */

import type { AllergenDeclaration, AllergenStateEntry } from './allergenStatus.js';
import type { FieldSourceMap, ProvenanceTimestamps, ResolvedField, VerifiedFieldProvenance } from './provenance.js';

/** Genel tamlık: tek `isComplete` bayrağının yerini alır. */
export type CompletenessTier = 'complete' | 'partial' | 'insufficient';

/**
 * Birbirinden bağımsız kullanılabilirlik yetenekleri (tek enum değil):
 * - risk: alerjen değerlendirmesi yalnız yapılandırılmış/doğrulanabilir alerjen durumu
 *   (`allergenDeclaration.status === 'readable'`, kaynağı belli) varsa kullanılabilir. Yalnız
 *   serbest `ingredientsText` bulunması bu yeteneği AÇMAZ; içerik metni en fazla ek uyarı
 *   üretir, alerjen sonucu `unknown_or_unverified` kalır.
 * - health: Nutri-Score VEYA NOVA VEYA ≥1 traffic-light değeri → sağlık skoru (partial) üretilebilir.
 * - content: içerik listesi/katkı verisi → içerik skoru üretilebilir.
 * Her biri `false` iken ilgili modül "değerlendirilemedi" der; boş liste göstermez.
 */
export interface UsabilityCapabilities {
  risk: boolean;
  health: boolean;
  content: boolean;
}

export type ProductFactField =
  | 'productName'
  | 'brand'
  | 'imageUrl'
  | 'netQuantity'
  | 'ingredientsText'
  | 'allergenDeclaration'
  | 'nutrition'
  | 'nutriScoreGrade'
  | 'novaGroup'
  | 'trafficLight';

export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';
export type NovaGroup = 1 | 2 | 3 | 4;
export type TrafficLightValue = 'low' | 'medium' | 'high';

export interface TrafficLight {
  sugar?: TrafficLightValue | null;
  salt?: TrafficLightValue | null;
  saturatedFat?: TrafficLightValue | null;
  fat?: TrafficLightValue | null;
}

export interface NetQuantity {
  value: number;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'unit';
}

/**
 * 100 g/ml başına besin değerleri. Mevcut backend besin sözleşmesiyle (OFF adapter
 * `nutritionValues`: fat/saturatedFat/sugars/salt) uyumlu; ek alanlar opsiyoneldir.
 * Eksik alan `null`/undefined kalır; başka üründen veya addan türetilmez (D3).
 */
export interface NutritionFacts {
  fat?: number | null;
  saturatedFat?: number | null;
  sugars?: number | null;
  salt?: number | null;
  energyKcal?: number | null;
  carbohydrates?: number | null;
  fiber?: number | null;
  proteins?: number | null;
}

/** Alan adı → değer tipi. Doğrulama kayıtları ve beyanlar bu eşlemeyle tip güvenli kalır. */
export interface ProductFactValueMap {
  productName: string;
  brand: string;
  imageUrl: string;
  netQuantity: NetQuantity;
  ingredientsText: string;
  allergenDeclaration: AllergenDeclaration;
  nutrition: NutritionFacts;
  nutriScoreGrade: NutriScoreGrade;
  novaGroup: NovaGroup;
  trafficLight: TrafficLight;
}

/**
 * Alan bazlı kökenli ürün verisi (v2). Her alan çözülmüş değer + adaylar + çatışma taşır.
 * `fieldSources` özet görünümdür; `resolved` içindeki `selected` ile tutarlı olmalıdır.
 */
export interface ProductFactsV2 extends ProvenanceTimestamps {
  gtin: string;
  productName: ResolvedField<string>;
  brand?: ResolvedField<string>;
  imageUrl?: ResolvedField<string>;
  netQuantity?: ResolvedField<NetQuantity>;
  ingredientsText?: ResolvedField<string>;
  allergenDeclaration: ResolvedField<AllergenDeclaration>;
  /** Sözlük eşlemesi uygulanmış, alerjen bazında türetilmiş durumlar. Boş liste "temiz" demek değildir. */
  allergenStates: ReadonlyArray<AllergenStateEntry>;
  nutrition?: ResolvedField<NutritionFacts>;
  nutriScoreGrade?: ResolvedField<NutriScoreGrade>;
  novaGroup?: ResolvedField<NovaGroup>;
  trafficLight?: ResolvedField<TrafficLight>;

  fieldSources: FieldSourceMap<ProductFactField>;
  completeness: CompletenessTier;
  capabilities: UsabilityCapabilities;
  missingFields: ReadonlyArray<ProductFactField>;
  /** Herhangi bir alanda `unresolved` çatışma varsa true; UI belirsizliği gösterir. */
  hasUnresolvedConflict: boolean;
}

/** Ambalaj kanıtı: kullanıcı/saha fotoğrafı. OCR çıktısı yalnız adaydır. */
export type PackagingPhotoKind =
  | 'front'
  | 'barcode'
  | 'ingredients'
  | 'allergen'
  | 'nutrition'
  | 'quantity'
  | 'other';

export interface PackagingPhotoRef {
  kind: PackagingPhotoKind;
  /** İçerik hash'i; dosya yolu veya URL sözleşmede taşınmaz. */
  contentHash: string;
  takenAt?: string | null;
}

export interface PackagingEvidence {
  id: string;
  gtin: string;
  photos: ReadonlyArray<PackagingPhotoRef>;
  /** Ambalaj/etiket sürümü (üretici baskı kodu, tarih veya ekip tarafından atanmış sürüm). */
  packagingVersion?: string | null;
  /** Fotoğrafın gerçek çekim zamanı = gözlem zamanı. */
  observedAt: string;
  /**
   * Katkıcının takma kimliği. Hash'lenmiş/türetilmiş olsa da KVKK/GDPR açısından hâlâ
   * kişisel veri olabilir; anonimlik iddiası taşımaz. Kişisel profil veya konum taşınmaz.
   */
  contributorPseudonymousId?: string | null;
  /**
   * Open Food Facts'e katkı rızası: ayrı, sürümlenebilir bir rıza kaydına referans.
   * Kayıt yoksa rıza yoktur; boolean ile temsil edilmez.
   */
  offContributionConsentRecordId?: string | null;
}

export type FieldCheckStatus = 'ok' | 'corrected' | 'unreadable';

/**
 * Alan bazlı doğrulama kontrolü; `field` ile değer tipleri `ProductFactValueMap` üzerinden
 * bağlıdır (ör. `netQuantity` için string, `allergenDeclaration` için sayı reddedilir).
 * `status` gerçek ayırıcıdır: `unreadable` → `verifiedValue: null` zorunlu; `ok | corrected` →
 * `verifiedValue` ilgili değer tipine bağlı ve null olamaz. Tahmin yapılmaz.
 */
export type FieldCheck = {
  [K in ProductFactField]:
    | {
        field: K;
        status: 'ok' | 'corrected';
        candidateValue: ProductFactValueMap[K] | null;
        verifiedValue: ProductFactValueMap[K];
      }
    | {
        field: K;
        status: 'unreadable';
        candidateValue: ProductFactValueMap[K] | null;
        /** Okunamayan alanda doğrulanmış değer olamaz; alan `unknown` kalır. */
        verifiedValue: null;
      };
}[ProductFactField];

/** Doğrulama kaydı: alan alan insan kontrolü. */
export interface VerificationRecord {
  id: string;
  gtin: string;
  evidenceId: string;
  packagingVersion?: string | null;
  fieldChecks: ReadonlyArray<FieldCheck>;
  verifiedBy: string;
  verifiedAt: string;
}

/**
 * Tek bir doğrulanmış alan beyanı (discriminated union). Bütün ProductFacts kopyalanmaz;
 * yalnız insan doğrulamasından geçmiş alan, kanıt bağlantısı ve doğrulama kaydı taşınır.
 */
export type VerifiedFieldClaim = {
  [K in ProductFactField]: {
    field: K;
    value: ProductFactValueMap[K];
    evidenceId: string;
    verificationRecordId: string;
    packagingVersion?: string | null;
    /** Zorunlu `rafskoru_verified`, kanıt ve gerçek gözlem zamanı; genel `FieldSource` kabul edilmez. */
    provenance: VerifiedFieldProvenance;
  };
}[ProductFactField];

export type VerifiedLocalProductStatus = 'candidate' | 'verified' | 'superseded';

/** RafSkoru doğrulanmış yerel ürün kaydı: alan beyanları + kanıt + doğrulama, ProductFacts mirası değil. */
export interface VerifiedLocalProduct {
  id: string;
  gtin: string;
  status: VerifiedLocalProductStatus;
  claims: ReadonlyArray<VerifiedFieldClaim>;
  evidenceIds: ReadonlyArray<string>;
  verificationRecordIds: ReadonlyArray<string>;
  /** Yeni ambalaj kanıtı eski kaydı sessizce ezmez; önceki kayıt `superseded` olur ve bu alan onun `id`'sine bağlar. */
  supersedesRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}
