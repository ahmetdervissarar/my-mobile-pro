/**
 * RafSkoru — Risk Motoru Manuel Kontrol Senaryoları
 * src/riskEngine/riskEngineScenarios.ts
 *
 * Amaç: evaluateProductRisks() davranışını manuel olarak doğrulamak için
 * referans senaryo listesi tutmak.
 *
 * Kullanım: Bu dosya otomatik test altyapısına bağlı değildir.
 * Geliştirici, senaryo girdisini riskEngine'e vererek dönen warnings listesini
 * expectedWarningCodes ile karşılaştırabilir.
 *
 * Önemli notlar:
 * - suppressRedundantWarnings: PROFILE_ALLERGEN_INFO_MISSING varsa
 *   MISSING_ALLERGEN_INFO ekranda bastırılır.
 * - sortWarningsByPriority: Profil uyarıları öne, ürün grubu uyarıları sona gelir.
 * - expectedWarningCodes listeleri bu iki davranışı yansıtır.
 *
 * Nutri-Score kaynağı:
 *   Hercberg S. et al. (2017). The Nutri-Score: A Five-Colour Nutrition Label.
 *   European Journal of Public Health. doi:10.1093/eurpub/ckx028
 *   Kategoriler: A (en iyi) → E (en kötü)
 *
 * NOVA kaynağı:
 *   Monteiro CA. et al. (2019). Ultra-processed foods: what they are and
 *   how to identify them. Public Health Nutrition. doi:10.1017/S1368980018003762
 *   NOVA 4 = ultra-işlenmiş gıda grubu
 *
 * Uyarı: Aşağıdaki senaryolar tıbbi hüküm niteliği taşımaz.
 * Sonuçlar porsiyon büyüklüğü, tüketim sıklığı ve bireysel sağlık durumu ile
 * birlikte değerlendirilmelidir.
 */

import type { TrafficLightNutrition } from "../types/product";
import type { ProductRiskInput } from "./riskEngine";

// ─── Senaryo Tipi ─────────────────────────────────────────────────────────────

/**
 * Genişletilmiş senaryo giriş tipi.
 * `nutriScore` alanı ProductRiskInput'a henüz eklenmemişse bu tip geçici
 * köprü görevi görür; riskEngine.ts'e dokunulmaz.
 */
type ScenarioProductRiskInput = ProductRiskInput & {
  trafficLight?: TrafficLightNutrition | null;
  /** Nutri-Score kategorisi: "A" | "B" | "C" | "D" | "E" */
  nutriScore?: string | null;
};

export interface RiskEngineScenario {
  /** Senaryonun benzersiz tanımlayıcısı */
  id: string;
  /** Kısa başlık */
  title: string;
  /** Senaryonun amacını ve beklenen davranışı açıklar */
  description: string;
  /** evaluateProductRisks() fonksiyonuna verilecek girdi */
  input: ScenarioProductRiskInput;
  /**
   * Ekranda görünmesi beklenen uyarı kodları.
   * Sıra, sortWarningsByPriority + suppressRedundantWarnings uygulandıktan
   * sonraki gösterim sırasını yansıtır.
   */
  expectedWarningCodes: string[];
}

// ─── Senaryolar ───────────────────────────────────────────────────────────────

export const riskEngineScenarios: RiskEngineScenario[] = [

  // ── Senaryo 1 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-01",
    title: "Çikolatalı ürün + yumurta alerjisi + kan şekeri + daha az şeker tercihi",
    description:
      "Ürün adı tatlı/çikolatalı kategorisine giriyor. Kullanıcı profilinde " +
      "yumurta alerjisi, kan şekeri hassasiyeti ve daha az şeker tercihi tanımlı. " +
      "Ürünün içerik ve alerjen bilgisi yok. " +
      "Beklenen: Profil uyarıları öne geçer; PROFILE_ALLERGEN_INFO_MISSING " +
      "tetiklendiği için MISSING_ALLERGEN_INFO bastırılır.",
    input: {
      name: "çikolatalı gofret",
      ingredients: null,
      allergens: [],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["egg"],
        chronicSensitivities: ["blood_sugar_diabetes"],
        healthPreferences: ["less_sugar"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_ALLERGEN_INFO_MISSING",
      "PROFILE_EGG_PRECAUTION",
      "PROFILE_BLOOD_SUGAR_PRECAUTION",
      "PROFILE_LESS_SUGAR_PREFERENCE",
      "MISSING_INGREDIENTS",
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 2 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-02",
    title: "İşlenmiş et ürünü + sodyum hassasiyeti",
    description:
      "Ürün adı işlenmiş et / şarküteri kategorisine giriyor. " +
      "Kullanıcı profilinde yalnızca sodyum hassasiyeti tanımlı; alerjen profili yok. " +
      "PROFILE_ALLERGEN_INFO_MISSING tetiklenmez, dolayısıyla MISSING_ALLERGEN_INFO " +
      "bastırılmaz ve listede kalır.",
    input: {
      name: "tavuk salam",
      ingredients: null,
      allergens: [],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: [],
        chronicSensitivities: ["hypertension_sodium"],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_SODIUM_PRECAUTION",
      "MISSING_INGREDIENTS",
      "MISSING_ALLERGEN_INFO",
      "PROCESSED_MEAT_PRECAUTION",
    ],
  },

  // ── Senaryo 3 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-03",
    title: "Vegan burger + yumurta hassasiyeti",
    description:
      "Ürün adı vegan/bitkisel kategorisine giriyor. " +
      "Kullanıcı profilinde yumurta alerjisi tanımlı; içerik/alerjen bilgisi yok. " +
      "PROFILE_ALLERGEN_INFO_MISSING tetiklenir ve MISSING_ALLERGEN_INFO bastırılır.",
    input: {
      name: "vegan burger",
      ingredients: null,
      allergens: [],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["egg"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_ALLERGEN_INFO_MISSING",
      "PROFILE_EGG_PRECAUTION",
      "MISSING_INGREDIENTS",
      "VEGAN_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 4 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-04",
    title: "NOVA 4 ürün + ultra işlenmiş ürün tercihi",
    description:
      "Ürünün NOVA grubu 4. Kullanıcı profilinde daha az ultra işlenmiş ürün " +
      "tercihi tanımlı; alerjen profili boş. " +
      "PROFILE_ALLERGEN_INFO_MISSING tetiklenmez; MISSING_ALLERGEN_INFO listede kalır.",
    input: {
      name: "hazır çorba",
      ingredients: null,
      allergens: [],
      additives: [],
      novaGroup: 4,
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["less_ultra_processed"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_ULTRA_PROCESSED_PREFERENCE",
      "MISSING_INGREDIENTS",
      "MISSING_ALLERGEN_INFO",
      "NOVA_GROUP_4",
    ],
  },

  // ── Senaryo 5 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-05",
    title: "Profil boşken genel ürün uyarıları",
    description:
      "Kullanıcı hiç profil ayarı yapmamış. Ürün adı anahtar kelime içermiyor; " +
      "içerik ve alerjen bilgisi yok. Yalnızca genel eksik bilgi uyarıları beklenir.",
    input: {
      name: "market ürünü",
      ingredients: null,
      allergens: [],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "MISSING_INGREDIENTS",
      "MISSING_ALLERGEN_INFO",
    ],
  },

  // ── Senaryo 6 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-06",
    title: "İçerik ve alerjen bilgisi mevcut — eksik bilgi uyarısı gelmemeli",
    description:
      "Ürünün ingredients ve allergens alanları dolu. Profil boş; ürün adı " +
      "anahtar kelime içermiyor. Katkı maddesi de yok. " +
      "Hiçbir uyarı üretilmemesi beklenir.",
    input: {
      name: "makarna",
      ingredients: "buğday unu, su, tuz",
      allergens: ["gluten"],
      additives: [],
      novaGroup: 1,
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [],
  },

  // ── Senaryo 7 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-07",
    title: "Traffic Light yüksek şeker + daha az şeker tercihi",
    description:
      "Ürünün Traffic Light şeker seviyesi yüksek. Kullanıcı profilinde daha az şeker " +
      "tercihi tanımlı. Ürün adı tatlı anahtar kelimesi içermese bile gerçek besin " +
      "etiketine göre şeker uyarısı beklenir.",
    input: {
      name: "meyveli kahvaltılık ürün",
      ingredients: "yulaf, meyve püresi, şeker, bitkisel yağ",
      allergens: ["gluten"],
      additives: [],
      novaGroup: null,
      trafficLight: {
        fat: { value: 4.2, unit: "g", level: "medium" },
        saturatedFat: { value: 0.9, unit: "g", level: "low" },
        sugars: { value: 28.5, unit: "g", level: "high" },
        salt: { value: 0.18, unit: "g", level: "low" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["less_sugar"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_TRAFFIC_LIGHT_HIGH_SUGAR",
    ],
  },

  // ── Senaryo 8 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-08",
    title: "Traffic Light yüksek tuz + sodyum hassasiyeti",
    description:
      "Ürünün Traffic Light tuz seviyesi yüksek. Kullanıcı profilinde sodyum hassasiyeti " +
      "tanımlı. Ürün adı işlenmiş et anahtar kelimesi içermese bile gerçek besin etiketi " +
      "üzerinden sodyum/tuz uyarısı beklenir.",
    input: {
      name: "tuzlu kraker",
      ingredients: "buğday unu, bitkisel yağ, tuz, maya",
      allergens: ["gluten"],
      additives: [],
      novaGroup: null,
      trafficLight: {
        fat: { value: 9.1, unit: "g", level: "medium" },
        saturatedFat: { value: 1.2, unit: "g", level: "low" },
        sugars: { value: 2.4, unit: "g", level: "low" },
        salt: { value: 1.8, unit: "g", level: "high" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: ["hypertension_sodium"],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_TRAFFIC_LIGHT_HIGH_SALT",
    ],
  },

  // ── Senaryo 9 ────────────────────────────────────────────────────────────────
  {
    id: "scenario-09",
    title: "Traffic Light yüksek doymuş yağ genel uyarısı",
    description:
      "Ürünün Traffic Light doymuş yağ seviyesi yüksek. Kullanıcı profili boş olsa bile " +
      "genel besin etiketi uyarısı beklenir.",
    input: {
      name: "kremalı ürün",
      ingredients: "bitkisel yağ, krema tozu, şeker, kakao",
      allergens: ["süt"],
      additives: [],
      novaGroup: null,
      trafficLight: {
        fat: { value: 18.1, unit: "g", level: "high" },
        saturatedFat: { value: 7.2, unit: "g", level: "high" },
        sugars: { value: 12.5, unit: "g", level: "medium" },
        salt: { value: 0.22, unit: "g", level: "low" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "TRAFFIC_LIGHT_HIGH_SATURATED_FAT",
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 10 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-10",
    title: "Nutri-Score D/E — profil bağımsız genel dikkat uyarısı",
    description:
      "Ürünün Nutri-Score kategorisi E (en düşük). Kullanıcı profili tamamen boş. " +
      "Nutri-Score D ve E kategorileri, Hercberg et al. (2017) sınıflandırmasına göre " +
      "besleyici değeri düşük ürünleri temsil eder; bu nedenle profil bilgisinden " +
      "bağımsız olarak genel bir dikkat uyarısı üretilmesi beklenir. " +
      "Bu uyarı tek başına sağlık kararı yerine geçmez; porsiyon ve tüketim sıklığıyla " +
      "birlikte değerlendirilmelidir.",
    input: {
      name: "şekerli mısır gevreği",
      ingredients: "mısır unu, şeker, bitkisel yağ, tuz, aroma",
      allergens: ["gluten"],
      additives: [],
      novaGroup: null,
      nutriScore: "E",
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "NUTRI_SCORE_LOW_CATEGORY",
    ],
  },

  // ── Senaryo 11 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-11",
    title: "Nutri-Score A ama NOVA 4 — iki sistemin farklı boyutları ölçtüğünü gösterir",
    description:
      "Ürünün Nutri-Score kategorisi A (en iyi) ancak NOVA grubu 4 (ultra-işlenmiş). " +
      "Nutri-Score yalnızca besin profilini değerlendirirken NOVA, gıdanın işlenme " +
      "derecesini ölçer (Monteiro et al., 2019). Dolayısıyla Nutri-Score'un iyi " +
      "görünmesi, ürünün ultra-işlenmiş olmadığı anlamına gelmez. " +
      "Bu senaryo iki sistemin birbirini tamamladığını; 'iyi Nutri-Score = güvenli ürün' " +
      "şeklinde bir genelleme yapılamayacağını doğrulamak için tasarlanmıştır. " +
      "Sonuç dikkatle değerlendirilmeli; tek başına sağlık kararı yerine geçmez.",
    input: {
      name: "protein takviyeli sporcu içeceği",
      ingredients:
        "su, peynir altı suyu proteini, fruktoz, sitrik asit, yapay aroma, " +
        "sodyum benzoat, aspartam, vitaminler",
      allergens: ["süt"],
      additives: [],          // CONTAINS_ADDITIVES'ı izole dışı bırakmak için boş
      novaGroup: 4,
      nutriScore: "A",
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "NOVA_GROUP_4",
    ],
  },

  // ── Senaryo 12 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-12",
    title: "NOVA 4 + kullanıcının ultra işlenmiş ürün kaçınma tercihi",
    description:
      "Ürünün NOVA grubu 4; kullanıcı profilinde 'less_ultra_processed' tercihi " +
      "tanımlı. Monteiro et al. (2019) sınıflandırmasına göre NOVA 4 ürünler " +
      "endüstriyel formülasyon, katkı maddesi ve aroma bileşenleri içerir. " +
      "Kullanıcı bu kategoriden kaçınmak istediğini beyan ettiği için hem genel " +
      "NOVA uyarısı hem de profil tercih uyarısı birlikte üretilmesi beklenir. " +
      "Sonuçlar kontrol edilmelidir; içerik bilgisiyle birlikte değerlendirilmelidir.",
    input: {
      name: "hazır makarna sosu",
      ingredients:
        "domates püresi, modifiye nişasta, bitkisel yağ, şeker, tuz, " +
        "sodyum glutamat, sitrik asit, yapay renklendirici",
      allergens: ["Alerjen beyanı yok"], // MISSING_ALLERGEN_INFO'yu izole dışı bırakmak için
      additives: [],                     // CONTAINS_ADDITIVES'ı izole dışı bırakmak için boş
      novaGroup: 4,
      nutriScore: "C",
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["less_ultra_processed"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_ULTRA_PROCESSED_PREFERENCE",
      "NOVA_GROUP_4",
    ],
  },

  // ── Senaryo 13 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-13",
    title: "Nutri-Score E + Traffic Light yüksek şeker + daha az şeker tercihi",
    description:
      "Ürünün Nutri-Score kategorisi E ve Traffic Light şeker seviyesi yüksek. " +
      "Kullanıcı profilinde 'less_sugar' tercihi tanımlı. " +
      "Hercberg et al. (2017) kapsamında E kategorisi zaten düşük besin profiline " +
      "işaret ederken Traffic Light'ın yüksek şeker göstergesi bu bulguyu " +
      "bağımsız bir besin verisiyle destekler. Kullanıcının şeker kısıtlama tercihi " +
      "profil uyarısını da tetikler. " +
      "Tüm uyarılar porsiyon büyüklüğü ve bireysel sağlık durumuyla birlikte " +
      "değerlendirilmelidir; tek başına tıbbi hüküm niteliği taşımaz.",
    input: {
      name: "meyveli gummy şeker",
      ingredients: "glikoz şurubu, şeker, jelatin, sitrik asit, yapay aroma, renklendirici",
      allergens: ["Alerjen beyanı yok"], // MISSING_ALLERGEN_INFO'yu izole dışı bırakmak için
      additives: [],                     // CONTAINS_ADDITIVES'ı izole dışı bırakmak için boş
      novaGroup: null,
      nutriScore: "E",
      trafficLight: {
        fat: { value: 0.1, unit: "g", level: "low" },
        saturatedFat: { value: 0.0, unit: "g", level: "low" },
        sugars: { value: 54.0, unit: "g", level: "high" },
        salt: { value: 0.05, unit: "g", level: "low" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["less_sugar"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_TRAFFIC_LIGHT_HIGH_SUGAR",
      "NUTRI_SCORE_LOW_CATEGORY",
    ],
  },

  // ── Senaryo 14 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-14",
    title: "Fıstık alerjisi + içerikte yer fıstığı beyanı",
    description:
      "Kullanıcı profilinde 'peanut' alerjisi tanımlı. " +
      "Ürün adında 'bar' geçtiği için SWEET_SNACK_ALLERGEN_PRECAUTION tetiklenir. " +
      "İçerik listesinde 'yer fıstığı ezmesi' ve allergenInfo'da 'Yer fıstığı içerir.' " +
      "beyanı bulunduğu için PROFILE_PEANUT_ALLERGEN_MATCH üretilir. " +
      "PROFILE_PEANUT_ALLERGEN_MATCH, PRIORITY_ORDER'da SWEET_SNACK_ALLERGEN_PRECAUTION'dan " +
      "önce yer aldığı için profil uyarısı listede öne geçer.",
    input: {
      name: "yer fıstıklı protein bar",
      ingredients: "yulaf, yer fıstığı ezmesi, kakao, şeker",
      allergenInfo: "Yer fıstığı içerir.",
      allergens: ["peanut"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["peanut"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_PEANUT_ALLERGEN_MATCH",
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 15 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-15",
    title: "Soya alerjisi + içerikte soya lesitini beyanı",
    description:
      "Kullanıcı profilinde 'soy' alerjisi tanımlı. " +
      "Ürün adında 'bisküvi' ve 'kakaolu' geçtiği için SWEET_SNACK_ALLERGEN_PRECAUTION tetiklenir. " +
      "İçerik listesinde 'soya lesitini' ve allergenInfo'da 'Soya içerir.' beyanı bulunduğu için " +
      "PROFILE_SOY_ALLERGEN_MATCH üretilir. " +
      "PROFILE_SOY_ALLERGEN_MATCH, PRIORITY_ORDER'da SWEET_SNACK_ALLERGEN_PRECAUTION'dan " +
      "önce yer aldığı için profil uyarısı listede öne geçer.",
    input: {
      name: "kakaolu bisküvi",
      ingredients: "buğday unu, şeker, kakao, soya lesitini, bitkisel yağ",
      allergenInfo: "Soya içerir.",
      allergens: ["soy"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["soy"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_SOY_ALLERGEN_MATCH",
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 16 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-16",
    title: "Gluten hassasiyeti + içerikte buğday beyanı",
    description:
      "Kullanıcı profilinde 'gluten_wheat' hassasiyeti tanımlı. " +
      "İçerik listesinde 'tam buğday unu' ve allergenInfo'da 'Gluten içerir.' beyanı bulunuyor. " +
      "allergens: ['gluten'] alanı dolu olduğu için hasAllergenInfo = true; " +
      "MISSING_ALLERGEN_INFO üretilmez. " +
      "Ürün adı hiçbir sweet/meat/vegan anahtar kelimesiyle eşleşmediğinden " +
      "yalnızca PROFILE_GLUTEN_ALLERGEN_MATCH beklenir.",
    input: {
      name: "tam buğdaylı kraker",
      ingredients: "tam buğday unu, bitkisel yağ, tuz, maya",
      allergenInfo: "Gluten içerir.",
      allergens: ["gluten"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["gluten_wheat"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_GLUTEN_ALLERGEN_MATCH",
    ],
  },

  // ── Senaryo 17 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-17",
    title: "Süt alerjisi + içerikte süt proteini beyanı",
    description:
      "Kullanıcı profilinde 'milk' alerjisi tanımlı. " +
      "İçerik listesinde 'süt proteini' ve allergenInfo'da 'Süt içerir.' beyanı bulunuyor. " +
      "Ürün adında 'bar' geçtiği için SWEET_SNACK_ALLERGEN_PRECAUTION da tetiklenir. " +
      "PROFILE_MILK_ALLERGEN_MATCH, PRIORITY_ORDER'da SWEET_SNACK_ALLERGEN_PRECAUTION'dan " +
      "önce yer aldığı için profil uyarısı listede öne geçer.",
    input: {
      name: "yoğurtlu protein bar",
      ingredients: "süt proteini, yoğurt tozu, kakao, tatlandırıcı",
      allergenInfo: "Süt içerir.",
      allergens: ["milk"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["milk"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_MILK_ALLERGEN_MATCH",
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 18 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-18",
    title: "Laktoz hassasiyeti + içerikte laktoz beyanı",
    description:
      "Kullanıcı profilinde 'lactose' hassasiyeti tanımlı. " +
      "İçerik listesinde 'laktoz' ve allergenInfo'da 'Süt ve laktoz içerir.' beyanı bulunuyor. " +
      "allergens: ['milk', 'lactose'] dolu olduğu için hasAllergenInfo = true; " +
      "MISSING_ALLERGEN_INFO üretilmez. " +
      "Profilde 'milk' yok; dolayısıyla PROFILE_MILK_ALLERGEN_MATCH tetiklenmez. " +
      "Ürün adı 'sütlü içecek' hiçbir sweet/meat/vegan keyword'üyle eşleşmediğinden " +
      "yalnızca PROFILE_LACTOSE_ALLERGEN_MATCH beklenir.",
    input: {
      name: "sütlü içecek",
      ingredients: "süt, laktoz, kakao, şeker",
      allergenInfo: "Süt ve laktoz içerir.",
      allergens: ["milk", "lactose"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["lactose"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_LACTOSE_ALLERGEN_MATCH",
    ],
  },

  // ── Senaryo 19 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-19",
    title: "Ağaç yemişleri hassasiyeti + içerikte fındık beyanı",
    description:
      "Kullanıcı profilinde 'tree_nuts' hassasiyeti tanımlı. " +
      "İçerik listesinde 'fındık' ve allergenInfo'da 'Fındık içerir.' beyanı bulunuyor. " +
      "Ürün adında 'çikolata' geçtiği için SWEET_SNACK_ALLERGEN_PRECAUTION da tetiklenir. " +
      "PROFILE_TREE_NUTS_ALLERGEN_MATCH, PRIORITY_ORDER'da SWEET_SNACK_ALLERGEN_PRECAUTION'dan " +
      "önce yer aldığı için profil uyarısı listede öne geçer.",
    input: {
      name: "fındıklı çikolata",
      ingredients: "şeker, kakao, fındık, süt tozu",
      allergenInfo: "Fındık içerir.",
      allergens: ["tree_nuts"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["tree_nuts"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_TREE_NUTS_ALLERGEN_MATCH",
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 20 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-20",
    title: "Susam alerjisi + içerikte tahin beyanı",
    description:
      "Kullanıcı profilinde 'sesame' alerjisi tanımlı. " +
      "İçerik listesinde 'tahin' ve 'susam' ile allergenInfo'da 'Susam içerir.' beyanı bulunuyor. " +
      "allergens: ['sesame'] dolu olduğu için hasAllergenInfo = true; MISSING_ALLERGEN_INFO yok. " +
      "Ürün adı 'tahinli kraker' hiçbir sweet/meat/vegan keyword'üyle eşleşmediğinden " +
      "yalnızca PROFILE_SESAME_ALLERGEN_MATCH beklenir.",
    input: {
      name: "tahinli kraker",
      ingredients: "buğday unu, tahin, susam, tuz",
      allergenInfo: "Susam içerir.",
      allergens: ["sesame"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["sesame"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_SESAME_ALLERGEN_MATCH",
    ],
  },

  // ── Senaryo 21 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-21",
    title: "Balık alerjisi + içerikte ton balığı beyanı",
    description:
      "Kullanıcı profilinde 'fish' alerjisi tanımlı. " +
      "İçerik listesinde 'ton balığı' ve allergenInfo'da 'Balık içerir.' beyanı bulunuyor. " +
      "allergens: ['fish'] dolu olduğu için MISSING_ALLERGEN_INFO yok. " +
      "Ürün adı 'ton balıklı sandviç' hiçbir sweet/meat/vegan keyword'üyle eşleşmediğinden " +
      "yalnızca PROFILE_FISH_ALLERGEN_MATCH beklenir.",
    input: {
      name: "ton balıklı sandviç",
      ingredients: "ekmek, ton balığı, mısır, mayonez",
      allergenInfo: "Balık içerir.",
      allergens: ["fish"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["fish"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_FISH_ALLERGEN_MATCH",
    ],
  },

  // ── Senaryo 22 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-22",
    title: "Kabuklu deniz ürünleri alerjisi + içerikte karides beyanı",
    description:
      "Kullanıcı profilinde 'shellfish' alerjisi tanımlı. " +
      "İçerik listesinde 'karides' ve allergenInfo'da 'Kabuklu deniz ürünleri içerir.' beyanı bulunuyor. " +
      "allergens: ['shellfish'] dolu olduğu için MISSING_ALLERGEN_INFO yok. " +
      "Ürün adı 'karidesli noodle' hiçbir sweet/meat/vegan keyword'üyle eşleşmediğinden " +
      "yalnızca PROFILE_SHELLFISH_ALLERGEN_MATCH beklenir.",
    input: {
      name: "karidesli noodle",
      ingredients: "noodle, karides, soya sosu, baharat",
      allergenInfo: "Kabuklu deniz ürünleri içerir.",
      allergens: ["shellfish"],
      additives: [],
      novaGroup: null,
      userProfile: {
        allergens: ["shellfish"],
        chronicSensitivities: [],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_SHELLFISH_ALLERGEN_MATCH",
    ],
  },

  // ── Senaryo 23 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-23",
    title: "Kolesterol hassasiyeti + Traffic Light yüksek doymuş yağ",
    description:
      "Kullanıcı profilinde 'cholesterol_saturated_fat' hassasiyeti tanımlı. " +
      "Traffic Light doymuş yağ seviyesi 'high'. " +
      "Ürün adında 'bisküvi' geçtiği için SWEET_SNACK_ALLERGEN_PRECAUTION da tetiklenir. " +
      "PROFILE_SATURATED_FAT_SENSITIVITY profil bölümünde, " +
      "TRAFFIC_LIGHT_HIGH_SATURATED_FAT besin etiketi bölümünde, " +
      "SWEET_SNACK_ALLERGEN_PRECAUTION ürün grubu bölümünde yer alır.",
    input: {
      name: "kremalı bisküvi",
      ingredients: "buğday unu, krema tozu, bitkisel yağ, şeker",
      allergenInfo: "Süt ve gluten içerebilir.",
      allergens: ["milk", "gluten"],
      additives: [],
      novaGroup: null,
      trafficLight: {
        fat: { value: 18.1, unit: "g", level: "high" },
        saturatedFat: { value: 7.2, unit: "g", level: "high" },
        sugars: { value: 12.5, unit: "g", level: "medium" },
        salt: { value: 0.22, unit: "g", level: "low" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: ["cholesterol_saturated_fat"],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_SATURATED_FAT_SENSITIVITY",
      "TRAFFIC_LIGHT_HIGH_SATURATED_FAT",
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
    ],
  },

  // ── Senaryo 24 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-24",
    title: "Daha az katkı maddesi tercihi + katkı maddesi beyanı",
    description:
      "Kullanıcı profilinde 'less_additives' tercihi tanımlı. " +
      "Üründe additives dizisi dolu olduğu için containsAdditives = true; " +
      "CONTAINS_ADDITIVES genel uyarısı + PROFILE_LESS_ADDITIVES_PREFERENCE profil uyarısı üretilir. " +
      "allergens: ['Alerjen beyanı yok'] dolu olduğu için MISSING_ALLERGEN_INFO yok. " +
      "Ürün adı hiçbir sweet/meat/vegan keyword'üyle eşleşmediğinden " +
      "PROFILE_LESS_ADDITIVES_PREFERENCE PRIORITY_ORDER'da CONTAINS_ADDITIVES'tan önce gelir.",
    input: {
      name: "aromalı içecek",
      ingredients: "su, şeker, aroma verici, sitrik asit",
      allergenInfo: "Alerjen beyanı yok.",
      allergens: ["Alerjen beyanı yok"],
      additives: ["sitrik asit", "aroma verici"],
      novaGroup: null,
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["less_additives"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_LESS_ADDITIVES_PREFERENCE",
      "CONTAINS_ADDITIVES",
    ],
  },

  // ── Senaryo 25 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-25",
    title: "Clean label tercihi + NOVA 4 ürün",
    description:
      "Kullanıcı profilinde 'clean_label' tercihi tanımlı. " +
      "novaGroup 4 olduğu için hem NOVA_GROUP_4 genel uyarısı hem " +
      "PROFILE_CLEAN_LABEL_PREFERENCE profil uyarısı üretilir. " +
      "allergens: ['Alerjen beyanı yok'] dolu olduğu için MISSING_ALLERGEN_INFO yok. " +
      "additives [] olduğu için CONTAINS_ADDITIVES yok. " +
      "Ürün adı 'hazır çorba' hiçbir sweet/meat/vegan keyword'üyle eşleşmez. " +
      "PROFILE_CLEAN_LABEL_PREFERENCE PRIORITY_ORDER'da NOVA_GROUP_4'ten önce gelir.",
    input: {
      name: "hazır çorba",
      ingredients: "modifiye nişasta, aroma verici, tuz, bitkisel yağ",
      allergenInfo: "Alerjen beyanı yok.",
      allergens: ["Alerjen beyanı yok"],
      additives: [],
      novaGroup: 4,
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["clean_label"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_CLEAN_LABEL_PREFERENCE",
      "NOVA_GROUP_4",
    ],
  },

  // ── Senaryo 26 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-26",
    title: "Böbrek hassasiyeti + Traffic Light yüksek tuz",
    description:
      "Kullanıcı profilinde 'kidney_sensitivity' hassasiyeti tanımlı. " +
      "Traffic Light tuz seviyesi 'high'. " +
      "Profilde 'hypertension_sodium' olmadığı için PROFILE_TRAFFIC_LIGHT_HIGH_SALT tetiklenmez. " +
      "Ürün adı 'tuzlu kraker' hiçbir sweet/meat/vegan keyword'üyle eşleşmediğinden " +
      "yalnızca PROFILE_KIDNEY_SALT_SENSITIVITY beklenir.",
    input: {
      name: "tuzlu kraker",
      ingredients: "buğday unu, bitkisel yağ, tuz, maya",
      allergenInfo: "Gluten içerir.",
      allergens: ["gluten"],
      additives: [],
      novaGroup: null,
      trafficLight: {
        fat: { value: 9.1, unit: "g", level: "medium" },
        saturatedFat: { value: 1.2, unit: "g", level: "low" },
        sugars: { value: 2.4, unit: "g", level: "low" },
        salt: { value: 1.8, unit: "g", level: "high" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: ["kidney_sensitivity"],
        healthPreferences: [],
      },
    },
    expectedWarningCodes: [
      "PROFILE_KIDNEY_SALT_SENSITIVITY",
    ],
  },

  // ── Senaryo 27 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-27",
    title: "Daha az tuz tercihi + Traffic Light yüksek tuz",
    description:
      "Kullanıcı profilinde 'less_salt' tercihi tanımlı. " +
      "Traffic Light tuz seviyesi 'high'. " +
      "Profilde 'hypertension_sodium' ve 'kidney_sensitivity' olmadığı için " +
      "PROFILE_TRAFFIC_LIGHT_HIGH_SALT ve PROFILE_KIDNEY_SALT_SENSITIVITY tetiklenmez. " +
      "allergens: ['Alerjen beyanı yok'] dolu olduğu için MISSING_ALLERGEN_INFO yok. " +
      "Ürün adı 'tuzlu atıştırmalık' hiçbir sweet/meat/vegan keyword'üyle eşleşmediğinden " +
      "yalnızca PROFILE_LESS_SALT_PREFERENCE beklenir.",
    input: {
      name: "tuzlu atıştırmalık",
      ingredients: "mısır unu, bitkisel yağ, tuz, baharat",
      allergenInfo: "Alerjen beyanı yok.",
      allergens: ["Alerjen beyanı yok"],
      additives: [],
      novaGroup: null,
      trafficLight: {
        fat: { value: 8.5, unit: "g", level: "medium" },
        saturatedFat: { value: 1.0, unit: "g", level: "low" },
        sugars: { value: 1.5, unit: "g", level: "low" },
        salt: { value: 2.1, unit: "g", level: "high" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["less_salt"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_LESS_SALT_PREFERENCE",
    ],
  },

  // ── Senaryo 28 ───────────────────────────────────────────────────────────────
  {
    id: "scenario-28",
    title: "Çocuklar için dikkatli seçim + NOVA 4 ve yüksek şeker",
    description:
      "Kullanıcı profilinde 'child_safe_selection' tercihi tanımlı. " +
      "novaGroup 4, additives dolu ve trafficLight.sugars 'high' olduğu için " +
      "PROFILE_CHILD_SAFE_SELECTION tetiklenir. " +
      "Profilde 'less_sugar' ve 'blood_sugar_diabetes' olmadığı için PROFILE_TRAFFIC_LIGHT_HIGH_SUGAR tetiklenmez. " +
      "Profilde 'less_ultra_processed' olmadığı için PROFILE_ULTRA_PROCESSED_PREFERENCE tetiklenmez. " +
      "Ürün adı 'renkli jelibon' mevcut sweet snack keyword listesinde olmadığı için " +
      "SWEET_SNACK_ALLERGEN_PRECAUTION tetiklenmez. " +
      "PRIORITY_ORDER'a göre sıralama: PROFILE_CHILD_SAFE_SELECTION → NOVA_GROUP_4 → CONTAINS_ADDITIVES.",
    input: {
      name: "renkli jelibon",
      ingredients: "glikoz şurubu, şeker, jelatin, aroma verici, renklendirici",
      allergenInfo: "Alerjen beyanı yok.",
      allergens: ["Alerjen beyanı yok"],
      additives: ["aroma verici", "renklendirici"],
      novaGroup: 4,
      trafficLight: {
        fat: { value: 0.1, unit: "g", level: "low" },
        saturatedFat: { value: 0.0, unit: "g", level: "low" },
        sugars: { value: 54.0, unit: "g", level: "high" },
        salt: { value: 0.05, unit: "g", level: "low" },
      },
      userProfile: {
        allergens: [],
        chronicSensitivities: [],
        healthPreferences: ["child_safe_selection"],
      },
    },
    expectedWarningCodes: [
      "PROFILE_CHILD_SAFE_SELECTION",
      "NOVA_GROUP_4",
      "CONTAINS_ADDITIVES",
    ],
  },

];