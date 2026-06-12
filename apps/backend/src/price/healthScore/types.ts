export type HealthScoreStatus = 'ready' | 'partial' | 'unavailable';

export type HealthScoreConfidence = 'low' | 'medium' | 'high';

export type HealthScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface HealthScoreInput {
  productName?: string;
  categoryText?: string;
  nutriScoreGrade?: HealthScoreGrade | null;
  novaGroup?: number | null;
  trafficLight?: {
    sugar?: 'low' | 'medium' | 'high' | null;
    salt?: 'low' | 'medium' | 'high' | null;
    saturatedFat?: 'low' | 'medium' | 'high' | null;
    fat?: 'low' | 'medium' | 'high' | null;
  } | null;
}

export interface HealthScoreResult {
  score: number | null;
  status: HealthScoreStatus;
  confidence: HealthScoreConfidence;
  label: string;
  grade: HealthScoreGrade | null;
  factors: {
    nutriScore: number;
    nova: number;
    trafficLight: number;
    category: number;
  };
  explanations: string[];
  disclaimer: string;
}