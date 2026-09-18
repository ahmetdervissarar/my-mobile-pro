/**
 * RafSkoru — Risk Motoru
 * apps/mobile/src/riskEngine/riskEngine.ts
 *
 * Sorumluluk: Ürün bilgilerine göre risk seviyesi ve uyarı listesi üretmek.
 * Bu dosya saf bir hesaplama katmanıdır — UI'a, API'ye ve fiyat sistemine dokunmaz.
 *
 * 2026-09-18 (ADR-004): declared_contains ("içerir") ile trace_may_contain ("içerebilir")
 * profil eşleşmesi ayrı kod ve alanlarla eklendi (proje sahibi onayı; allergen-safety-reviewer
 * F2 bulgusunun kapatılması). Bkz. docs/decisions/ADR-004-trace-allergen-profile-matching.md.
 *
 * 2026-09-18 (üçüncü tur, proje sahibi onayı): `egg` için declared+trace eşleşmesi eklendi
 * (kategori bazlı PROFILE_EGG_PRECAUTION'dan ayrı); OFF'un genel "nuts"/"crustaceans"/"molluscs"
 * etiketleri serbest metin taramasından çıkarıldı, yalnız yapılandırılmış dizide tam eşleşmeyle
 * değerlendiriliyor (önceki sürüm "coconuts"/"doughnuts"/"peanuts" ile yanlış eşleşiyordu).
 */

import type { TrafficLightNutrition } from "../types/product";
import type { UserSensitivityProfile } from "../userProfile/userProfileTypes";

// ─── Tipler ───────────────────────────────────────────────────────────────────

/** Desteklenen risk seviyeleri */
export type RiskLevel = "low" | "medium" | "high" | "unknown";

/** Tek bir risk uyarısı */
export interface RiskWarning {
  /** Makine tarafından okunabilir tanımlayıcı */
  code: string;
  /** Kullanıcıya gösterilecek kısa başlık */
  title: string;
  /** Kullanıcıya gösterilecek açıklama metni */
  message: string;
  /** Bu uyarının kendi risk ağırlığı */
  level: RiskLevel;
}

/** evaluateProductRisks fonksiyonunun dönüş değeri */
export interface ProductRiskResult {
  /** Tüm uyarılar birlikte değerlendirilerek hesaplanan genel risk seviyesi */
  overallRisk: RiskLevel;
  /** Tespit edilen uyarıların listesi */
  warnings: RiskWarning[];
  /** Değerlendirme yapılabilmesi için yeterli bilgi var mıydı? */
  isEvaluated: boolean;
}

/**
 * evaluateProductRisks'e aktarılan ürün verisi.
 * Tüm alanlar opsiyoneldir — motor eksik alanlara göre uyarı üretir.
 * Eski çağrılarla geriye dönük uyumludur.
 */
export interface ProductRiskInput {
  /** Ürün adı — grup bazlı ihtiyat kuralları için kullanılır */
  name?: string | null;
  /** Ürünün içindekiler listesi (ham metin) */
  ingredients?: string | null;
  /** Alerjen bilgisi metni (ham string form) — "içerir" beyanı */
  allergenInfo?: string | null;
  /** Alerjen listesi (dizi form — product-result ekranından gelir) — "içerir" beyanı */
  allergens?: string[];
  /**
   * Eser / çapraz bulaşma ("içerebilir") beyanı metni (ham string form).
   * `allergenInfo` ile KARIŞTIRILMAZ — declared_contains ile trace_may_contain ayrı
   * durumlardır (ADR-004, allergen-safety skill). "İçerir" kesinliği taşımaz.
   */
  traceAllergenInfo?: string | null;
  /**
   * Eser / çapraz bulaşma ("içerebilir") alerjen listesi (dizi form).
   * `allergens` ile KARIŞTIRILMAZ (ADR-004).
   */
  traceAllergens?: string[];
  /** Katkı maddesi içerip içermediğini belirten bayrak */
  hasAdditives?: boolean | null;
  /** Katkı maddesi listesi (dizi form — product-result ekranından gelir) */
  additives?: string[];
  /** NOVA grubu (1–4) — gıda işleme düzeyi sınıflandırması */
  novaGroup?: number | null;
  /** Traffic Light besin etiketi — yağ, doymuş yağ, şeker ve tuz düzeyleri */
  trafficLight?: TrafficLightNutrition | null;
  /**
   * Nutri-Score kategorisi (A–E).
   * Kaynak: Hercberg S. et al. (2017). The Nutri-Score: A Five-Colour Nutrition Label.
   * European Journal of Public Health. doi:10.1093/eurpub/ckx028
   * Büyük/küçük harf duyarsız değerlendirilir; null/undefined ise kural çalışmaz.
   */
  nutriScore?: string | null;
  /** Kullanıcı hassasiyet profili — profil bazlı uyarılar için opsiyonel */
  userProfile?: UserSensitivityProfile;
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────

/** Risk seviyelerinin sayısal ağırlıkları — genel seviye hesaplamada kullanılır */
const RISK_WEIGHT: Record<RiskLevel, number> = {
  unknown: 0,
  low: 1,
  medium: 2,
  high: 3,
};

/** Uyarı gösterim sırası — listede bulunmayan kodlar en sona düşer */
const PRIORITY_ORDER: string[] = [
  // 1. Profil bazlı uyarılar
  "PROFILE_ALLERGEN_INFO_MISSING",
  "PROFILE_PEANUT_ALLERGEN_MATCH",
  "PROFILE_PEANUT_TRACE_MATCH",
  "PROFILE_SOY_ALLERGEN_MATCH",
  "PROFILE_SOY_TRACE_MATCH",
  "PROFILE_GLUTEN_ALLERGEN_MATCH",
  "PROFILE_GLUTEN_TRACE_MATCH",
  "PROFILE_MILK_ALLERGEN_MATCH",
  "PROFILE_MILK_TRACE_MATCH",
  "PROFILE_LACTOSE_ALLERGEN_MATCH",
  "PROFILE_LACTOSE_TRACE_MATCH",
  "PROFILE_TREE_NUTS_ALLERGEN_MATCH",
  "PROFILE_TREE_NUTS_TRACE_MATCH",
  "PROFILE_SESAME_ALLERGEN_MATCH",
  "PROFILE_SESAME_TRACE_MATCH",
  "PROFILE_FISH_ALLERGEN_MATCH",
  "PROFILE_FISH_TRACE_MATCH",
  "PROFILE_SHELLFISH_ALLERGEN_MATCH",
  "PROFILE_SHELLFISH_TRACE_MATCH",
  "PROFILE_EGG_ALLERGEN_MATCH",
  "PROFILE_EGG_TRACE_MATCH",
  "PROFILE_EGG_PRECAUTION",
  "PROFILE_BLOOD_SUGAR_PRECAUTION",
  "PROFILE_SODIUM_PRECAUTION",
  "PROFILE_SATURATED_FAT_SENSITIVITY",
  "PROFILE_KIDNEY_SALT_SENSITIVITY",
  "PROFILE_LESS_SUGAR_PREFERENCE",
  "PROFILE_LESS_SALT_PREFERENCE",
  "PROFILE_ULTRA_PROCESSED_PREFERENCE",
  "PROFILE_LESS_ADDITIVES_PREFERENCE",
  "PROFILE_CLEAN_LABEL_PREFERENCE",
  "PROFILE_CHILD_SAFE_SELECTION",
  "PROFILE_TRAFFIC_LIGHT_HIGH_SUGAR",
  "PROFILE_TRAFFIC_LIGHT_HIGH_SALT",

  // 2. Eksik bilgi uyarıları
  "MISSING_INGREDIENTS",
  "MISSING_ALLERGEN_INFO",

  // 3. Yüksek işlenmişlik / katkı / besin etiketi uyarıları
  "NOVA_GROUP_4",
  "NUTRI_SCORE_LOW_CATEGORY",
  "CONTAINS_ADDITIVES",
  "TRAFFIC_LIGHT_HIGH_SATURATED_FAT",

  // 4. Ürün grubu ihtiyat uyarıları
  "PROCESSED_MEAT_PRECAUTION",
  "SWEET_SNACK_ALLERGEN_PRECAUTION",
  "VEGAN_ALLERGEN_PRECAUTION",
];

// ─── Metin Normalleştirme ─────────────────────────────────────────────────────

/**
 * Alerjen içerik eşleştirmesi için metin normalleştirici.
 *
 * Adımlar:
 * 1. Türkçe dotless-ı → i  (NFD bu karakteri ayrıştırmaz; açıkça değiştirilir)
 * 2. Unicode NFD ayrıştırma — Türkçe ş, ç, ğ, ü, ö ve İ gibi karakterleri
 *    temel harf + birleştirici işaret çiftlerine böler.
 *    Örnek: ş → s + \u0327,  İ → I + \u0307,  ğ → g + \u0306
 * 3. Birleştirici işaretleri (U+0300–U+036F) kaldır → temel Latin harfleri kalır.
 * 4. Küçük harfe çevir.
 *
 * Sonuç: "Yer Fıstığı" → "yer fistigi",  "Soya Lesitini" → "soya lesitini"
 */
function normalizeText(text: string): string {
  return text
    .replace(/ı/g, "i")                       // dotless-ı: NFD ile çözülmez
    .normalize("NFD")                          // bileşik karakterleri ayır
    .replace(/[\u0300-\u036f]/g, "")           // birleştirici işaretleri sil
    .toLowerCase();
}

// ─── İçerik Eşleştirme Yardımcısı ────────────────────────────────────────────

/**
 * ingredients, allergenInfo ve allergens dizisini birleştirip
 * verilen anahtar kelimelerden herhangi birinin geçip geçmediğini kontrol eder.
 *
 * Hem kaynak metin hem anahtar kelimeler normalizeText ile işlenir;
 * Türkçe karakter ve büyük/küçük harf farkı göz ardı edilir.
 */
function productContainsAny(product: ProductRiskInput, keywords: string[]): boolean {
  const combined = normalizeText(
    [
      product.ingredients ?? "",
      product.allergenInfo ?? "",
      (product.allergens ?? []).join(" "),
    ].join(" "),
  );

  return keywords.some((kw) => combined.includes(normalizeText(kw)));
}

/**
 * productContainsAny ile aynı eşleştirme, yalnız eser/çapraz bulaşma ("içerebilir") alanları
 * için (`traceAllergenInfo`, `traceAllergens`). İçindekiler metni burada TARANMAZ — trace
 * beyanı declared beyandan ayrı, kendi alanında taşınır (ADR-004).
 */
function productTraceContainsAny(product: ProductRiskInput, keywords: string[]): boolean {
  const combined = normalizeText(
    [
      product.traceAllergenInfo ?? "",
      (product.traceAllergens ?? []).join(" "),
    ].join(" "),
  );

  return keywords.some((kw) => combined.includes(normalizeText(kw)));
}

/**
 * OFF'un tür belirtmeyen GENEL alerjen etiketleri ("nuts", "crustaceans", "molluscs").
 * Bunlar serbest metin (`productContainsAny`/`productTraceContainsAny`) ile ARANMAZ: kısa,
 * yaygın İngilizce kelimeler oldukları için ilgisiz içeriklerle çakışırlar — "nuts" içindekiler
 * metninde "coconuts", "doughnuts" veya yapılandırılmış dizide "peanuts" (ayrı bir alerjendir)
 * ile de eşleşirdi. Bu nedenle yalnız YAPILANDIRILMIŞ `allergens`/`traceAllergens` dizisinde,
 * TAM etiket eşleşmesiyle değerlendirilir (proje sahibi düzeltmesi, 2026-09-18).
 */
function arrayHasExactTag(list: string[] | undefined, tags: readonly string[]): boolean {
  if (!list || list.length === 0) return false;
  const normalized = list.map((item) => normalizeText(item.trim()));
  return tags.some((tag) => normalized.includes(normalizeText(tag)));
}

const GENERIC_TREE_NUT_TAGS = ["nuts"] as const;
const GENERIC_SHELLFISH_TAGS = ["crustaceans", "molluscs"] as const;

/**
 * Yer fıstığı / peanut arama terimleri.
 *
 * "fıstık" tek başına Antep fıstığını da kapsayabilir; bu nedenle
 * "yer fıstığı", "peanut" ve "groundnut" daha güçlü sinyal kabul edilir.
 * Ancak "fıstık ezmesi" ve "fıstık" de listeye dahildir — mesaj ihtiyatlı tutulur.
 */
const PEANUT_KEYWORDS = [
  "peanut",
  "groundnut",
  "yer fıstığı",
  "yer fistigi",
  "fıstık ezmesi",
  "fistik ezmesi",
  "fıstık",
  "fistik",
];

/**
 * Soya arama terimleri.
 * Uzun formlar önce aranır; "soy" kısa ama gıda içerik listesinde tekil
 * geçişi soya anlamına taşır.
 */
const SOY_KEYWORDS = [
  "soy lecithin",
  "soya lesitini",
  "soy protein",
  "soya protein",
  "soybean",
  "soya",
  "soy",
];

/**
 * Gluten / buğday arama terimleri.
 * Kaynak: Türk Gıda Kodeksi ve Avrupa Birliği alerjen listesi.
 */
const GLUTEN_KEYWORDS = [
  "buğday",
  "bugday",
  "wheat",
  "gluten",
  "barley",
  "arpa",
  "rye",
  "çavdar",
  "cavdar",
  "malt",
  "spelt",
  "kamut",
];

/**
 * Süt alerjisi arama terimleri.
 * Laktozu kapsamaz; sadece süt proteini / süt kaynaklı bileşenler.
 */
const MILK_KEYWORDS = [
  "süt proteini",
  "sut proteini",
  "milk protein",
  "peynir altı suyu",
  "whey",
  "casein",
  "caseinate",
  "kazein",
  "dairy",
  "yoğurt",
  "yogurt",
  "süt",
  "milk",
];

/**
 * Laktoz hassasiyeti arama terimleri.
 * Açık laktoz beyanı + genel süt/dairy bileşenleri dahildir.
 */
const LACTOSE_KEYWORDS = [
  "laktoz",
  "lactose",
  "süt",
  "milk",
  "dairy",
  "whey",
];

/**
 * Ağaç yemişleri (tree nuts) arama terimleri.
 * Yer fıstığı (peanut/groundnut) bu listeye dahil değildir; ayrı kural kapsar. OFF'un genel
 * "nuts" etiketi burada YOKTUR — bkz. `GENERIC_TREE_NUT_TAGS` / `arrayHasExactTag` (serbest
 * metinde "coconuts"/"doughnuts" ile, yapılandırılmış dizide "peanuts" ile yanlış eşleşirdi).
 */
const TREE_NUTS_KEYWORDS = [
  "fındık ezmesi",
  "hazelnut butter",
  "almond butter",
  "fındık",
  "hazelnut",
  "badem",
  "almond",
  "ceviz",
  "walnut",
  "kaju",
  "cashew",
  "antep fıstığı",
  "pistachio",
  "pecan",
  "macadamia",
];

/** Susam / sesame arama terimleri. */
const SESAME_KEYWORDS = [
  "tahini",
  "tahin",
  "susam",
  "sesame",
];

/** Balık alerjisi arama terimleri. */
const FISH_KEYWORDS = [
  "ton balığı",
  "tuna",
  "somon",
  "salmon",
  "hamsi",
  "anchovy",
  "sardalya",
  "sardine",
  "levrek",
  "sea bass",
  "balık",
  "fish",
];

/**
 * Kabuklu deniz ürünleri alerjisi arama terimleri. OFF'un genel "crustaceans"/"molluscs"
 * etiketleri burada YOKTUR — bkz. `GENERIC_SHELLFISH_TAGS` / `arrayHasExactTag` (yalnız
 * yapılandırılmış dizide tam eşleşme; serbest metinde aranmaz). Bu ikisinin tek `shellfish`
 * profil anahtarına eşlenmesi kesinleşmiş sayılmaz — mevzuat/gıda uzmanı incelemesi gerektirir
 * (allergen-safety skill, ADR-004).
 */
const SHELLFISH_KEYWORDS = [
  "kabuklu deniz ürünü",
  "shellfish",
  "karides",
  "shrimp",
  "prawn",
  "yengeç",
  "crab",
  "istakoz",
  "lobster",
  "midye",
  "mussel",
  "istiridye",
  "oyster",
  "ahtapot",
  "squid",
  "kalamar",
];

/**
 * Yumurta alerjisi arama terimleri. Mevcut `PROFILE_EGG_PRECAUTION` kategori bazlı bir
 * ihtiyattır (işlenmiş et/tatlı/vegan ürün grubu); bu liste ayrı, içerik/beyan tabanlı
 * `PROFILE_EGG_ALLERGEN_MATCH` / `PROFILE_EGG_TRACE_MATCH` kuralları içindir (proje sahibi
 * düzeltmesi, 2026-09-18 — üçüncü tur).
 */
const EGG_KEYWORDS = [
  "yumurta tozu",
  "egg powder",
  "yumurta akı",
  "yumurta sarısı",
  "albümin",
  "albumin",
  "yumurta",
  "egg",
];

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

/**
 * Profil bazlı uyarı varsa gereksiz hale gelen genel uyarıları listeden çıkarır.
 * Orijinal diziyi değiştirmez; yeni dizi döner.
 *
 * Mevcut kural:
 * - PROFILE_ALLERGEN_INFO_MISSING varsa MISSING_ALLERGEN_INFO gösterilmez.
 */
function suppressRedundantWarnings(warnings: RiskWarning[]): RiskWarning[] {
  const codes = new Set(warnings.map((w) => w.code));

  const suppress = new Set<string>();

  if (codes.has("PROFILE_ALLERGEN_INFO_MISSING")) {
    suppress.add("MISSING_ALLERGEN_INFO");
  }

  if (suppress.size === 0) return warnings;
  return warnings.filter((w) => !suppress.has(w.code));
}

/**
 * Uyarıları PRIORITY_ORDER'a göre sıralar.
 * Listede bulunmayan kodlar sıranın en sonuna eklenir.
 * Orijinal diziyi değiştirmez; yeni dizi döner.
 */
function sortWarningsByPriority(warnings: RiskWarning[]): RiskWarning[] {
  return [...warnings].sort((a, b) => {
    const indexA = PRIORITY_ORDER.indexOf(a.code);
    const indexB = PRIORITY_ORDER.indexOf(b.code);
    const rankA = indexA === -1 ? PRIORITY_ORDER.length : indexA;
    const rankB = indexB === -1 ? PRIORITY_ORDER.length : indexB;
    return rankA - rankB;
  });
}

/**
 * Uyarı listesindeki en yüksek ağırlıklı seviyeyi döndürür.
 * Hiç uyarı yoksa "low" döner.
 */
function resolveOverallRisk(warnings: RiskWarning[]): RiskLevel {
  if (warnings.length === 0) return "low";
  return warnings.reduce<RiskLevel>((highest, warning) => {
    return RISK_WEIGHT[warning.level] > RISK_WEIGHT[highest]
      ? warning.level
      : highest;
  }, "low");
}

// ─── Ana Fonksiyon ────────────────────────────────────────────────────────────

export function evaluateProductRisks(product: ProductRiskInput): ProductRiskResult {
  const warnings: RiskWarning[] = [];

  // ── Kural 1: İçindekiler bilgisi eksikse ──────────────────────────────────
  const hasIngredients =
    typeof product.ingredients === "string" &&
    product.ingredients.trim().length > 0;

  if (!hasIngredients) {
    warnings.push({
      code: "MISSING_INGREDIENTS",
      title: "İçindekiler bilgisi eksik",
      message: "İçindekiler bilgisi bulunamadı.",
      level: "medium",
    });
  }

  // ── Kural 2: Alerjen bilgisi eksikse ─────────────────────────────────────
  // "Eksik" yalnız hiçbir beyan (ne içerir ne içerebilir) yokken doğrudur; yalnız
  // eser/çapraz bulaşma (trace) beyanı olan ürün "eksik" değildir (ADR-004).
  const hasDeclaredAllergenInfo =
    (typeof product.allergenInfo === "string" && product.allergenInfo.trim().length > 0) ||
    ((product.allergens ?? []).length > 0);
  const hasTraceAllergenInfo =
    (typeof product.traceAllergenInfo === "string" && product.traceAllergenInfo.trim().length > 0) ||
    ((product.traceAllergens ?? []).length > 0);
  const hasAllergenInfo = hasDeclaredAllergenInfo || hasTraceAllergenInfo;

  if (!hasAllergenInfo) {
    warnings.push({
      code: "MISSING_ALLERGEN_INFO",
      title: "Alerjen bilgisi eksik",
      message: "Alerjen bilgisi eksik. Ambalaj kontrol edilmeli.",
      level: "high",
    });
  }

  // ── Kural 3: Katkı maddesi varsa ─────────────────────────────────────────
  const containsAdditives =
    product.hasAdditives === true ||
    ((product.additives ?? []).length > 0);

  if (containsAdditives) {
    warnings.push({
      code: "CONTAINS_ADDITIVES",
      title: "Katkı maddesi içeriyor olabilir",
      message: "Katkı maddesi içeriyor olabilir.",
      level: "medium",
    });
  }

  // ── Kural 4: NOVA grubu 4 ise ─────────────────────────────────────────────
  if (product.novaGroup === 4) {
    warnings.push({
      code: "NOVA_GROUP_4",
      title: "Ultra işlenmiş ürün",
      message: "Ultra işlenmiş ürün olabilir.",
      level: "high",
    });
  }

  // ── Kural 4b: Nutri-Score D veya E ise ───────────────────────────────────
  // Kaynak: Hercberg S. et al. (2017) — D ve E kategorileri besleyici değeri
  // düşük ürünleri temsil eder. Bu uyarı tıbbi hüküm niteliği taşımaz.
  const nutriScoreNorm = (product.nutriScore ?? "").trim().toUpperCase();
  if (nutriScoreNorm === "D" || nutriScoreNorm === "E") {
    warnings.push({
      code: "NUTRI_SCORE_LOW_CATEGORY",
      title: "Nutri-Score kategorisi dikkat gerektiriyor",
      message:
        "Nutri-Score bilgisine göre bu ürün D/E kategorisinde görünüyor. " +
        "Bu sonuç tek başına sağlık kararı yerine geçmez; porsiyon, içerik ve " +
        "diğer besin etiketi bilgileriyle birlikte değerlendirilmelidir.",
      level: "medium",
    });
  }

  // ── Ürün grubu ihtiyat kuralları (ürün adına göre) ────────────────────────
  const nameLower = (product.name ?? "").toLowerCase();

  const PROCESSED_MEAT_KEYWORDS = [
    "salam", "sosis", "sucuk", "jambon",
    "füme", "pastırma", "parizer", "şarküteri",
  ];
  const SWEET_SNACK_KEYWORDS = [
    "çikolata", "cikolata", "gofret", "bisküvi",
    "biskuvi", "kek", "krema", "bar", "kakaolu",
  ];
  const VEGAN_KEYWORDS = [
    "vegan", "bitkisel", "plant-based",
    "bitkisel süt", "vegan peynir", "vegan burger",
  ];

  const isProcessedMeat = PROCESSED_MEAT_KEYWORDS.some((kw) => nameLower.includes(kw));
  const isSweetSnack = SWEET_SNACK_KEYWORDS.some((kw) => nameLower.includes(kw));
  const isVegan = VEGAN_KEYWORDS.some((kw) => nameLower.includes(kw));

  // ── Kural 5: İşlenmiş et / şarküteri ─────────────────────────────────────
  if (isProcessedMeat) {
    warnings.push({
      code: "PROCESSED_MEAT_PRECAUTION",
      title: "İşlenmiş et / şarküteri uyarısı",
      message:
        "Bu ürün işlenmiş et veya şarküteri grubunda olabilir. Alerjen, katkı maddesi ve çapraz bulaşma beyanları ambalaj üzerinden dikkatle kontrol edilmelidir.",
      level: "medium",
    });
  }

  // ── Kural 6: Tatlı / çikolatalı / kremalı ürün ───────────────────────────
  if (isSweetSnack) {
    warnings.push({
      code: "SWEET_SNACK_ALLERGEN_PRECAUTION",
      title: "Tatlı / atıştırmalık alerjen uyarısı",
      message:
        "Bu ürün süt, fındık/fıstık, soya, gluten veya benzeri alerjenlerle ilişkili olabilir. Alerjisi veya hassasiyeti olan kullanıcılar içerik ve alerjen beyanını kontrol etmelidir.",
      level: "medium",
    });
  }

  // ── Kural 7: Vegan / bitkisel alternatif ─────────────────────────────────
  if (isVegan) {
    warnings.push({
      code: "VEGAN_ALLERGEN_PRECAUTION",
      title: "Vegan / bitkisel ürün uyarısı",
      message:
        "Vegan veya bitkisel ibaresi ürünün alerjensiz olduğu anlamına gelmez. Çapraz bulaşma ve alerjen beyanları kontrol edilmelidir.",
      level: "medium",
    });
  }

  // ── Traffic Light genel besin etiketi kuralları ───────────────────────────
  if (product.trafficLight?.saturatedFat.level === "high") {
    warnings.push({
      code: "TRAFFIC_LIGHT_HIGH_SATURATED_FAT",
      title: "Doymuş yağ seviyesi yüksek",
      message:
        "Traffic Light besin etiketine göre bu üründe doymuş yağ seviyesi yüksek görünüyor. Porsiyon miktarı ve besin değerleri dikkatle kontrol edilmelidir.",
      level: "medium",
    });
  }

  // ── Profil bazlı ihtiyat kuralları ───────────────────────────────────────
  const profile = product.userProfile;

  if (profile) {
    const hasAllergenProfile = profile.allergens.length > 0;

    // ── Profil Kural A1: Alerjen profili var + içerik/alerjen bilgisi eksik ──
    if (hasAllergenProfile && !hasIngredients && !hasAllergenInfo) {
      warnings.push({
        code: "PROFILE_ALLERGEN_INFO_MISSING",
        title: "Alerjen bilgisi kontrol edilmeli",
        message:
          "Profilinizde alerjen hassasiyeti tanımlı. Bu üründe içerik veya alerjen bilgisi eksik olduğu için ambalaj üzerindeki alerjen ve çapraz bulaşma beyanları kontrol edilmelidir.",
        level: "medium",
      });
    }

    // ── Profil Kural A2: Fıstık alerjisi + içerikte fıstık/peanut beyanı ────
    // ingredients, allergenInfo ve allergens dizisi normalizeText ile birlikte taranır.
    // "fıstık" tek başına Antep fıstığını da kapsayabileceğinden mesaj ihtiyatlı tutulmuştur.
    if (
      profile.allergens.includes("peanut") &&
      productContainsAny(product, PEANUT_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_PEANUT_ALLERGEN_MATCH",
        title: "Fıstık alerjisi için yüksek dikkat",
        message:
          "Bu üründe fıstık/yer fıstığı ile ilişkili içerik veya alerjen beyanı bulunuyor. " +
          "Profilinizde fıstık alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A2b: Fıstık alerjisi + eser/çapraz bulaşma beyanı (ADR-004) ──
    // declared_contains ile trace_may_contain ayrı durumlardır; ayrı kod, aynı önem.
    if (
      profile.allergens.includes("peanut") &&
      productTraceContainsAny(product, PEANUT_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_PEANUT_TRACE_MATCH",
        title: "Fıstık için çapraz bulaşma uyarısı",
        message:
          "Bu üründe fıstık/yer fıstığı için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde fıstık alerjisi tanımlı olduğu için " +
          "ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle kontrol " +
          "etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A3: Soya alerjisi + içerikte soya beyanı ────────────────
    if (
      profile.allergens.includes("soy") &&
      productContainsAny(product, SOY_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_SOY_ALLERGEN_MATCH",
        title: "Soya alerjisi için yüksek dikkat",
        message:
          "Bu üründe soya ile ilişkili içerik veya alerjen beyanı bulunuyor. " +
          "Profilinizde soya alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A3b: Soya alerjisi + eser/çapraz bulaşma beyanı (ADR-004) ───
    if (
      profile.allergens.includes("soy") &&
      productTraceContainsAny(product, SOY_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_SOY_TRACE_MATCH",
        title: "Soya için çapraz bulaşma uyarısı",
        message:
          "Bu üründe soya için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde soya alerjisi tanımlı olduğu için " +
          "ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle kontrol " +
          "etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A4: Gluten/buğday hassasiyeti + içerikte gluten beyanı ──
    if (
      profile.allergens.includes("gluten_wheat") &&
      productContainsAny(product, GLUTEN_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_GLUTEN_ALLERGEN_MATCH",
        title: "Gluten / buğday hassasiyeti için yüksek dikkat",
        message:
          "Bu üründe gluten veya buğday ile ilişkili içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde gluten/buğday hassasiyeti tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A4b: Gluten hassasiyeti + eser/çapraz bulaşma beyanı (ADR-004) ─
    if (
      profile.allergens.includes("gluten_wheat") &&
      productTraceContainsAny(product, GLUTEN_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_GLUTEN_TRACE_MATCH",
        title: "Gluten / buğday için çapraz bulaşma uyarısı",
        message:
          "Bu üründe gluten/buğday için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde gluten/buğday hassasiyeti tanımlı " +
          "olduğu için ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle " +
          "kontrol etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A5: Süt alerjisi + içerikte süt/kazein/whey beyanı ──────
    if (
      profile.allergens.includes("milk") &&
      productContainsAny(product, MILK_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_MILK_ALLERGEN_MATCH",
        title: "Süt alerjisi için yüksek dikkat",
        message:
          "Bu üründe süt veya süt bileşenleriyle ilişkili içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde süt alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A5b: Süt alerjisi + eser/çapraz bulaşma beyanı (ADR-004) ────
    if (
      profile.allergens.includes("milk") &&
      productTraceContainsAny(product, MILK_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_MILK_TRACE_MATCH",
        title: "Süt için çapraz bulaşma uyarısı",
        message:
          "Bu üründe süt için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde süt alerjisi tanımlı olduğu için " +
          "ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle kontrol " +
          "etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A6: Laktoz hassasiyeti + içerikte laktoz/süt beyanı ─────
    if (
      profile.allergens.includes("lactose") &&
      productContainsAny(product, LACTOSE_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_LACTOSE_ALLERGEN_MATCH",
        title: "Laktoz hassasiyeti için dikkat",
        message:
          "Bu üründe laktoz veya süt bileşenleriyle ilişkili içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde laktoz hassasiyeti tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; porsiyon ve içerik bilgisiyle birlikte değerlendirilmelidir.",
        level: "medium",
      });
    }

    // ── Profil Kural A6b: Laktoz hassasiyeti + eser/çapraz bulaşma beyanı (ADR-004) ─
    if (
      profile.allergens.includes("lactose") &&
      productTraceContainsAny(product, LACTOSE_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_LACTOSE_TRACE_MATCH",
        title: "Laktoz için çapraz bulaşma uyarısı",
        message:
          "Bu üründe laktoz/süt için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde laktoz hassasiyeti tanımlı olduğu için " +
          "ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle kontrol " +
          "etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; porsiyon ve içerik bilgisiyle birlikte değerlendirilmelidir.",
        level: "medium",
      });
    }

    // ── Profil Kural A7: Ağaç yemişleri hassasiyeti + içerikte fındık/nut beyanı ─
    // Belirli tür (fındık, badem…) serbest metinde; OFF'un genel "nuts" etiketi yalnız
    // yapılandırılmış `allergens` dizisinde tam eşleşmeyle (proje sahibi düzeltmesi).
    if (
      profile.allergens.includes("tree_nuts") &&
      (productContainsAny(product, TREE_NUTS_KEYWORDS) || arrayHasExactTag(product.allergens, GENERIC_TREE_NUT_TAGS))
    ) {
      warnings.push({
        code: "PROFILE_TREE_NUTS_ALLERGEN_MATCH",
        title: "Ağaç yemişleri hassasiyeti için yüksek dikkat",
        message:
          "Bu üründe fındık, badem, ceviz veya diğer ağaç yemişleriyle ilişkili " +
          "içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde ağaç yemişleri hassasiyeti tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A7b: Ağaç yemişleri + eser/çapraz bulaşma beyanı (ADR-004) ──
    if (
      profile.allergens.includes("tree_nuts") &&
      (productTraceContainsAny(product, TREE_NUTS_KEYWORDS) || arrayHasExactTag(product.traceAllergens, GENERIC_TREE_NUT_TAGS))
    ) {
      warnings.push({
        code: "PROFILE_TREE_NUTS_TRACE_MATCH",
        title: "Ağaç yemişleri için çapraz bulaşma uyarısı",
        message:
          "Bu üründe fındık, badem, ceviz veya diğer ağaç yemişleri için eser miktarda içerebilir / " +
          "çapraz bulaşma beyanı bulunuyor. Bu, kesin içerik bilgisi değildir; ancak profilinizde " +
          "ağaç yemişleri hassasiyeti tanımlı olduğu için ürünü tüketmeden önce ambalajdaki alerjen " +
          "ve çapraz bulaşma beyanını dikkatle kontrol etmeniz önerilir. Bu uyarı tıbbi hüküm " +
          "niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A8: Susam alerjisi + içerikte susam/tahin beyanı ─────────
    if (
      profile.allergens.includes("sesame") &&
      productContainsAny(product, SESAME_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_SESAME_ALLERGEN_MATCH",
        title: "Susam alerjisi için yüksek dikkat",
        message:
          "Bu üründe susam veya susam bileşenleriyle ilişkili içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde susam alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A8b: Susam alerjisi + eser/çapraz bulaşma beyanı (ADR-004) ──
    if (
      profile.allergens.includes("sesame") &&
      productTraceContainsAny(product, SESAME_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_SESAME_TRACE_MATCH",
        title: "Susam için çapraz bulaşma uyarısı",
        message:
          "Bu üründe susam için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde susam alerjisi tanımlı olduğu için " +
          "ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle kontrol " +
          "etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A9: Balık alerjisi + içerikte balık beyanı ──────────────
    if (
      profile.allergens.includes("fish") &&
      productContainsAny(product, FISH_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_FISH_ALLERGEN_MATCH",
        title: "Balık alerjisi için yüksek dikkat",
        message:
          "Bu üründe balık veya balık bileşenleriyle ilişkili içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde balık alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A9b: Balık alerjisi + eser/çapraz bulaşma beyanı (ADR-004) ──
    if (
      profile.allergens.includes("fish") &&
      productTraceContainsAny(product, FISH_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_FISH_TRACE_MATCH",
        title: "Balık için çapraz bulaşma uyarısı",
        message:
          "Bu üründe balık için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde balık alerjisi tanımlı olduğu için " +
          "ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle kontrol " +
          "etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A10: Kabuklu deniz ürünleri alerjisi + içerikte beyan ────
    // OFF'un genel "crustaceans"/"molluscs" etiketleri yalnız yapılandırılmış `allergens`
    // dizisinde tam eşleşmeyle (proje sahibi düzeltmesi).
    if (
      profile.allergens.includes("shellfish") &&
      (productContainsAny(product, SHELLFISH_KEYWORDS) || arrayHasExactTag(product.allergens, GENERIC_SHELLFISH_TAGS))
    ) {
      warnings.push({
        code: "PROFILE_SHELLFISH_ALLERGEN_MATCH",
        title: "Kabuklu deniz ürünleri alerjisi için yüksek dikkat",
        message:
          "Bu üründe karides, yengeç, midye veya diğer kabuklu deniz ürünleriyle ilişkili " +
          "içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde kabuklu deniz ürünleri alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A10b: Kabuklu deniz ürünleri + eser/çapraz bulaşma (ADR-004) ─
    if (
      profile.allergens.includes("shellfish") &&
      (productTraceContainsAny(product, SHELLFISH_KEYWORDS) || arrayHasExactTag(product.traceAllergens, GENERIC_SHELLFISH_TAGS))
    ) {
      warnings.push({
        code: "PROFILE_SHELLFISH_TRACE_MATCH",
        title: "Kabuklu deniz ürünleri için çapraz bulaşma uyarısı",
        message:
          "Bu üründe karides, yengeç, midye veya diğer kabuklu deniz ürünleri için eser miktarda " +
          "içerebilir / çapraz bulaşma beyanı bulunuyor. Bu, kesin içerik bilgisi değildir; ancak " +
          "profilinizde kabuklu deniz ürünleri alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A11: Yumurta alerjisi + içerikte yumurta beyanı (proje sahibi, 2026-09-18) ─
    // Kategori bazlı PROFILE_EGG_PRECAUTION'ın YERİNE geçmez; ayrı, içerik/beyan tabanlı koddur.
    if (
      profile.allergens.includes("egg") &&
      productContainsAny(product, EGG_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_EGG_ALLERGEN_MATCH",
        title: "Yumurta alerjisi için yüksek dikkat",
        message:
          "Bu üründe yumurta ile ilişkili içerik veya alerjen beyanı bulunuyor. " +
          "Profilinizde yumurta alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A11b: Yumurta alerjisi + eser/çapraz bulaşma beyanı ────
    if (
      profile.allergens.includes("egg") &&
      productTraceContainsAny(product, EGG_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_EGG_TRACE_MATCH",
        title: "Yumurta için çapraz bulaşma uyarısı",
        message:
          "Bu üründe yumurta için eser miktarda içerebilir / çapraz bulaşma beyanı bulunuyor. " +
          "Bu, kesin içerik bilgisi değildir; ancak profilinizde yumurta alerjisi tanımlı olduğu " +
          "için ürünü tüketmeden önce ambalajdaki alerjen ve çapraz bulaşma beyanını dikkatle " +
          "kontrol etmeniz önerilir. Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
        level: "high",
      });
    }

    // ── Profil Kural A4: Yumurta hassasiyeti + riskli ürün kategorisi ────────
    if (
      profile.allergens.includes("egg") &&
      (isProcessedMeat || isSweetSnack || isVegan)
    ) {
      warnings.push({
        code: "PROFILE_EGG_PRECAUTION",
        title: "Yumurta hassasiyeti için dikkat",
        message:
          "Profilinizde yumurta hassasiyeti tanımlı. Bu ürün grubunda yardımcı bileşenler, katkılar veya çapraz bulaşma ihtimali olabileceğinden ambalaj bilgileri dikkatle kontrol edilmelidir.",
        level: "medium",
      });
    }

    // ── Profil Kural B1: Kan şekeri hassasiyeti + tatlı/şekerli ürün ─────────
    if (
      profile.chronicSensitivities.includes("blood_sugar_diabetes") &&
      isSweetSnack
    ) {
      warnings.push({
        code: "PROFILE_BLOOD_SUGAR_PRECAUTION",
        title: "Kan şekeri hassasiyeti için dikkat",
        message:
          "Profilinizde kan şekeri hassasiyeti tanımlı. Bu ürün şeker içeriği açısından dikkatle değerlendirilmelidir; besin değerleri ve porsiyon bilgisi kontrol edilmelidir.",
        level: "medium",
      });
    }

    // ── Profil Kural B2: Sodyum hassasiyeti + işlenmiş et ────────────────────
    if (
      profile.chronicSensitivities.includes("hypertension_sodium") &&
      isProcessedMeat
    ) {
      warnings.push({
        code: "PROFILE_SODIUM_PRECAUTION",
        title: "Sodyum hassasiyeti için dikkat",
        message:
          "Profilinizde sodyum hassasiyeti tanımlı. Bu ürün grubunda tuz/sodyum içeriği yüksek olabileceğinden besin etiketi kontrol edilmelidir.",
        level: "medium",
      });
    }

    // ── Profil Kural B3: Kolesterol/doymuş yağ veya kalp-damar hassasiyeti ───
    if (
      (
        profile.chronicSensitivities.includes("cholesterol_saturated_fat") ||
        profile.chronicSensitivities.includes("cardiovascular")
      ) &&
      product.trafficLight?.saturatedFat.level === "high"
    ) {
      warnings.push({
        code: "PROFILE_SATURATED_FAT_SENSITIVITY",
        title: "Doymuş yağ hassasiyeti için dikkat",
        message:
          "Profilinizde kolesterol/doymuş yağ veya kalp-damar hassasiyeti tanımlı. " +
          "Traffic Light besin etiketine göre bu üründe doymuş yağ seviyesi yüksek görünüyor. " +
          "Porsiyon ve besin değerleri dikkatle kontrol edilmelidir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz.",
        level: "medium",
      });
    }

    // ── Profil Kural C1: Daha az şeker tercihi + tatlı/şekerli ürün ──────────
    if (
      profile.healthPreferences.includes("less_sugar") &&
      isSweetSnack
    ) {
      warnings.push({
        code: "PROFILE_LESS_SUGAR_PREFERENCE",
        title: "Daha az şeker tercihinize dikkat",
        message:
          "Profilinizde daha az şeker tercihi tanımlı. Bu ürünün şeker ve porsiyon bilgisi kontrol edilmelidir.",
        level: "low",
      });
    }

    // ── Profil Kural C2: Ultra işlenmiş ürün tercihi + NOVA 4 ────────────────
    if (
      profile.healthPreferences.includes("less_ultra_processed") &&
      product.novaGroup === 4
    ) {
      warnings.push({
        code: "PROFILE_ULTRA_PROCESSED_PREFERENCE",
        title: "Ultra işlenmiş ürün tercihinize dikkat",
        message:
          "Profilinizde daha az ultra işlenmiş ürün tercihi tanımlı. Bu ürün işlenmişlik düzeyi açısından dikkatle değerlendirilmelidir.",
        level: "low",
      });
    }

    // ── Profil Kural C3: Daha az katkı maddesi tercihi + katkı maddesi var ───
    if (
      profile.healthPreferences.includes("less_additives") &&
      containsAdditives
    ) {
      warnings.push({
        code: "PROFILE_LESS_ADDITIVES_PREFERENCE",
        title: "Daha az katkı maddesi tercihinize dikkat",
        message:
          "Profilinizde daha az katkı maddesi tercihi tanımlı. Bu üründe katkı maddesi beyanı " +
          "bulunduğu için içerik listesi dikkatle incelenmelidir. " +
          "Bu uyarı tek başına sağlık kararı yerine geçmez.",
        level: "low",
      });
    }

    // ── Profil Kural C4: Temiz içerik tercihi + NOVA 4 veya katkı maddesi ────
    if (
      profile.healthPreferences.includes("clean_label") &&
      (product.novaGroup === 4 || containsAdditives)
    ) {
      warnings.push({
        code: "PROFILE_CLEAN_LABEL_PREFERENCE",
        title: "Temiz içerik tercihinize dikkat",
        message:
          "Profilinizde temiz içerik tercihi tanımlı. Bu ürün işlenmişlik düzeyi veya katkı maddesi " +
          "beyanı açısından temiz içerik tercihinizle tam uyumlu olmayabilir. " +
          "İçerik listesi ve işlenmişlik bilgisi birlikte değerlendirilmelidir.",
        level: "low",
      });
    }

    // ── Profil Kural B4: Böbrek hassasiyeti + Traffic Light yüksek tuz ───────
    if (
      profile.chronicSensitivities.includes("kidney_sensitivity") &&
      product.trafficLight?.salt.level === "high"
    ) {
      warnings.push({
        code: "PROFILE_KIDNEY_SALT_SENSITIVITY",
        title: "Böbrek hassasiyeti için tuz uyarısı",
        message:
          "Profilinizde böbrek hassasiyeti tanımlı. " +
          "Traffic Light besin etiketine göre bu üründe tuz seviyesi yüksek görünüyor. " +
          "Porsiyon ve besin değerleri dikkatle kontrol edilmelidir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz.",
        level: "medium",
      });
    }

    // ── Profil Kural C5: Daha az tuz tercihi + Traffic Light yüksek tuz ──────
    if (
      profile.healthPreferences.includes("less_salt") &&
      product.trafficLight?.salt.level === "high"
    ) {
      warnings.push({
        code: "PROFILE_LESS_SALT_PREFERENCE",
        title: "Daha az tuz tercihinize dikkat",
        message:
          "Profilinizde daha az tuz tercihi tanımlı. " +
          "Traffic Light besin etiketine göre bu üründe tuz seviyesi yüksek görünüyor. " +
          "Porsiyon ve besin değerleri dikkatle kontrol edilmelidir.",
        level: "low",
      });
    }

    // ── Profil Kural C6: Çocuklar için dikkatli seçim + risk sinyali ─────────
    if (
      profile.healthPreferences.includes("child_safe_selection") &&
      (
        product.novaGroup === 4 ||
        containsAdditives ||
        product.trafficLight?.sugars.level === "high" ||
        product.trafficLight?.salt.level === "high" ||
        product.trafficLight?.saturatedFat.level === "high"
      )
    ) {
      warnings.push({
        code: "PROFILE_CHILD_SAFE_SELECTION",
        title: "Çocuklar için dikkatli seçim uyarısı",
        message:
          "Profilinizde çocuklar için daha dikkatli seçim tercihi tanımlı. " +
          "Bu ürün işlenmişlik düzeyi, katkı maddesi beyanı veya besin etiketi değerleri " +
          "açısından çocuklar için ayrıca değerlendirilmelidir. " +
          "Bu uyarı tek başına sağlık kararı yerine geçmez.",
        level: "medium",
      });
    }

    // ── Profil Kural D1: Traffic Light yüksek şeker + şeker hassasiyeti/tercihi ─
    if (
      product.trafficLight?.sugars.level === "high" &&
      (
        profile.healthPreferences.includes("less_sugar") ||
        profile.chronicSensitivities.includes("blood_sugar_diabetes")
      )
    ) {
      warnings.push({
        code: "PROFILE_TRAFFIC_LIGHT_HIGH_SUGAR",
        title: "Traffic Light şeker seviyesi yüksek",
        message:
          "Traffic Light besin etiketine göre bu üründe şeker seviyesi yüksek görünüyor. Profilinizde şekerle ilgili tercih veya hassasiyet bulunduğu için porsiyon ve besin değerleri dikkatle kontrol edilmelidir.",
        level: "medium",
      });
    }

    // ── Profil Kural D2: Traffic Light yüksek tuz + sodyum hassasiyeti ───────
    if (
      product.trafficLight?.salt.level === "high" &&
      profile.chronicSensitivities.includes("hypertension_sodium")
    ) {
      warnings.push({
        code: "PROFILE_TRAFFIC_LIGHT_HIGH_SALT",
        title: "Traffic Light tuz seviyesi yüksek",
        message:
          "Traffic Light besin etiketine göre bu üründe tuz seviyesi yüksek görünüyor. Profilinizde sodyum hassasiyeti bulunduğu için porsiyon ve besin değerleri dikkatle kontrol edilmelidir.",
        level: "medium",
      });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const overallRisk = resolveOverallRisk(warnings);
  const displayWarnings = sortWarningsByPriority(suppressRedundantWarnings(warnings));

  return {
    overallRisk,
    warnings: displayWarnings,
    isEvaluated: true,
  };
}