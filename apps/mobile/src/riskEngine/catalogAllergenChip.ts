/**
 * RafSkoru — Katalog Alerjen Çipi Türetimi
 * src/riskEngine/catalogAllergenChip.ts
 *
 * Arama ve sepet satırlarındaki alerji çipini, katalogdan gelen
 * CatalogAllergenData ile cihazdaki kullanıcı profilini birleştirerek
 * üretir. riskEngine.ts'e DOKUNMAZ, DEĞİŞTİRMEZ — yalnız onun dışa açık
 * evaluateProductRisks() fonksiyonunu OKUYUP TÜKETİR (bkz. kural 4).
 * declared/traces zaten kanonik AllergenKey listeleri olduğundan, profil
 * eşleşmesi tam anahtar karşılaştırmasıyla (riskEngine'in serbest metin
 * anahtar kelime aramasına gerek duymadan) daha kesin biçimde yapılabilir.
 * Yeni bir alerjen kararı ÜRETMEZ — yalnız zaten hesaplanmış katalog
 * verisinin, profil alerjeni başına değerlendirilen sunumudur.
 *
 * Durum kuralı (profil alerjeni K için):
 *   K declared'da  → declared_contains
 *   K traces'ta    → trace_may_contain
 *   yoksa, ürün present ise → not_listed_in_available_data
 *   yoksa (partial/unknown_or_unverified) → unknown_or_unverified
 * Profilde birden çok alerjen varsa en kötüsü (en ciddi) gösterilir.
 * 'partial' durumunda eşlenmiş declared/traces GİZLENMEZ; yalnız
 * eşlenemeyen anahtarlar için sonuç unknown_or_unverified'a düşer.
 *
 * İki istisna, üstteki kuralı override eder:
 * 1. Katalogda hiç modellenmeyen profil anahtarı (bugün yalnız 'lactose' —
 *    CATALOG_MODELED_ALLERGEN_KEYS'te yok) asla not_listed_in_available_data
 *    gösteremez; tavanı unknown_or_unverified'dır (declared/traces zaten
 *    hiç içeremeyeceği için "beyanda yok" YANLIŞ bir kesinlik iddiası olur).
 *    'lactose' için ayrıca: milk declared/trace ise → trace_may_contain +
 *    özel not; milk sinyali yoksa → unknown_or_unverified. "Laktoz içermez"
 *    anlamına gelen hiçbir metin üretilmez.
 * 2. "Daha az temkinli olamaz": sonuç not_listed_in_available_data olacaksa
 *    VE ingredientsEvidence.text doluysa, riskEngine'in aynı anahtar için
 *    ürettiği PROFILE_*_ALLERGEN_MATCH uyarısı kontrol edilir (yalnız
 *    evaluateProductRisks üzerinden — özel anahtar kelime listelerine
 *    dokunulmaz). Eşleşme varsa not_listed_in_available_data yerine
 *    trace_may_contain + "İçindekilerde geçiyor olabilir" notu gösterilir.
 */

import { evaluateProductRisks } from './riskEngine';
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

/**
 * Katalogda declared/traces'ta gerçekten üretilebilen anahtarlar (bkz.
 * apps/backend/src/tools/offTurkey/allergenKey.ts). 'lactose' BURADA YOKTUR:
 * OFF etiketlerinde ayrı bir kanonik laktoz etiketi yok — bu yüzden lactose
 * ayrıca özel olarak ele alınır (aşağıda).
 */
const CATALOG_MODELED_ALLERGEN_KEYS: ReadonlySet<AllergenKey> = new Set<AllergenKey>([
  'egg',
  'milk',
  'gluten_wheat',
  'soy',
  'peanut',
  'tree_nuts',
  'sesame',
  'fish',
  'shellfish',
]);

/**
 * riskEngine.ts'in ingredients anahtar-kelime eşleştiricisiyle ürettiği
 * PROFILE_*_ALLERGEN_MATCH kodları — yalnız evaluateProductRisks'in dışa
 * açık sonucu üzerinden dolaylı tüketilir, özel kelime listelerine
 * dokunulmaz/import edilmez.
 */
const INGREDIENT_MATCH_CODE_BY_KEY: Partial<Record<AllergenKey, string>> = {
  egg: 'PROFILE_EGG_ALLERGEN_MATCH',
  milk: 'PROFILE_MILK_ALLERGEN_MATCH',
  lactose: 'PROFILE_LACTOSE_ALLERGEN_MATCH',
  gluten_wheat: 'PROFILE_GLUTEN_ALLERGEN_MATCH',
  soy: 'PROFILE_SOY_ALLERGEN_MATCH',
  peanut: 'PROFILE_PEANUT_ALLERGEN_MATCH',
  tree_nuts: 'PROFILE_TREE_NUTS_ALLERGEN_MATCH',
  sesame: 'PROFILE_SESAME_ALLERGEN_MATCH',
  fish: 'PROFILE_FISH_ALLERGEN_MATCH',
  shellfish: 'PROFILE_SHELLFISH_ALLERGEN_MATCH',
};

/** ingredientsText'te K anahtarına ait riskEngine anahtar-kelime eşleşmesi var mı? */
function ingredientsMatchKey(key: AllergenKey, ingredientsText: string): boolean {
  const code = INGREDIENT_MATCH_CODE_BY_KEY[key];
  if (!code) return false;

  const result = evaluateProductRisks({
    ingredients: ingredientsText,
    userProfile: { allergens: [key], chronicSensitivities: [], healthPreferences: [] },
  });
  return result.warnings.some((warning) => warning.code === code);
}

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

/** declared/traces/present-ise-not_listed temel kuralı; lactose istisnasını ve ingredients yükseltmesini İÇERMEZ. */
function baseClassify(data: CatalogAllergenData, key: AllergenKey): AllergenBannerStatus {
  if (data.declared.includes(key)) return 'declared_contains';
  if (data.traces.includes(key)) return 'trace_may_contain';
  if (!CATALOG_MODELED_ALLERGEN_KEYS.has(key)) return 'unknown_or_unverified';

  return normalizeDataStatus(data.dataStatus) === 'present' ? 'not_listed_in_available_data' : 'unknown_or_unverified';
}

interface KeyClassification {
  status: AllergenBannerStatus;
  note: string | null;
}

function classifyForProfileKey(data: CatalogAllergenData, key: AllergenKey): KeyClassification {
  // 'lactose' bugün hiçbir zaman declared/traces'ta doğrudan bulunmaz (katalog
  // bu anahtarı üretmiyor — bkz. CATALOG_MODELED_ALLERGEN_KEYS), ama tip
  // düzeyinde mümkün olduğundan (ileride bir kaynak eklerse) doğrudan sinyal
  // ÖNCELİKLİDİR; yalnız o sinyal YOKSA milk-türetilmiş özel kurala düşülür.
  if (key === 'lactose' && !data.declared.includes('lactose') && !data.traces.includes('lactose')) {
    const milkStatus = baseClassify(data, 'milk');
    if (milkStatus === 'declared_contains' || milkStatus === 'trace_may_contain') {
      return { status: 'trace_may_contain', note: 'Beyana göre süt içerir; laktoz içeriği doğrulanmamış.' };
    }
    // Milk sinyali yok ama ingredients metninde "laktoz" doğrudan geçebilir —
    // "daha az temkinli olamaz" kuralı burada da uygulanır (bkz. kural 3).
    if (data.ingredientsEvidence.text && ingredientsMatchKey('lactose', data.ingredientsEvidence.text)) {
      return { status: 'trace_may_contain', note: 'İçindekilerde geçiyor olabilir — etiketi kontrol edin.' };
    }
    return { status: 'unknown_or_unverified', note: null };
  }

  const status = baseClassify(data, key);
  if (
    status === 'not_listed_in_available_data' &&
    data.ingredientsEvidence.text &&
    ingredientsMatchKey(key, data.ingredientsEvidence.text)
  ) {
    return { status: 'trace_may_contain', note: 'İçindekilerde geçiyor olabilir — etiketi kontrol edin.' };
  }
  return { status, note: null };
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
  /** Tüm not kaynakları (tanınmayan etiket, kova B, lactose, ingredients yükseltmesi) birleştirilmiş; yoksa null. */
  note: string | null;
}

export function getCatalogAllergenChipStatus(
  allergenData: CatalogAllergenData | undefined,
  userProfile: UserSensitivityProfile,
): CatalogAllergenChipResult {
  if (!allergenData) {
    return { status: statusForMissingAllergenData(), hasUnrecognizedTags: false, recognizedUnmodeledLabels: [], note: null };
  }

  const classifications = userProfile.allergens.map((key) => classifyForProfileKey(allergenData, key));
  const status = classifications.length > 0 ? worstStatus(classifications.map((c) => c.status)) : generalStatus(allergenData);

  const hasUnrecognizedTags = allergenData.rawUnmapped.length > 0;
  const recognizedUnmodeledLabels = allergenData.recognizedUnmodeled
    .map((tag) => RECOGNIZED_UNMODELED_ALLERGEN_LABELS[tag])
    .filter((label): label is string => Boolean(label));

  const noteParts: string[] = [];
  if (hasUnrecognizedTags) {
    noteParts.push('Beyanda tanınmayan etiketler var — etiketi kontrol edin.');
  }
  if (recognizedUnmodeledLabels.length > 0) {
    noteParts.push(`Beyanda ayrıca: ${recognizedUnmodeledLabels.join(', ')}`);
  }
  for (const note of new Set(classifications.map((c) => c.note).filter((n): n is string => Boolean(n)))) {
    noteParts.push(note);
  }

  return {
    status,
    hasUnrecognizedTags,
    recognizedUnmodeledLabels,
    note: noteParts.length > 0 ? noteParts.join(' ') : null,
  };
}
