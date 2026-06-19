export type RafScoreComponentKey =
  | 'price'
  | 'health'
  | 'content'
  | 'sustainability';

export type RafScoreConfidence = 'low' | 'medium' | 'high';

export type RafScoreStatus = 'ready' | 'partial' | 'unavailable';

export type RafScoreReasonSeverity =
  | 'positive'
  | 'neutral'
  | 'warning'
  | 'negative';

export type RafScoreReasonCategory =
  | 'price'
  | 'health'
  | 'content'
  | 'allergen'
  | 'sustainability'
  | 'data_quality';

export interface RafScoreReason {
  code: string;
  category: RafScoreReasonCategory;
  severity: RafScoreReasonSeverity;
  params?: Record<string, string | number | boolean | null>;
  /**
   * Optional forward-compatibility fallback only.
   * Mobile should prefer code + params localization.
   */
  message?: string;
}

export interface RafScoreWeights {
  price: number;
  health: number;
  content: number;
  sustainability: number;
}

export interface RafScoreComponent {
  key: RafScoreComponentKey;
  label: string;
  score: number | null;
  weight: number;
  isAvailable: boolean;
}

export interface RafScoreInput {
  priceScore?: number | null;
  healthScore?: number | null;
  contentScore?: number | null;
  sustainabilityScore?: number | null;
}

export interface RafScoreResult {
  score: number | null;
  status: RafScoreStatus;
  confidence: RafScoreConfidence;
  weights: RafScoreWeights;
  components: RafScoreComponent[];
  explanations: string[];
  reasons?: RafScoreReason[];
  disclaimer: string;
}