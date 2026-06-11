import type {
  EcoScoreKey,
  OriginKey,
  PackagingKey,
  ProcessingKey,
  SustainabilityCategoryKey,
} from './types.js';

export const CATEGORY_BASE_SCORES: Record<SustainabilityCategoryKey, number> = {
  plant_based: 80,
  staple_food: 75,
  beverages: 65,
  breakfast: 60,
  baby_food: 60,
  dairy: 55,
  sauces_condiments: 55,
  snacks: 50,
  sweets_chocolate: 45,
  frozen_ready: 40,
  meat: 25,
  unknown: 50,
};

export const PACKAGING_EFFECTS: Record<PackagingKey, number> = {
  carton: 8,
  glass: 4,
  paper: 6,
  metal: 2,
  plastic: -6,
  multi_pack: -8,
  single_use: -10,
  unknown: 0,
};

export const PROCESSING_EFFECTS: Record<ProcessingKey, number> = {
  nova_1: 6,
  nova_2: 3,
  nova_3: -3,
  nova_4: -8,
  unknown: 0,
};

export const ORIGIN_EFFECTS: Record<OriginKey, number> = {
  local_domestic: 5,
  regional_nearby: 3,
  imported: -5,
  unknown: 0,
};

export const ECO_SCORE_EFFECTS: Record<EcoScoreKey, number> = {
  a: 5,
  b: 3,
  c: 0,
  d: -3,
  e: -5,
  unknown: 0,
};

export const SUSTAINABILITY_DISCLAIMER =
  'Bu skor kesin karbon ayak izi hesabı değildir; market ürünleri için karar destek amaçlı tahmini bir göstergedir.';
