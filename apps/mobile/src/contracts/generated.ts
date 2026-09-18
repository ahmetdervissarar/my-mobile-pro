// ELLE DÜZENLEMEYİN — bu dosya `tools/sync-contracts.mjs` tarafından üretilir.
// Kaynak: apps/backend/src/contracts/*.ts (tek kaynak). Değişiklik için kaynağı düzenleyip
// `node tools/sync-contracts.mjs` çalıştırın; `--check` parite denetimi yapar.
// contracts-sha256: 44cd78c9d6d0adee7f60c264bce495902781bd6ad260a26e7fc09fdb98cd1c94

// ---- provenance.ts ----
/**
 * RafSkoru contracts — provenance (veri kökeni).
 *
 * Saf tip sözleşmesi: çalışma zamanı bağımlılığı yok, mevcut kod tarafından henüz
 * kullanılmıyor (Aşama 4A). Mobil kopyası `tools/sync-contracts.mjs` ile üretilir.
 *
 * Değişmezler: source/observedAt/confidence/missingFields uçtan uca korunur (G2);
 * güven düzeyi kaynak türünden bağımsız yükseltilmez (G4); sentetik veri canlı
 * gibi gösterilmez (G1).
 */

/** Kaynak sınıfı. `beta_inference` yalnız test/geliştirme verisidir; üretim yolunda yer almaz. */
export type SourceKind =
  | 'off'
  | 'rafskoru_verified'
  | 'manufacturer'
  | 'user_ocr'
  | 'beta_inference';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** Kaynak sınıfı başına güven tavanı (product-data skill). */
export const CONFIDENCE_CEILING: Readonly<Record<SourceKind, ConfidenceLevel>> = {
  off: 'high',
  rafskoru_verified: 'high',
  manufacturer: 'high',
  user_ocr: 'low',
  beta_inference: 'low',
};

/**
 * Üç zaman damgası ayrıdır ve hiçbiri diğerinin yerine geçmez:
 * - sourceModifiedAt: kaynağın kendi "son değişiklik" zamanı (örn. OFF `last_modified_t`).
 *   Gerçek ambalaj gözlemi DEĞİLDİR.
 * - fetchedAt: RafSkoru'nun kaynağı çektiği zaman (cache yazımı değil).
 * - observedAt: gerçek gözlem — ambalaj/etiket fotoğrafı, fiş, saha kaydı.
 */
export interface ProvenanceTimestamps {
  sourceModifiedAt?: string | null;
  fetchedAt?: string | null;
  observedAt?: string | null;
}

/** Bir alanın (veya alan grubunun) kökeni. */
export interface FieldSource extends ProvenanceTimestamps {
  source: SourceKind;
  confidence: ConfidenceLevel;
  /** Kanıt kaydına bağlantı (PackagingEvidence.id vb.). Yalnız gözleme dayalı kaynaklarda dolu olması beklenir. */
  evidenceId?: string | null;
  /** Kaynak URL veya kaynak içi referans. */
  reference?: string | null;
  /** Uydurulmuş demo/seed değer. UI etiketi zorunludur. */
  isSynthetic?: boolean;
}

/**
 * Okunabilir (`readable`) alerjen beyanı için izinli kaynak: yalnız yapılandırılmış/doğrulanabilir
 * kaynaklar. `user_ocr` ve `beta_inference` beyanı okunabilir yapamaz; `isSynthetic` true olamaz.
 */
export type ReadableDeclarationSourceKind = 'off' | 'rafskoru_verified' | 'manufacturer';

export interface ReadableDeclarationSource extends Omit<FieldSource, 'source' | 'isSynthetic'> {
  source: ReadableDeclarationSourceKind;
  isSynthetic?: false;
}

/**
 * Doğrulanmış alan beyanının kökeni: kaynak zorunlu `rafskoru_verified`, kanıt ve gerçek
 * gözlem zamanı zorunlu, sentetik olamaz. Genel `FieldSource` bu yerde kabul edilmez.
 */
export interface VerifiedFieldProvenance
  extends Omit<FieldSource, 'source' | 'evidenceId' | 'observedAt' | 'isSynthetic'> {
  source: 'rafskoru_verified';
  evidenceId: string;
  observedAt: string;
  isSynthetic?: false;
}

/** Aynı alan için bir kaynağın önerdiği değer. Adaylar sessizce üstüne yazılmaz. */
export interface SourceCandidate<T> {
  value: T;
  source: FieldSource;
}

/**
 * Çatışma durumu:
 * - none: tek aday veya tüm adaylar eşdeğer.
 * - resolved: farklı adaylar var, kural (öncelik/tarih/doğrulama) ile seçildi.
 * - unresolved: seçim yapılamadı; değer kullanıcıya belirsiz olarak gösterilir, olumlu karar üretilmez.
 */
export type ConflictState = 'none' | 'resolved' | 'unresolved';

export type ConflictResolutionRule =
  | 'single_candidate'
  | 'verified_over_unverified'
  | 'newer_observation'
  | 'source_priority'
  | 'human_decision';

export interface ResolvedField<T> {
  /** Seçilmiş değer. `unresolved` durumunda null olabilir. */
  value: T | null;
  /** Seçilen adayın kökeni. */
  selected: FieldSource | null;
  candidates: ReadonlyArray<SourceCandidate<T>>;
  conflict: ConflictState;
  resolutionRule?: ConflictResolutionRule;
}

/** Alan adı → köken. Ürün düzeyinde tek `dataSource` iddiasının yerini alır. */
export type FieldSourceMap<TFieldName extends string = string> = Partial<Record<TFieldName, FieldSource>>;

// ---- allergenStatus.ts ----
/**
 * RafSkoru contracts — alerjen veri durumu.
 *
 * Alerjen bir güvenlik kapısıdır, puan değildir (P2). Dört durum asla birleştirilmez ve
 * hiçbiri "güvenli" anlamına gelmez (D1). Bu dosya profil eşleşmesi veya risk motoru
 * içermez; yalnız ürün düzeyindeki veri durumunu modeller.
 */


/** Ürün düzeyinde tek bir alerjen için veri durumu. */
export type AllergenDataState =
  | 'declared_contains'
  | 'trace_may_contain'
  | 'not_listed_in_available_data'
  | 'unknown_or_unverified';

/**
 * Beyanın (alerjen listesinin) kendisinin durumu.
 * - readable: güncel ve okunabilir alerjen beyanı mevcut (yapılandırılmış OFF etiketi,
 *   doğrulanmış etiket kaydı vb.).
 * - unreadable: beyan var ama okunamıyor/eksik (OCR başarısız, kısmi görsel).
 * - absent: hiçbir beyan kaydı yok.
 */
export type AllergenDeclarationStatus = 'readable' | 'unreadable' | 'absent';

/**
 * Ürün düzeyi alerjen beyanı (discriminated union). Etiket/kaynak sözlüğünden gelen tag'ler
 * ham hâliyle taşınır. `readable` beyanın kaynağı zorunlu, null olamaz ve
 * `ReadableDeclarationSource` ile sınırlıdır: kaynağı belirsiz, OCR veya çıkarım kaynaklı
 * bir beyan okunabilir sayılmaz.
 */
export type AllergenDeclaration =
  | {
      status: 'readable';
      declaredTags: ReadonlyArray<string>;
      traceTags: ReadonlyArray<string>;
      /** Yalnız `off | rafskoru_verified | manufacturer`; OCR/çıkarım kaynaklı beyan okunabilir sayılmaz. */
      source: ReadableDeclarationSource;
    }
  | {
      status: 'unreadable';
      declaredTags: ReadonlyArray<string>;
      traceTags: ReadonlyArray<string>;
      source: FieldSource | null;
    }
  | {
      status: 'absent';
      declaredTags: readonly [];
      traceTags: readonly [];
      source: null;
    };

export interface AllergenStateEntry {
  allergenTag: string;
  state: AllergenDataState;
}

/**
 * Tek bir alerjen için durum türetir.
 *
 * Kural (Aşama 4A madde 4): `not_listed_in_available_data` yalnız beyan `readable` iken ve
 * ilgili alerjen ne beyan ne iz listesinde değilse üretilir. Beyan `unreadable` veya
 * `absent` ise sonuç her zaman `unknown_or_unverified`.
 *
 * Bu fonksiyon tag eşleştirmesini normalize etmez; çağıran taraf sözlük eşlemesini tek
 * yerde uygulamalıdır (allergen-safety skill). Ürün adı/kategori/LLM çıkarımı girdi olamaz.
 */
export function deriveAllergenState(
  declaration: AllergenDeclaration,
  allergenTag: string,
): AllergenDataState {
  if (declaration.status !== 'readable') {
    return 'unknown_or_unverified';
  }
  if (declaration.declaredTags.includes(allergenTag)) {
    return 'declared_contains';
  }
  if (declaration.traceTags.includes(allergenTag)) {
    return 'trace_may_contain';
  }
  return 'not_listed_in_available_data';
}

/** Durumun olumlu bir uygunluk kararına dönüştürülmesi yasaktır; bu sabit UI/metin katmanı için hatırlatıcıdır. */
export const ALLERGEN_STATE_IS_NEVER_SAFE = true as const;

// ---- productFacts.ts ----
/**
 * RafSkoru contracts — ürün verisi tamlığı, kullanılabilirlik ve doğrulanmış yerel beyanlar.
 *
 * Mevcut `price/productFacts/types.ts` ile paralel yaşar; bu pakette hiçbir adapter veya
 * servis bu tipleri kullanmaz. Kısmi veri atılmaz (D2); alan çıkarımı yoktur (D3).
 */


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
