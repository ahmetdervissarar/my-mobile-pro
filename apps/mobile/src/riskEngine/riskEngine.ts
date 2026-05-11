/**
 * RafSkoru — Risk Motoru
 * apps/mobile/src/riskEngine/riskEngine.ts
 *
 * Sorumluluk: Ürün bilgilerine göre risk seviyesi ve uyarı listesi üretmek.
 * Bu dosya saf bir hesaplama katmanıdır — UI'a, API'ye ve fiyat sistemine dokunmaz.
 */

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
  "PROFILE_EGG_PRECAUTION",
  "PROFILE_BLOOD_SUGAR_PRECAUTION",
  "PROFILE_SODIUM_PRECAUTION",
  "PROFILE_LESS_SUGAR_PREFERENCE",
  "PROFILE_ULTRA_PROCESSED_PREFERENCE",
  // 2. Eksik bilgi uyarıları
  "MISSING_INGREDIENTS",
  "MISSING_ALLERGEN_INFO",
  // 3. Yüksek işlenmişlik / katkı uyarıları
  "NOVA_GROUP_4",
  "CONTAINS_ADDITIVES",
  // 4. Ürün grubu ihtiyat uyarıları
  "PROCESSED_MEAT_PRECAUTION",
  "SWEET_SNACK_ALLERGEN_PRECAUTION",
  "VEGAN_ALLERGEN_PRECAUTION",
];

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

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
  // Hem allergenInfo string hem de allergens dizisi kontrol edilir
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
  // Hem hasAdditives bayrağı hem de additives dizisi kontrol edilir
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
  const isSweetSnack    = SWEET_SNACK_KEYWORDS.some((kw) => nameLower.includes(kw));
  const isVegan         = VEGAN_KEYWORDS.some((kw) => nameLower.includes(kw));

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

    // ── Profil Kural A2: Yumurta hassasiyeti + riskli ürün kategorisi ────────
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
  }
  // ─────────────────────────────────────────────────────────────────────────

  const overallRisk = resolveOverallRisk(warnings);

  return {
    overallRisk,
    warnings: sortWarningsByPriority(warnings),
    isEvaluated: true,
  };
}