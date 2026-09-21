/**
 * RafSkoru — Katalog Alerjen Çipi Türetimi
 * src/riskEngine/catalogAllergenChip.ts
 *
 * Arama ve sepet satırlarındaki alerji çipini, katalogdan gelen
 * CatalogAllergenData ile cihazdaki kullanıcı profilini birleştirerek
 * üretir. riskEngine.ts'e DOKUNMAZ, onu ÇAĞIRMAZ — declared/traces zaten
 * kanonik AllergenKey listeleri olduğundan, profil eşleşmesi tam anahtar
 * karşılaştırmasıyla (riskEngine'in serbest metin anahtar kelime aramasına
 * gerek duymadan) daha kesin biçimde yapılabilir. Yeni bir alerjen kararı
 * ÜRETMEZ — yalnız zaten hesaplanmış katalog verisinin, profil alerjeni
 * başına değerlendirilen sunumudur.
 *
 * Durum kuralı (profil alerjeni K için):
 *   K declared'da  → declared_contains
 *   K traces'ta    → trace_may_contain
 *   yoksa, ürün present ise → not_listed_in_available_data
 *   yoksa (partial/unknown_or_unverified) → unknown_or_unverified
 * Profilde birden çok alerjen varsa en kötüsü (en ciddi) gösterilir.
 * 'partial' durumunda eşlenmiş declared/traces GİZLENMEZ; yalnız
 * eşlenemeyen anahtarlar için sonuç unknown_or_unverified'a düşer.
 */

import type { CatalogAllergenData, CatalogAllergenDataStatus } from '../api/catalogTypes';
import type { AllergenBannerStatus } from '../ui/AllergenBanner';
import type { AllergenKey, UserSensitivityProfile } from '../userProfile/userProfileTypes';

/**
 * Dönüş tipi açıkça 'unknown_or_unverified' olarak sabitlenmiştir (geniş
 * AllergenBannerStatus birleşimi değil). Biri gövdeyi değiştirip başka bir
 * durum döndürmeye çalışırsa `npm run check` (tsc) derleme hatasıyla durur
 * — "alerjen verisi yoksa her zaman 'veri yok' çipi" kuralı böylece
 * derleme zamanında güvenceye alınmış olur.
 */
function statusForMissingAllergenData(): 'unknown_or_unverified' {
  return 'unknown_or_unverified';
}

const KNOWN_DATA_STATUSES: ReadonlySet<string> = new Set<CatalogAllergenDataStatus>([
  'present',
  'partial',
  'unknown_or_unverified',
]);

/** Bilinmeyen/tanınmayan bir dataStatus değeri (ör. eski istemci ↔ yeni backend) her zaman unknown_or_unverified sayılır. */
function normalizeDataStatus(status: string): CatalogAllergenDataStatus {
  return KNOWN_DATA_STATUSES.has(status) ? (status as CatalogAllergenDataStatus) : 'unknown_or_unverified';
}

/** OFF taxonomies/allergens.txt'ten doğrulanan (2026-09-21), profilde modellenmemiş zorunlu alerjenler. */
const RECOGNIZED_UNMODELED_ALLERGEN_LABELS: Record<string, string> = {
  'en:celery': 'kereviz',
  'en:mustard': 'hardal',
  'en:sulphur-dioxide-and-sulphites': 'sülfür dioksit ve sülfitler',
  'en:lupin': 'acı bakla (lupin)',
};

const SEVERITY_RANK: Record<AllergenBannerStatus, number> = {
  declared_contains: 0,
  trace_may_contain: 1,
  not_listed_in_available_data: 2,
  unknown_or_unverified: 3,
};

function worstStatus(statuses: AllergenBannerStatus[]): AllergenBannerStatus {
  return statuses.reduce((worst, current) =>
    SEVERITY_RANK[current] < SEVERITY_RANK[worst] ? current : worst,
  );
}

function classifyForProfileKey(data: CatalogAllergenData, key: AllergenKey): AllergenBannerStatus {
  if (data.declared.includes(key)) return 'declared_contains';
  if (data.traces.includes(key)) return 'trace_may_contain';

  return normalizeDataStatus(data.dataStatus) === 'present' ? 'not_listed_in_available_data' : 'unknown_or_unverified';
}

/** Profilde hiç alerjen seçilmemişse gösterilecek genel (kişiselleştirilmemiş) durum. */
function generalStatus(data: CatalogAllergenData): AllergenBannerStatus {
  if (data.declared.length > 0) return 'declared_contains';
  if (data.traces.length > 0) return 'trace_may_contain';

  return normalizeDataStatus(data.dataStatus) === 'present' ? 'not_listed_in_available_data' : 'unknown_or_unverified';
}

export interface CatalogAllergenChipResult {
  status: AllergenBannerStatus;
  /** true ise UI "Beyanda tanınmayan etiketler var — etiketi kontrol edin." satırını göstermeli. */
  hasUnrecognizedTags: boolean;
  /** Boş değilse UI "Beyanda ayrıca: <liste>" satırını göstermeli. */
  recognizedUnmodeledLabels: string[];
}

export function getCatalogAllergenChipStatus(
  allergenData: CatalogAllergenData | undefined,
  userProfile: UserSensitivityProfile,
): CatalogAllergenChipResult {
  if (!allergenData) {
    return { status: statusForMissingAllergenData(), hasUnrecognizedTags: false, recognizedUnmodeledLabels: [] };
  }

  const status =
    userProfile.allergens.length > 0
      ? worstStatus(userProfile.allergens.map((key) => classifyForProfileKey(allergenData, key)))
      : generalStatus(allergenData);

  return {
    status,
    hasUnrecognizedTags: allergenData.rawUnmapped.length > 0,
    recognizedUnmodeledLabels: allergenData.recognizedUnmodeled
      .map((tag) => RECOGNIZED_UNMODELED_ALLERGEN_LABELS[tag])
      .filter((label): label is string => Boolean(label)),
  };
}
