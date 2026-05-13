/**
 * RafSkoru — Sağlık Puanı Hesaplama
 * apps/mobile/src/scoring/healthScore.ts
 *
 * Sorumluluk: Nutri-Score, NOVA ve Traffic Light sinyallerine göre
 * 0–100 arasında bir karar destek puanı üretmek.
 *
 * Önemli notlar:
 * - Bu puan heuristic / decision-support amaçlıdır; tıbbi hüküm değildir.
 * - Aynı girdi her zaman aynı çıktıyı üretir.
 * - Veri eksikse 50 nötr başlangıç puanı kullanılır.
 * - NaN dönmez; tüm hesaplamalar guard içerir.
 */

import type { TrafficLightNutrition } from '../types/product';

export type HealthScoreInput = {
  nutriScore?: string | null;
  novaGroup?: number | null;
  trafficLight?: TrafficLightNutrition | null;
};

const BASE_SCORE = 50;

const NUTRI_SCORE_DELTA: Record<string, number> = {
  A: 20,
  B: 10,
  C: 0,
  D: -10,
  E: -20,
};

const NOVA_DELTA: Record<number, number> = {
  1: 10,
  2: 5,
  3: -5,
  4: -15,
};

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function nutriScoreDelta(nutriScore: string | null | undefined): number {
  if (!nutriScore) return 0;

  return NUTRI_SCORE_DELTA[nutriScore.trim().toUpperCase()] ?? 0;
}

function novaGroupDelta(novaGroup: number | null | undefined): number {
  if (novaGroup == null) return 0;

  return NOVA_DELTA[novaGroup] ?? 0;
}

function trafficLightDelta(trafficLight: TrafficLightNutrition | null | undefined): number {
  if (!trafficLight) return 0;

  let delta = 0;

  if (trafficLight.sugars.level === 'high') delta -= 10;
  else if (trafficLight.sugars.level === 'medium') delta -= 3;
  else if (trafficLight.sugars.level === 'low') delta += 3;

  if (trafficLight.salt.level === 'high') delta -= 8;
  else if (trafficLight.salt.level === 'medium') delta -= 2;
  else if (trafficLight.salt.level === 'low') delta += 2;

  if (trafficLight.saturatedFat.level === 'high') delta -= 8;
  else if (trafficLight.saturatedFat.level === 'medium') delta -= 2;
  else if (trafficLight.saturatedFat.level === 'low') delta += 2;

  if (trafficLight.fat.level === 'high') delta -= 5;
  else if (trafficLight.fat.level === 'medium') delta -= 1;
  else if (trafficLight.fat.level === 'low') delta += 1;

  return delta;
}

export function calculateHealthScore(input: HealthScoreInput): number {
  const score =
    BASE_SCORE +
    nutriScoreDelta(input.nutriScore) +
    novaGroupDelta(input.novaGroup) +
    trafficLightDelta(input.trafficLight);

  const clamped = clampScore(score);

  return Number.isFinite(clamped) ? clamped : BASE_SCORE;
}