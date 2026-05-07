import { useEffect, useState } from "react";
import type { AllergenKey, ConditionKey } from "./i18n";

const STORAGE_KEY = "skanr.healthProfile";

export type HealthProfile = {
  allergens: AllergenKey[];
  conditions: ConditionKey[];
};

const empty: HealthProfile = { allergens: [], conditions: [] };

export function loadProfile(): HealthProfile {
  if (typeof localStorage === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      allergens: Array.isArray(parsed.allergens) ? parsed.allergens : [],
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : [],
    };
  } catch {
    return empty;
  }
}

export function saveProfile(p: HealthProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function useHealthProfile() {
  const [profile, setProfile] = useState<HealthProfile>(empty);

  useEffect(() => {
    setProfile(loadProfile());
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setProfile(loadProfile());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const update = (p: HealthProfile) => {
    saveProfile(p);
    setProfile(p);
  };

  return { profile, update };
}

// ============================================================
// Risk evaluation
// ============================================================

// Map Open Food Facts allergen tags (e.g. "en:gluten") to our keys
const OFF_ALLERGEN_MAP: Record<string, AllergenKey> = {
  "en:gluten": "gluten",
  "en:wheat": "gluten",
  "en:rye": "gluten",
  "en:barley": "gluten",
  "en:milk": "milk",
  "en:lactose": "milk",
  "en:eggs": "eggs",
  "en:peanuts": "peanuts",
  "en:nuts": "nuts",
  "en:tree-nuts": "nuts",
  "en:hazelnut": "nuts",
  "en:almond": "nuts",
  "en:walnut": "nuts",
  "en:cashew": "nuts",
  "en:pistachio": "nuts",
  "en:soybeans": "soy",
  "en:soy": "soy",
  "en:fish": "fish",
  "en:crustaceans": "shellfish",
  "en:molluscs": "shellfish",
  "en:sesame-seeds": "sesame",
  "en:sesame": "sesame",
  "en:celery": "celery",
  "en:mustard": "mustard",
  "en:sulphur-dioxide-and-sulphites": "sulphites",
};

export function normalizeAllergens(offAllergens: string[] | null | undefined): AllergenKey[] {
  if (!offAllergens?.length) return [];
  const result = new Set<AllergenKey>();
  for (const tag of offAllergens) {
    const key = OFF_ALLERGEN_MAP[tag.toLowerCase()];
    if (key) result.add(key);
  }
  return Array.from(result);
}

export type RiskResult = {
  hasRisk: boolean;
  matchedAllergens: AllergenKey[];
  matchedConditions: { key: ConditionKey; reason: string }[];
};

type NutrientSnapshot = {
  sugars_g?: number | null;
  salt_g?: number | null;
  fat_g?: number | null;
  energy_kcal?: number | null;
  novaGroup?: number | null;
};

export function evaluateRisk(
  profile: HealthProfile,
  productAllergens: AllergenKey[],
  nutrients: NutrientSnapshot,
): RiskResult {
  const matchedAllergens = profile.allergens.filter((a) => productAllergens.includes(a));

  const matchedConditions: { key: ConditionKey; reason: string }[] = [];
  const sugar = nutrients.sugars_g ?? 0;
  const salt = nutrients.salt_g ?? 0;
  const fat = nutrients.fat_g ?? 0;

  for (const c of profile.conditions) {
    if (c === "diabetes" && sugar >= 10) matchedConditions.push({ key: c, reason: `${sugar.toFixed(1)}g sugar / 100g` });
    if (c === "hypertension" && salt >= 1.0) matchedConditions.push({ key: c, reason: `${salt.toFixed(2)}g salt / 100g` });
    if (c === "heart" && (fat >= 17 || (nutrients.novaGroup ?? 0) >= 4)) matchedConditions.push({ key: c, reason: `${fat.toFixed(1)}g fat / 100g` });
    if (c === "kidney" && salt >= 0.6) matchedConditions.push({ key: c, reason: `${salt.toFixed(2)}g salt / 100g` });
    if (c === "celiac" && productAllergens.includes("gluten")) matchedConditions.push({ key: c, reason: "contains gluten" });
    if (c === "lactose" && productAllergens.includes("milk")) matchedConditions.push({ key: c, reason: "contains milk" });
  }

  return {
    hasRisk: matchedAllergens.length > 0 || matchedConditions.length > 0,
    matchedAllergens,
    matchedConditions,
  };
}

export function vibrateWarning() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch {
    // ignore
  }
}
