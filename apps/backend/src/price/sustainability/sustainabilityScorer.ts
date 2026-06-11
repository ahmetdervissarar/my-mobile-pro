import { classifySustainabilityCategory } from './categoryClassifier.js';
import {
  CATEGORY_BASE_SCORES,
  ECO_SCORE_EFFECTS,
  ORIGIN_EFFECTS,
  PACKAGING_EFFECTS,
  PROCESSING_EFFECTS,
  SUSTAINABILITY_DISCLAIMER,
} from './rules.js';
import type {
  SustainabilityConfidence,
  SustainabilityGrade,
  SustainabilityInput,
  SustainabilityResult,
} from './types.js';

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function getGrade(score: number): { grade: SustainabilityGrade; label: string } {
  if (score >= 90) return { grade: 'A', label: 'Çok iyi' };
  if (score >= 75) return { grade: 'B', label: 'İyi' };
  if (score >= 60) return { grade: 'C', label: 'Orta' };
  if (score >= 45) return { grade: 'D', label: 'Zayıf' };
  return { grade: 'E', label: 'Düşük' };
}

function getConfidence(input: SustainabilityInput): SustainabilityConfidence {
  const availableFields = [
    input.productName || input.categoryText,
    input.packaging && input.packaging !== 'unknown',
    input.processing && input.processing !== 'unknown',
    input.origin && input.origin !== 'unknown',
    input.ecoScore && input.ecoScore !== 'unknown',
  ].filter(Boolean).length;

  if (availableFields <= 1) return 'low';
  if (availableFields <= 3) return 'medium';
  return 'high';
}

function buildExplanations(input: SustainabilityInput, categoryKey: string): string[] {
  const explanations: string[] = [];

  if (categoryKey === 'unknown') {
    explanations.push(
      'Ürün kategorisi net belirlenemediği için sürdürülebilirlik skoru düşük güven düzeyiyle tahmini hesaplandı.',
    );
  } else {
    explanations.push(
      'Bu ürün kategorisi sürdürülebilirlik skorunun ana belirleyicisidir.',
    );
  }

  if (input.packaging && input.packaging !== 'unknown') {
    const packagingEffect = PACKAGING_EFFECTS[input.packaging];

    if (packagingEffect > 0) {
      explanations.push('Ambalaj türü sürdürülebilirlik skoruna olumlu katkı sağladı.');
    }

    if (packagingEffect < 0) {
      explanations.push('Ambalaj türü nedeniyle sürdürülebilirlik puanı düştü.');
    }
  }

  if (input.processing === 'nova_4') {
    explanations.push('Yüksek işlenmişlik düzeyi sürdürülebilirlik skorunu olumsuz etkiledi.');
  }

  if (input.origin === 'local_domestic') {
    explanations.push('Yerli üretim bilgisi sürdürülebilirlik skorunu destekledi.');
  }

  if (!input.origin || input.origin === 'unknown') {
    explanations.push('Üretim/orijin bilgisi bulunamadığı için güven düzeyi sınırlıdır.');
  }

  if (input.ecoScore && input.ecoScore !== 'unknown') {
    explanations.push('Mevcut çevresel referans verisi skoru destekledi.');
  }

  return explanations.slice(0, 3);
}

export function calculateSustainabilityScore(
  input: SustainabilityInput,
): SustainabilityResult {
  const categoryKey = classifySustainabilityCategory(input);
  const categoryBaseScore = CATEGORY_BASE_SCORES[categoryKey];

  const packagingKey = input.packaging ?? 'unknown';
  const processingKey = input.processing ?? 'unknown';
  const originKey = input.origin ?? 'unknown';
  const ecoScoreKey = input.ecoScore ?? 'unknown';

  const factors = {
    packaging: PACKAGING_EFFECTS[packagingKey],
    processing: PROCESSING_EFFECTS[processingKey],
    origin: ORIGIN_EFFECTS[originKey],
    ecoScoreReference: ECO_SCORE_EFFECTS[ecoScoreKey],
  };

  const score = clampScore(
    categoryBaseScore +
      factors.packaging +
      factors.processing +
      factors.origin +
      factors.ecoScoreReference,
  );

  const { grade, label } = getGrade(score);

  return {
    score,
    grade,
    label,
    confidence: getConfidence(input),

    categoryKey,
    categoryBaseScore,

    factors,
    explanations: buildExplanations(input, categoryKey),
    disclaimer: SUSTAINABILITY_DISCLAIMER,
  };
}
