import type { DataConfidenceLevel, DataConfidenceResult } from '../confidence/index.js';
import type { SustainabilityCategoryKey } from '../sustainability/index.js';
import type { MarketChainCode } from '../stores/storeTypes.js';

export interface AlternativeCandidateScores {
  rafScore: number;
  priceScore: number;
  healthScore: number;
  contentScore: number;
  sustainabilityScore?: number;
}

export interface AlternativeCandidateSignals {
  allergens?: string[];
  additives?: string[];
  nutriScoreGrade?: 'A' | 'B' | 'C' | 'D' | 'E';
  novaGroup?: 1 | 2 | 3 | 4;
}

export interface AlternativeCandidate {
  id: string;
  barcode?: string;
  productName: string;
  categoryKey: SustainabilityCategoryKey;
  categoryText?: string;
  productGroupKey: string;
  packageSizeText?: string;
  marketName: string;
  chainCode: MarketChainCode;
  price: number;
  currency: 'TRY';
  distanceMeters?: number;
  distanceText?: string;
  scores: AlternativeCandidateScores;
  signals?: AlternativeCandidateSignals;
  overallConfidence: DataConfidenceResult;
}

export interface AlternativeCurrentProduct {
  id?: string;
  barcode?: string;
  productName?: string;
  categoryKey: SustainabilityCategoryKey;
  productGroupKey?: string;
  price?: number | null;
  rafScore?: number | null;
  healthScore?: number | null;
  contentScore?: number | null;
  sustainabilityScore?: number | null;
}

export interface ScoreAlternativesInput {
  currentProduct: AlternativeCurrentProduct;
  candidates: AlternativeCandidate[];
  limit?: number;
}

export interface AlternativeRecommendation {
  candidate: AlternativeCandidate;
  rankingScore: number;
  reasonLabel: string;
  rafScoreDelta: number | null;
  priceDelta: number | null;
  priceDeltaText?: string;
  distanceText?: string;
  reasons: string[];
  confidenceLevel: DataConfidenceLevel;
}
