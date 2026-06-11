export type SustainabilityCategoryKey =
  | 'plant_based'
  | 'staple_food'
  | 'beverages'
  | 'breakfast'
  | 'baby_food'
  | 'dairy'
  | 'sauces_condiments'
  | 'snacks'
  | 'sweets_chocolate'
  | 'frozen_ready'
  | 'meat'
  | 'unknown';

export type PackagingKey =
  | 'carton'
  | 'glass'
  | 'paper'
  | 'metal'
  | 'plastic'
  | 'multi_pack'
  | 'single_use'
  | 'unknown';

export type ProcessingKey =
  | 'nova_1'
  | 'nova_2'
  | 'nova_3'
  | 'nova_4'
  | 'unknown';

export type OriginKey =
  | 'local_domestic'
  | 'regional_nearby'
  | 'imported'
  | 'unknown';

export type EcoScoreKey =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'unknown';

export type SustainabilityGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type SustainabilityConfidence = 'low' | 'medium' | 'high';

export interface SustainabilityInput {
  productName?: string;
  categoryText?: string;
  ingredientsText?: string;
  packaging?: PackagingKey;
  processing?: ProcessingKey;
  origin?: OriginKey;
  ecoScore?: EcoScoreKey;
}

export interface SustainabilityResult {
  score: number;
  grade: SustainabilityGrade;
  label: string;
  confidence: SustainabilityConfidence;

  categoryKey: SustainabilityCategoryKey;
  categoryBaseScore: number;

  factors: {
    packaging: number;
    processing: number;
    origin: number;
    ecoScoreReference: number;
  };

  explanations: string[];
  disclaimer: string;
}