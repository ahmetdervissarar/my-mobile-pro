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
 */

import type { TrafficLightNutrition } from "../types/product";
import type { ProductRiskInput } from "./riskEngine";

// ─── Senaryo Tipi ─────────────────────────────────────────────────────────────

type ScenarioProductRiskInput = ProductRiskInput & {
  trafficLight?: TrafficLightNutrition | null;
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

];