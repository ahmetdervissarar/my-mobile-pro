// Traffic Light (düşük/orta/yüksek) bant sınıflandırması — yalnız BİLGİ amaçlıdır.
// Kronik durum eşik kuralları (riskEngine.ts, mobil) bu bantları DEĞİL, ham
// gram/kcal değerlerini (ProductFactsNutrition100g) kullanır.
//
// Kaynak: FSA (UK Food Standards Agency) "front of pack" per-100g katı gıda
// eşikleri — düşük ≤ eşik1, yüksek > eşik2, arası orta.
import type { ProductFactsTrafficLight, ProductFactsTrafficLightValue } from './types.js';

export type TrafficLightNutrient = 'fat' | 'saturatedFat' | 'sugars' | 'salt';

export const SOLID_FOOD_THRESHOLDS: Record<
  TrafficLightNutrient,
  { lowMax: number; highMinExclusive: number }
> = {
  fat: { lowMax: 3, highMinExclusive: 17.5 },
  saturatedFat: { lowMax: 1.5, highMinExclusive: 5 },
  sugars: { lowMax: 5, highMinExclusive: 22.5 },
  salt: { lowMax: 0.3, highMinExclusive: 1.5 },
};

export function classifyTrafficLightLevel(
  value: number | null | undefined,
  nutrient: TrafficLightNutrient,
): ProductFactsTrafficLightValue | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  const threshold = SOLID_FOOD_THRESHOLDS[nutrient];

  if (value <= threshold.lowMax) return 'low';
  if (value > threshold.highMinExclusive) return 'high';
  return 'medium';
}

export function hasAnyTrafficLightValue(
  trafficLight: ProductFactsTrafficLight | null | undefined,
): boolean {
  if (!trafficLight) return false;

  return (
    (trafficLight.fat !== null && trafficLight.fat !== undefined) ||
    (trafficLight.saturatedFat !== null && trafficLight.saturatedFat !== undefined) ||
    (trafficLight.sugars !== null && trafficLight.sugars !== undefined) ||
    (trafficLight.salt !== null && trafficLight.salt !== undefined)
  );
}
