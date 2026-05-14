/**
 * RafSkoru — Risk Motoru
 * apps/mobile/src/riskEngine/riskEngine.ts
 *
 * Sorumluluk: Ürün bilgilerine göre risk seviyesi ve uyarı listesi üretmek.
 * Bu dosya saf bir hesaplama katmanıdır — UI'a, API'ye ve fiyat sistemine dokunmaz.
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
  /** Alerjen bilgisi metni (ham string form) */
  allergenInfo?: string | null;
  /** Alerjen listesi (dizi form — product-result ekranından gelir) */
  allergens?: string[];
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
  "PROFILE_SOY_ALLERGEN_MATCH",
  "PROFILE_GLUTEN_ALLERGEN_MATCH",
  "PROFILE_MILK_ALLERGEN_MATCH",
  "PROFILE_LACTOSE_ALLERGEN_MATCH",
  "PROFILE_EGG_PRECAUTION",
  "PROFILE_BLOOD_SUGAR_PRECAUTION",
  "PROFILE_SODIUM_PRECAUTION",
  "PROFILE_LESS_SUGAR_PREFERENCE",
  "PROFILE_ULTRA_PROCESSED_PREFERENCE",
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
  const hasAllergenInfo =
    (typeof product.allergenInfo === "string" && product.allergenInfo.trim().length > 0) ||
    ((product.allergens ?? []).length > 0);

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