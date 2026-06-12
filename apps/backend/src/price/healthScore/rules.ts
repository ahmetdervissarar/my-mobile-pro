import type { HealthScoreGrade } from './types.js';

export const HEALTH_SCORE_DISCLAIMER =
  'Saglik skoru; Nutri-Score, NOVA islenmislik grubu ve Traffic Light besin esiklerini birlikte kullanan karar destek amacli tahmini bir skordur. Tibbi veya beslenme tavsiyesi degildir. Etiket ve veri hatalari olabilir.';

export const HEALTH_SCORE_WEIGHTS = {
  nutriScore: 45,
  nova: 30,
  trafficLight: 25,
};

export const NUTRI_SCORE_POINTS: Record<HealthScoreGrade, number> = {
  A: 100,
  B: 80,
  C: 60,
  D: 40,
  E: 20,
};

export const NOVA_POINTS: Record<number, number> = {
  1: 100,
  2: 80,
  3: 50,
  4: 20,
};

export const TRAFFIC_LIGHT_POINTS = {
  low: 100,
  medium: 60,
  high: 20,
};