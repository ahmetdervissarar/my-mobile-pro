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
 * Profilde birden çok alerjen varsa EN CİDDİ (en ağır) sonuç gösterilir —
 * sıra: declared_contains > içindekiler eşleşmesi (trace_may_contain'e
 * yükseltilir) > trace_may_contain > unknown_or_unverified >
 * not_listed_in_available_data (bkz. SEVERITY_RANK). unknown_or_unverified,
 * not_listed_in_available_data'dan DAHA CİDDİ sayılır: "veri yok" (hiç
 * bilmiyoruz) "belirtilmemiş" (baktık, listede yok) tarafından asla
 * MASKELENEMEZ — D1 kuralı (veri yok = güvenli değil) çoklu-anahtar
 * birleştirmede de geçerlidir. Profil anahtarı eklemek sonucu ASLA
 * hafifletmez (monotonluk — bkz. allergenChipMonotonicity.smoke.ts).
 * 'partial' durumunda eşlenmiş declared/traces GİZLENMEZ; yalnız
 * eşlenemeyen anahtarlar için sonuç unknown_or_unverified'a düşer.
 *
 * İki istisna, üstteki kuralı override eder:
 * 1. 'lactose' katalogda hiç modellenmeyen bir profil anahtarıdır (OFF'ta
 *    ayrı bir kanonik laktoz etiketi yok — bkz. CATALOG_MODELED_ALLERGEN_KEYS).
 *    TGK Etiketleme Yönetmeliği'nin "süt ve süt ürünleri (laktoz dahil)"
 *    tanımına göre laktoz SÜTÜN DURUMUNU İZLER (bkz. ADR-004, gıda uzmanı
 *    teyidi gerekir): milk declared → lactose declared; milk trace → lactose
 *    trace; ürün present VE milk declared/traces'ta yoksa → lactose
 *    not_listed_in_available_data; veri partial/unknown ise → lactose de
 *    unknown_or_unverified. declared/trace seviyelerinde rozet/not metni
 *    ASLA "laktoz içerir" DEMEZ — sütün beyanını yansıtır, laktoza özgü bir
 *    kesinlik iddia etmez (bkz. classifyForProfileKey, displayLabelForKey).
 *    İçindekiler metninde "laktoz" geçmesi ayrıca (milk sinyalinden bağımsız)
 *    uyarı üretir — bu, riskEngine'in LACTOSE_KEYWORDS listesindeki naif alt
 *    dizge eşleşmesi yüzünden "laktozsuz" gibi kelimeleri de YANLIŞ POZİTİF
 *    olarak tetikler; bu bilinçli bir kabul çünkü hata yönü temkinli
 *    (D1: fazla uyarmak, az uyarmaktan daha güvenli) — riskEngine'in kelime
 *    listesine bu yüzden dokunulmaz (bkz. lactoseKeywordFalsePositive testi).
 * 2. "Daha az temkinli olamaz": sonuç not_listed_in_available_data olacaksa
 *    VE ingredientsEvidence.text doluysa, riskEngine'in aynı anahtar için
 *    ürettiği PROFILE_*_ALLERGEN_MATCH uyarısı kontrol edilir (yalnız
 *    evaluateProductRisks üzerinden — özel anahtar kelime listelerine
 *    dokunulmaz). Eşleşme varsa not_listed_in_available_data yerine
 *    trace_may_contain + basis 'ingredients' gösterilir. Ayrı bir NOT METNİ
 *    YOKTUR — rozetin kendisi ("İçindekilerde X geçiyor — etiketi kontrol
 *    edin") zaten aynı bilgiyi taşır; ayrı bir not satırı bunu tekrar ederdi.
 */

import { evaluateProductRisks } from './riskEngine';
import type { CatalogAllergenData, CatalogAllergenDataStatus } from '../api/catalogTypes';
import type { AllergenBannerStatus, AllergenDisplayLevel } from '../ui/AllergenBanner';
import { allergenOptions } from '../userProfile/userProfileTypes';
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

/**
 * Sayı ne kadar KÜÇÜKSE o kadar CİDDİ (worstStatus daha küçüğü seçer).
 * unknown_or_unverified, not_listed_in_available_data'dan ÖNCE gelir —
 * "hiç veri yok" durumu, başka bir anahtarın "baktık, yok" sonucuyla asla
 * daha hafif göstermez (bkz. görev onayı, D1).
 */
const SEVERITY_RANK: Record<AllergenBannerStatus, number> = {
  declared_contains: 0,
  trace_may_contain: 1,
  unknown_or_unverified: 2,
  not_listed_in_available_data: 3,
};

function worstStatus(statuses: AllergenBannerStatus[]): AllergenBannerStatus {
  return statuses.reduce((worst, current) =>
    SEVERITY_RANK[current] < SEVERITY_RANK[worst] ? current : worst,
  );
}

/** status → basis'in düz eşlemesi; ingredients-yükseltmesi ve lactose istisnaları çağıran yerde override eder. */
function basisForStatus(status: AllergenBannerStatus): AllergenProfileKeyBasis {
  if (status === 'declared_contains') return 'declared';
  if (status === 'trace_may_contain') return 'trace';
  if (status === 'unknown_or_unverified') return 'no_data';
  return 'not_listed';
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
  basis: AllergenProfileKeyBasis;
  note: string | null;
}

function classifyForProfileKey(data: CatalogAllergenData, key: AllergenKey): KeyClassification {
  // 'lactose' bugün hiçbir zaman declared/traces'ta doğrudan bulunmaz (katalog
  // bu anahtarı üretmiyor — bkz. CATALOG_MODELED_ALLERGEN_KEYS), ama tip
  // düzeyinde mümkün olduğundan (ileride bir kaynak eklerse) doğrudan sinyal
  // ÖNCELİKLİDİR; yalnız o sinyal YOKSA milk-türetilmiş TGK kuralına düşülür.
  if (key === 'lactose' && !data.declared.includes('lactose') && !data.traces.includes('lactose')) {
    const milkStatus = baseClassify(data, 'milk');
    const ingredientsLactoseMatch = Boolean(
      data.ingredientsEvidence.text && ingredientsMatchKey('lactose', data.ingredientsEvidence.text),
    );

    // TGK: "süt ve süt ürünleri (laktoz dahil)" — laktoz sütün durumunu izler.
    // Not metni "laktoz içerir/eser miktarda içerebilir" DEMEZ (rozet zaten
    // displayLabelForKey ile "Süt" adını gösterir — bkz. aşağı); yalnız DELTA
    // bilgiyi ekler, rozetle aynı cümleyi tekrar etmez.
    if (milkStatus === 'declared_contains') {
      return { status: 'declared_contains', basis: 'declared', note: 'Laktoz hassasiyeti için etiketi kontrol edin.' };
    }
    if (milkStatus === 'trace_may_contain') {
      return { status: 'trace_may_contain', basis: 'trace', note: 'Laktoz hassasiyeti için etiketi kontrol edin.' };
    }

    // milkStatus 'not_listed_in_available_data' veya 'unknown_or_unverified' —
    // her iki durumda da ingredients'te doğrudan "laktoz" geçmesi ayrıca uyarı
    // üretir ("daha az temkinli olamaz" kuralı, bkz. kural 3 üstte). Not METNİ
    // YOK — rozet zaten basis='ingredients' şablonuyla ("İçindekilerde X
    // geçiyor — etiketi kontrol edin") AYNI bilgiyi taşır; ayrı bir not satırı
    // rozetle birebir aynı anlamı tekrar ederdi (bkz. görev bulgusu, madde 5).
    if (ingredientsLactoseMatch) {
      return { status: 'trace_may_contain', basis: 'ingredients', note: null };
    }
    if (milkStatus === 'not_listed_in_available_data') {
      return { status: 'not_listed_in_available_data', basis: 'not_listed', note: null };
    }
    return { status: 'unknown_or_unverified', basis: 'no_data', note: null };
  }

  const status = baseClassify(data, key);
  if (
    status === 'not_listed_in_available_data' &&
    data.ingredientsEvidence.text &&
    ingredientsMatchKey(key, data.ingredientsEvidence.text)
  ) {
    // Not METNİ YOK — bkz. yukarıdaki lactose dalındaki aynı gerekçe (madde 5).
    return { status: 'trace_may_contain', basis: 'ingredients', note: null };
  }
  return { status, basis: basisForStatus(status), note: null };
}

/** Profilde hiç alerjen seçilmemişse gösterilecek genel (kişiselleştirilmemiş) durum. */
function generalStatus(data: CatalogAllergenData): AllergenBannerStatus {
  if (data.declared.length > 0) return 'declared_contains';
  if (data.traces.length > 0) return 'trace_may_contain';

  return normalizeDataStatus(data.dataStatus) === 'present' ? 'not_listed_in_available_data' : 'unknown_or_unverified';
}

/**
 * P1: perKey sonucunun yapılandırılmış kaynağı — UI seviyesi (badge metni/rengi)
 * BUNDAN türetilir, not metninden ASLA parse edilmez. AllergenBannerStatus'a
 * yeni bir değer eklemez; onun üzerine sunum amaçlı ince bir kırılımdır.
 */
export type AllergenProfileKeyBasis = 'declared' | 'ingredients' | 'trace' | 'no_data' | 'not_listed';

export interface AllergenProfileKeyResult {
  key: AllergenKey;
  status: AllergenBannerStatus;
  basis: AllergenProfileKeyBasis;
  note: string | null;
}

export interface AllergenProfileEvaluation {
  status: AllergenBannerStatus;
  /** Profildeki her anahtarın kendi (birleştirilmeden önceki) sonucu — banner gibi ayrıntılı sunumlar için. */
  perKey: AllergenProfileKeyResult[];
  hasUnrecognizedTags: boolean;
  recognizedUnmodeledLabels: string[];
  note: string | null;
}

/**
 * PAYLAŞILAN ÇEKİRDEK — arama çipi, sepet satırı VE ürün sayfası banner'ı
 * AYNI bu fonksiyonu (dolaylı olarak) kullanır; durum hesaplaması TEK yerde
 * yapılır. `getCatalogAllergenChipStatus` bunun ince bir sarmalayıcısıdır
 * (çip'e özgü dar sonuç şeklini üretir); ürün sayfası ise `perKey`
 * ayrıntısını kullanan kendi sarmalayıcısını çağırır (bkz.
 * productResult/helpers.ts, getAllergenBannerDataFromCatalog) — ikisi de
 * BU fonksiyonu çağırdığı için sonuç asla farklılaşamaz.
 */
export function evaluateCatalogAllergenDataForProfile(
  allergenData: CatalogAllergenData | undefined,
  userProfile: UserSensitivityProfile,
): AllergenProfileEvaluation {
  if (!allergenData) {
    return { status: statusForMissingAllergenData(), perKey: [], hasUnrecognizedTags: false, recognizedUnmodeledLabels: [], note: null };
  }

  const perKey: AllergenProfileKeyResult[] = userProfile.allergens.map((key) => {
    const classification = classifyForProfileKey(allergenData, key);
    return { key, status: classification.status, basis: classification.basis, note: classification.note };
  });
  const status = perKey.length > 0 ? worstStatus(perKey.map((c) => c.status)) : generalStatus(allergenData);

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
  for (const note of new Set(perKey.map((c) => c.note).filter((n): n is string => Boolean(n)))) {
    noteParts.push(note);
  }

  return {
    status,
    perKey,
    hasUnrecognizedTags,
    recognizedUnmodeledLabels,
    note: noteParts.length > 0 ? noteParts.join(' ') : null,
  };
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
  const evaluation = evaluateCatalogAllergenDataForProfile(allergenData, userProfile);
  return {
    status: evaluation.status,
    hasUnrecognizedTags: evaluation.hasUnrecognizedTags,
    recognizedUnmodeledLabels: evaluation.recognizedUnmodeledLabels,
    note: evaluation.note,
  };
}

/** Sayı ne kadar KÜÇÜKSE seviye o kadar CİDDİ — declared > ingredients > trace > no_data > not_listed. */
const DISPLAY_LEVEL_RANK: Record<AllergenDisplayLevel, number> = {
  declared: 0,
  ingredients: 1,
  trace: 2,
  no_data: 3,
  not_listed: 4,
};

const ALLERGEN_KEY_LABELS: Record<AllergenKey, string> = Object.fromEntries(
  allergenOptions.map((option) => [option.key, option.label]),
) as Record<AllergenKey, string>;

/**
 * 'lactose' declared/trace seviyesinde (milk'ten mirror edilmiş) rozet adı
 * olarak "Laktoz" DEĞİL "Süt" kullanılır — böylece rozet asla "Laktoz
 * içerir" gibi laktozun kendisi hakkında doğrudan bir kesinlik iddiası
 * ETMEZ (bkz. TGK notu, dosya başı). not_listed/no_data seviyelerinde bu
 * risk yok (bir "içerir" iddiası değiller), bu yüzden "Laktoz" kalır.
 */
export function displayLabelForKey(key: AllergenKey, basis: AllergenProfileKeyBasis): string {
  if (key === 'lactose' && (basis === 'declared' || basis === 'trace')) {
    return ALLERGEN_KEY_LABELS.milk;
  }
  return ALLERGEN_KEY_LABELS[key];
}

/**
 * Eşit seviyede sıralama: alerji (süt vb.) intoleranstan (laktoz) ÖNCE
 * gösterilir. Dışa açıktır — perKey'den TÜRETİLEN her liste (getAllergenDisplayLevel
 * dahil, productResult/helpers.ts'in declaredList/traceList'i dahil) BUNU
 * kullanmalı; aksi halde sonuç userProfile.allergens dizisinin SIRASINA bağlı
 * kalır — bu bir hatadır (bkz. lactoseTracksMilk.smoke.ts, cihaz bulgusu).
 */
export const ALLERGEN_TIE_BREAK_RANK: Partial<Record<AllergenKey, number>> = { lactose: 1 };

export function sortAllergenTieBreak(results: AllergenProfileKeyResult[]): AllergenProfileKeyResult[] {
  return [...results].sort((a, b) => (ALLERGEN_TIE_BREAK_RANK[a.key] ?? 0) - (ALLERGEN_TIE_BREAK_RANK[b.key] ?? 0));
}

function dedupePreserveOrder(labels: string[]): string[] {
  return [...new Set(labels)];
}

function textForDisplayLevel(level: AllergenDisplayLevel, labels: string[]): string {
  const joined = labels.join(', ');
  const joinedLower = joined.toLocaleLowerCase('tr-TR');

  switch (level) {
    case 'declared':
      return `${joined} içerir (beyan)`;
    case 'ingredients':
      return `İçindekilerde ${joinedLower} geçiyor — etiketi kontrol edin`;
    case 'trace':
      return `Eser miktarda ${joinedLower} içerebilir`;
    case 'no_data':
      return `Alerjen verisi yok (${joinedLower}) — etiketi kontrol edin`;
    case 'not_listed':
      return `Belirtilmemiş (${joinedLower})`;
  }
}

export interface AllergenDisplayInfo {
  level: AllergenDisplayLevel;
  /** En ağır seviyedeki profil anahtarlarının adını İÇEREN, gösterime hazır metin. */
  text: string;
  /** Diğer (daha az ağır) seviyelerdeki profil anahtarlarının adları — alt satırda listelenir. */
  otherLabels: string[];
  /** declared/ingredients/trace seviyelerinde true — kart kırmızı kenar + "Profilinizle çakışıyor" alır. */
  isConflict: boolean;
}

/**
 * perKey'den (profil boşsa null) sunuma hazır tek bir seviye türetir — arama
 * çipi, sepet çipi VE ürün sayfası banner'ı bunu kullanır, böylece "alerjen
 * adı her zaman rozette" kuralı üç ekranda da aynı kaynaktan gelir.
 */
export function getAllergenDisplayLevel(perKey: AllergenProfileKeyResult[]): AllergenDisplayInfo | null {
  if (perKey.length === 0) {
    return null;
  }

  const worstLevel = perKey.reduce<AllergenDisplayLevel>(
    (worst, current) => (DISPLAY_LEVEL_RANK[current.basis] < DISPLAY_LEVEL_RANK[worst] ? current.basis : worst),
    perKey[0].basis,
  );

  const atWorstLevel = sortAllergenTieBreak(perKey.filter((keyResult) => keyResult.basis === worstLevel));
  const atOtherLevels = sortAllergenTieBreak(perKey.filter((keyResult) => keyResult.basis !== worstLevel));

  const primaryLabels = dedupePreserveOrder(
    atWorstLevel.map((keyResult) => displayLabelForKey(keyResult.key, keyResult.basis)),
  );
  const otherLabels = dedupePreserveOrder(
    atOtherLevels.map((keyResult) => displayLabelForKey(keyResult.key, keyResult.basis)),
  );

  return {
    level: worstLevel,
    text: textForDisplayLevel(worstLevel, primaryLabels),
    otherLabels,
    isConflict: worstLevel === 'declared' || worstLevel === 'ingredients' || worstLevel === 'trace',
  };
}
