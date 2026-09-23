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

/** Besin verisinin porsiyon tabanı. */
export type ChronicNutritionBasis = "per_100g" | "per_100ml";

/**
 * Ham (sınıflandırılmamış) besin değerleri, gram/kcal cinsinden — kronik
 * durum eşik kurallarının girdisidir (bkz. aşağıdaki "Kronik Eşik Kuralları"
 * bölümü). trafficLight yalnız BİLGİ amaçlı düşük/orta/yüksek bandı taşır;
 * eşik hesaplaması buradan, ham değerden yapılır.
 */
export interface ChronicNutritionInput {
  energyKcal: number | null;
  sugars: number | null;
  salt: number | null;
  saturatedFat: number | null;
  /** Bugün hiçbir veri kaynağı bu alanı doldurmuyor — var olduğunda kullanılır. */
  transFat: number | null;
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
  /** Traffic Light besin etiketi — yağ, doymuş yağ, şeker ve tuz düzeyleri (yalnız BİLGİ bandı) */
  trafficLight?: TrafficLightNutrition | null;
  /** Ham besin değerleri — kronik durum eşik kuralları bunu kullanır (bant değil). */
  nutrition?: ChronicNutritionInput | null;
  /** nutrition alanının porsiyon tabanı. Belirtilmezse per_100g varsayılır. */
  nutritionBasis?: ChronicNutritionBasis | null;
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
  "PROFILE_TREE_NUTS_ALLERGEN_MATCH",
  "PROFILE_SESAME_ALLERGEN_MATCH",
  "PROFILE_FISH_ALLERGEN_MATCH",
  "PROFILE_SHELLFISH_ALLERGEN_MATCH",
  "PROFILE_EGG_ALLERGEN_MATCH",
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
 * Yer fıstığı (peanut/groundnut) bu listeye dahil değildir; ayrı kural kapsar.
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
 * Yumurta alerjisi arama terimleri.
 * Bilinen güvenli yönde yanlış pozitif riskleri: "yumurtasız" (olumsuzluk eki
 * içerir ama normalizeText alt dizeyi yine de bulur — kasıtlı olarak ihtiyat
 * yönünde tutulur, "yumurta yok" bilgisini bastırmayız); "albumin" süt
 * kaynaklı da olabilir (laktalbümin) ama biz yine de dikkat uyarısı veririz;
 * "eggplant" (patlıcan) İngilizce'de "egg" alt dizesini içerir — İngilizce
 * ürün adı/ingredients metninde nadir de olsa yanlış eşleşme riski taşır.
 * Üçü de GÜVENLİ yönde (fazladan uyarı, kaçırılan uyarı değil) olduğundan
 * listeden çıkarılmadı.
 */
const EGG_KEYWORDS = [
  "yumurta",
  "egg",
  "albümin",
  "albumin",
];

/** Kabuklu deniz ürünleri alerjisi arama terimleri. */
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

// ─── Kronik Eşik Kuralları (diyabet / hipertansiyon / kalp-damar-kolesterol) ──
//
// Kapsam kararı: ADR-005 (kidney_sensitivity ve celiac_gluten'in neden bu
// eşik sistemine dahil OLMADIĞI orada gerekçelendirilmiştir). Eşik sayıları
// ve kaynaklar: ADR-006.
//
// Üç durum: "exceeds" | "within" | "no_data". Yalnız "exceeds" bir RiskWarning
// üretir — "no_data" SESSİZCE atlanır (uyarı yorgunluğu yaratmamak için);
// çağıran taraf (product-result.tsx) bunun yerine besin bölümünde nötr, tek
// satırlık bir "veri yok" notu göstermek isterse getChronicNutritionDataGap
// fonksiyonunu ayrıca çağırır.

/** Kronik eşik değerlendirmesinin üç olası sonucu. */
export type ChronicNutritionStatus = "exceeds" | "within" | "no_data";

/**
 * Ham gram değerini önce product.nutrition'dan, orada yoksa (eski çağıranlarla
 * geriye dönük uyumluluk için) product.trafficLight'ın kendi .value alanından
 * okur — trafficLight.value tarih olarak ham değeri taşıyan tek yerdi ve hâlâ
 * bazı çağıranlar (örn. manuel test senaryoları) yalnız onu dolduruyor.
 */
function getRawNutrientGrams(
  product: ProductRiskInput,
  nutrient: "sugars" | "salt" | "saturatedFat",
): number | null {
  const fromNutrition = product.nutrition?.[nutrient];
  if (typeof fromNutrition === "number") return fromNutrition;

  const fromTrafficLight = product.trafficLight?.[nutrient]?.value;
  return typeof fromTrafficLight === "number" ? fromTrafficLight : null;
}

function getEnergyKcal(product: ProductRiskInput): number | null {
  const energy = product.nutrition?.energyKcal;
  return typeof energy === "number" ? energy : null;
}

function getTransFatGrams(product: ProductRiskInput): number | null {
  const transFat = product.nutrition?.transFat;
  return typeof transFat === "number" ? transFat : null;
}

/**
 * Tuz (g) → sodyum (mg) dönüşümü için TEK nokta.
 * sodyum(mg) = tuz(g) × 400 — NaCl'nin kütlece ~%39.3 sodyum içermesinden
 * gelen, gıda etiketlemesinde standart kabul edilen yuvarlanmış katsayı.
 */
function saltGramsToSodiumMg(saltGrams: number): number {
  return saltGrams * 400;
}

/**
 * Diyabet / kan şekeri eşiği.
 * Kaynak: DSÖ (WHO, 2015) "Guideline: Sugars intake for adults and children"
 * — serbest şekerden gelen enerji, toplam enerjinin %10'unu geçmemeli.
 * OFF verisi serbest ve doğal şekeri ayırmadığından TOPLAM şeker burada
 * ihtiyatlı bir vekil olarak kullanılır (bilinen sınır — bkz. ADR-006).
 * Enerji verisi yoksa FSA'nın per-100g "yüksek şeker" eşiği (>22.5 g)
 * kullanılır (bkz. trafficLightClassifier.ts / trafficLight.ts ile aynı sayı).
 */
function classifySugarsForDiabetes(
  sugarsGrams: number | null,
  energyKcal: number | null,
): ChronicNutritionStatus {
  if (sugarsGrams === null) return "no_data";

  if (energyKcal !== null && energyKcal > 0) {
    return sugarsGrams * 4 >= 0.10 * energyKcal ? "exceeds" : "within";
  }

  return sugarsGrams > 22.5 ? "exceeds" : "within";
}

/**
 * Hipertansiyon / sodyum eşiği.
 * Kaynak: TGK Beslenme Beyanları Yönetmeliği'nin "düşük sodyum" referans
 * çerçevesi ve PAHO (Pan American Health Organization) Besin Profili
 * Modeli — sodyum ≥1 mg/kcal (≈100 mg/100 kcal sınırının karşılığı) VEYA
 * tuz ≥0.75 g/100g (PAHO/Meksika modelindeki 300 mg sodyum/100g "aşırı"
 * eşiğinin tuz karşılığı: 300 ÷ 400 = 0.75 g).
 * İkinci koşul enerjiden bağımsız olduğundan enerji verisi olmayan
 * ürünlerde de tek başına değerlendirilebilir.
 */
function classifySaltForHypertension(
  saltGrams: number | null,
  energyKcal: number | null,
): ChronicNutritionStatus {
  if (saltGrams === null) return "no_data";

  const exceedsBySaltAlone = saltGrams >= 0.75;

  if (energyKcal !== null && energyKcal > 0) {
    const sodiumMg = saltGramsToSodiumMg(saltGrams);
    const exceedsBySodiumPerKcal = sodiumMg / energyKcal >= 1;
    return exceedsBySodiumPerKcal || exceedsBySaltAlone ? "exceeds" : "within";
  }

  return exceedsBySaltAlone ? "exceeds" : "within";
}

/**
 * Kalp-damar / kolesterol (doymuş yağ) eşiği.
 * Kaynak: DSÖ (WHO, 2018 taslak kılavuz) — doymuş yağdan gelen enerji,
 * toplam enerjinin %10'unu geçmemeli. Enerji verisi yoksa FSA'nın per-100g
 * "yüksek doymuş yağ" eşiği (>5 g) kullanılır.
 * Trans yağ verisi VARSA (bugün hiçbir veri kaynağı doldurmuyor — bkz.
 * ChronicNutritionInput.transFat) ayrıca değerlendirilir: DSÖ trans yağdan
 * gelen enerjinin toplam enerjinin %1'ini geçmemesini önerir.
 */
function classifySaturatedFatForCardio(
  saturatedFatGrams: number | null,
  energyKcal: number | null,
  transFatGrams: number | null,
): ChronicNutritionStatus {
  if (saturatedFatGrams === null) return "no_data";

  if (energyKcal !== null && energyKcal > 0) {
    const exceedsBySaturatedFat = saturatedFatGrams * 9 >= 0.10 * energyKcal;
    const exceedsByTransFat =
      transFatGrams !== null && transFatGrams * 9 >= 0.01 * energyKcal;
    return exceedsBySaturatedFat || exceedsByTransFat ? "exceeds" : "within";
  }

  return saturatedFatGrams > 5 ? "exceeds" : "within";
}

/**
 * Kullanıcının profilinde aktif olan üç kronik eşik ekseninden (diyabet,
 * hipertansiyon, kalp-damar/kolesterol) EN AZ BİRİ için ürünün ilgili besin
 * verisi eksikse true döner. product-result.tsx bunu evaluateProductRisks'ten
 * BAĞIMSIZ çağırıp besin bölümünde tek satırlık nötr bir not göstermek için
 * kullanır — bu bir RiskWarning DEĞİLDİR ve warnings listesine girmez.
 */
export function getChronicNutritionDataGap(
  product: ProductRiskInput,
  profile: UserSensitivityProfile | undefined,
): boolean {
  if (!profile) return false;

  const wantsSugarsCheck =
    profile.healthPreferences.includes("less_sugar") ||
    profile.chronicSensitivities.includes("blood_sugar_diabetes");
  const wantsSaltCheck = profile.chronicSensitivities.includes("hypertension_sodium");
  const wantsSaturatedFatCheck =
    profile.chronicSensitivities.includes("cholesterol_saturated_fat") ||
    profile.chronicSensitivities.includes("cardiovascular");

  const energyKcal = getEnergyKcal(product);

  if (wantsSugarsCheck && classifySugarsForDiabetes(getRawNutrientGrams(product, "sugars"), energyKcal) === "no_data") {
    return true;
  }

  if (wantsSaltCheck && classifySaltForHypertension(getRawNutrientGrams(product, "salt"), energyKcal) === "no_data") {
    return true;
  }

  if (
    wantsSaturatedFatCheck &&
    classifySaturatedFatForCardio(getRawNutrientGrams(product, "saturatedFat"), energyKcal, getTransFatGrams(product)) === "no_data"
  ) {
    return true;
  }

  return false;
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
    // celiac_gluten, gluten_wheat allerjeninin TÜM davranışını (beyan/iz/
    // içindekiler eşleşmesi + veri-yok kapısı) devralır — ayrı bir kural
    // yazılmaz, aynı kod yoluna celiac_gluten seçiliyken gluten_wheat da
    // seçilmiş GİBİ davranılır. Alerjen kapısının kendi mantığı DEĞİŞMEZ.
    const effectiveAllergens =
      profile.chronicSensitivities.includes("celiac_gluten") &&
      !profile.allergens.includes("gluten_wheat")
        ? [...profile.allergens, "gluten_wheat"]
        : profile.allergens;

    const hasAllergenProfile = effectiveAllergens.length > 0;

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
    // effectiveAllergens sayesinde celiac_gluten de bu kuralı tetikler.
    if (
      effectiveAllergens.includes("gluten_wheat") &&
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

    // ── Profil Kural A7: Ağaç yemişleri hassasiyeti + içerikte fındık/nut beyanı ─
    if (
      profile.allergens.includes("tree_nuts") &&
      productContainsAny(product, TREE_NUTS_KEYWORDS)
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

    // ── Profil Kural A10: Kabuklu deniz ürünleri alerjisi + içerikte beyan ────
    if (
      profile.allergens.includes("shellfish") &&
      productContainsAny(product, SHELLFISH_KEYWORDS)
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

    // ── Profil Kural A11: Yumurta alerjisi + içerikte yumurta beyanı ─────────
    if (
      profile.allergens.includes("egg") &&
      productContainsAny(product, EGG_KEYWORDS)
    ) {
      warnings.push({
        code: "PROFILE_EGG_ALLERGEN_MATCH",
        title: "Yumurta alerjisi için yüksek dikkat",
        message:
          "Bu üründe yumurta veya yumurta bileşenleriyle ilişkili içerik ya da alerjen beyanı bulunuyor. " +
          "Profilinizde yumurta alerjisi tanımlı olduğu için ürünü tüketmeden önce " +
          "ambalajdaki içerik ve alerjen beyanını dikkatle kontrol etmeniz önerilir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz; son karar için uzman görüşü alınmalıdır.",
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
          "Profilinizde kan şekeri hassasiyeti tanımlı. Bu ürün şeker içeriği açısından dikkatle " +
          "değerlendirilmelidir; besin değerleri ve porsiyon bilgisi kontrol edilmelidir. " +
          "Bu uyarı tıbbi hüküm niteliği taşımaz.",
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
          "Profilinizde sodyum hassasiyeti tanımlı. Bu ürün grubunda tuz/sodyum içeriği yüksek " +
          "olabileceğinden besin etiketi kontrol edilmelidir. Bu uyarı tıbbi hüküm niteliği taşımaz.",
        level: "medium",
      });
    }

    // ── Profil Kural B3: Kolesterol/doymuş yağ veya kalp-damar hassasiyeti ───
    // Eşik: classifySaturatedFatForCardio (DSÖ %10-enerji / FSA >5g fallback).
    if (
      profile.chronicSensitivities.includes("cholesterol_saturated_fat") ||
      profile.chronicSensitivities.includes("cardiovascular")
    ) {
      const saturatedFatStatus = classifySaturatedFatForCardio(
        getRawNutrientGrams(product, "saturatedFat"),
        getEnergyKcal(product),
        getTransFatGrams(product),
      );

      if (saturatedFatStatus === "exceeds") {
        warnings.push({
          code: "PROFILE_SATURATED_FAT_SENSITIVITY",
          title: "Doymuş yağ hassasiyeti için dikkat",
          message:
            "Profilinizde kolesterol/doymuş yağ veya kalp-damar hassasiyeti tanımlı. " +
            "Bu üründe doymuş yağ miktarı, enerji değeriyle birlikte değerlendirildiğinde " +
            "dikkat gerektiren düzeyde görünüyor. " +
            "Porsiyon ve besin değerleri dikkatle kontrol edilmelidir. " +
            "Bu uyarı tıbbi hüküm niteliği taşımaz.",
          level: "medium",
        });
      }
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

    // ── Profil Kural D1: Şeker hassasiyeti/tercihi ───────────────────────────
    // Eşik: classifySugarsForDiabetes (DSÖ %10-enerji / FSA >22.5g fallback).
    if (
      profile.healthPreferences.includes("less_sugar") ||
      profile.chronicSensitivities.includes("blood_sugar_diabetes")
    ) {
      const sugarsStatus = classifySugarsForDiabetes(
        getRawNutrientGrams(product, "sugars"),
        getEnergyKcal(product),
      );

      if (sugarsStatus === "exceeds") {
        warnings.push({
          code: "PROFILE_TRAFFIC_LIGHT_HIGH_SUGAR",
          title: "Şeker seviyesi yüksek",
          message:
            "Bu üründe şeker miktarı, enerji değeriyle birlikte değerlendirildiğinde dikkat " +
            "gerektiren düzeyde görünüyor. Profilinizde şekerle ilgili tercih veya hassasiyet " +
            "bulunduğu için porsiyon ve besin değerleri dikkatle kontrol edilmelidir. " +
            "Bu uyarı tıbbi hüküm niteliği taşımaz.",
          level: "medium",
        });
      }
    }

    // ── Profil Kural D2: Sodyum hassasiyeti ──────────────────────────────────
    // Eşik: classifySaltForHypertension (sodyum ≥1mg/kcal VEYA tuz ≥0.75g/100g).
    if (profile.chronicSensitivities.includes("hypertension_sodium")) {
      const saltStatus = classifySaltForHypertension(
        getRawNutrientGrams(product, "salt"),
        getEnergyKcal(product),
      );

      if (saltStatus === "exceeds") {
        warnings.push({
          code: "PROFILE_TRAFFIC_LIGHT_HIGH_SALT",
          title: "Tuz/sodyum seviyesi yüksek",
          message:
            "Bu üründe tuz/sodyum miktarı dikkat gerektiren düzeyde görünüyor. Profilinizde " +
            "sodyum hassasiyeti bulunduğu için porsiyon ve besin değerleri dikkatle kontrol " +
            "edilmelidir. Bu uyarı tıbbi hüküm niteliği taşımaz.",
          level: "medium",
        });
      }
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