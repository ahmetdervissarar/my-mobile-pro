import type { RafScoreWeights } from './types.js';

export const DEFAULT_RAF_SCORE_WEIGHTS: RafScoreWeights = {
  price: 35,
  health: 30,
  content: 20,
  sustainability: 15,
};

export const RAF_SCORE_DISCLAIMER =
  'RafSkoru; fiyat, saglik, icerik/alerjen ve surdurulebilirlik gostergelerini birlikte degerlendiren karar destek amacli tahmini bir skordur. Tibbi, beslenme veya satin alma tavsiyesi degildir.';