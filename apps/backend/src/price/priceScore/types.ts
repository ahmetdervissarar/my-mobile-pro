export type PriceScoreStatus = 'ready' | 'partial' | 'unavailable';

export type PriceScoreConfidence = 'low' | 'medium' | 'high';

export interface PriceScoreInput {
  productPrice: number | null;
  referencePrice?: number | null;
  lowestPrice?: number | null;
  highestPrice?: number | null;
  offerCount?: number;
}

export interface PriceScoreResult {
  score: number | null;
  status: PriceScoreStatus;
  confidence: PriceScoreConfidence;
  label: string;
  explanations: string[];
  reference: {
    productPrice: number | null;
    referencePrice: number | null;
    lowestPrice: number | null;
    highestPrice: number | null;
    offerCount: number;
  };
  disclaimer: string;
}