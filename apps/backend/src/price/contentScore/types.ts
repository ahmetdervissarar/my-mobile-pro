export type ContentScoreStatus = 'ready' | 'partial' | 'unavailable';

export type ContentScoreConfidence = 'low' | 'medium' | 'high';

export type AdditiveRiskLevel = 'none' | 'low' | 'medium' | 'high';

export type AllergenDataStatus = 'clear' | 'contains_allergen' | 'unknown';

export interface ContentScoreInput {
  productName?: string;
  ingredientsText?: string | null;
  additives?: string[] | null;
  additiveRiskLevel?: AdditiveRiskLevel | null;
  allergenDataStatus?: AllergenDataStatus | null;
  hasPalmOil?: boolean | null;
  isUltraProcessedHint?: boolean | null;
}

export interface ContentScoreResult {
  score: number | null;
  status: ContentScoreStatus;
  confidence: ContentScoreConfidence;
  label: string;
  factors: {
    ingredientClarity: number;
    additiveRisk: number;
    allergenTransparency: number;
    processingHint: number;
    palmOil: number;
  };
  explanations: string[];
  disclaimer: string;
}