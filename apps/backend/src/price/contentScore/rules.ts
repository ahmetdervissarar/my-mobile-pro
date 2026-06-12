import type {
  AdditiveRiskLevel,
  AllergenDataStatus,
} from './types.js';

export const CONTENT_SCORE_DISCLAIMER =
  'Icerik/Alerjen skoru; icerik listesi acikligi, katki riski, alerjen bilgi seffafligi ve islenmislik ipuclarini birlikte kullanan karar destek amacli tahmini bir skordur. Kritik alerjen uyarilarinin yerine gecmez.';

export const CONTENT_SCORE_WEIGHTS = {
  ingredientClarity: 25,
  additiveRisk: 30,
  allergenTransparency: 25,
  processingHint: 10,
  palmOil: 10,
};

export const ADDITIVE_RISK_POINTS: Record<AdditiveRiskLevel, number> = {
  none: 100,
  low: 80,
  medium: 50,
  high: 20,
};

export const ALLERGEN_DATA_POINTS: Record<AllergenDataStatus, number> = {
  clear: 100,
  contains_allergen: 60,
  unknown: 40,
};
