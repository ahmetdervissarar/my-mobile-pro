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
