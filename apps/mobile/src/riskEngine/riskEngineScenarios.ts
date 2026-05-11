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

import type { ProductRiskInput } from "./riskEngine";

// ─── Senaryo Tipi ─────────────────────────────────────────────────────────────

export interface RiskEngineScenario {
  /** Senaryonun benzersiz tanımlayıcısı */
  id: string;
  /** Kısa başlık */
  title: string;
  /** Senaryonun amacını ve beklenen davranışı açıklar */
  description: string;
  /** evaluateProductRisks() fonksiyonuna verilecek girdi */
  input: ProductRiskInput;
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
      "PROFILE_ALLERGEN_INFO_MISSING",  // profil + eksik alerjen → MISSING_ALLERGEN_INFO'yu bastırır
      "PROFILE_EGG_PRECAUTION",         // egg + sweet snack
      "PROFILE_BLOOD_SUGAR_PRECAUTION", // blood_sugar + sweet snack
      "PROFILE_LESS_SUGAR_PREFERENCE",  // less_sugar + sweet snack
      "MISSING_INGREDIENTS",            // içerik yok (bastırılmıyor)
      "SWEET_SNACK_ALLERGEN_PRECAUTION",
      // "MISSING_ALLERGEN_INFO" → bastırıldı
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
      "PROFILE_SODIUM_PRECAUTION",  // hypertension_sodium + processed meat
      "MISSING_INGREDIENTS",
      "MISSING_ALLERGEN_INFO",      // alerjen profili boş → bastırılmıyor
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
      "PROFILE_ALLERGEN_INFO_MISSING", // egg profili + eksik bilgi → MISSING_ALLERGEN_INFO bastırılır
      "PROFILE_EGG_PRECAUTION",        // egg + vegan
      "MISSING_INGREDIENTS",
      "VEGAN_ALLERGEN_PRECAUTION",
      // "MISSING_ALLERGEN_INFO" → bastırıldı
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
      "PROFILE_ULTRA_PROCESSED_PREFERENCE", // less_ultra_processed + NOVA 4
      "MISSING_INGREDIENTS",
      "MISSING_ALLERGEN_INFO",              // alerjen profili boş → bastırılmıyor
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

];