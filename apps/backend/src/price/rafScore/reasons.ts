import type { DataConfidenceResult } from '../confidence/types.js';
import type { ProductFactsAllergenInfo } from '../productFacts/types.js';
import type { PriceConfidence } from '../types.js';
import type {
  RafScoreComponent,
  RafScoreComponentKey,
  RafScoreReason,
  RafScoreReasonCategory,
  RafScoreReasonSeverity,
  RafScoreResult,
} from './types.js';

const MAX_RAF_SCORE_REASONS = 5;

const SEVERITY_PRIORITY: Record<RafScoreReasonSeverity, number> = {
  negative: 0,
  warning: 1,
  neutral: 2,
  positive: 3,
};

const CATEGORY_PRIORITY: Record<RafScoreReasonCategory, number> = {
  data_quality: 0,
  allergen: 1,
  price: 2,
  health: 3,
  content: 4,
  sustainability: 5,
};

export interface RafScoreReasonBuilderInput {
  rafScore: RafScoreResult | null | undefined;
  priceConfidence?: PriceConfidence | null;
  allergenInfo?: ProductFactsAllergenInfo | null;
  overallConfidence?: DataConfidenceResult | null;
}

function componentCategory(key: RafScoreComponentKey): RafScoreReasonCategory {
  if (key === 'price') return 'price';
  if (key === 'health') return 'health';
  if (key === 'content') return 'content';
  return 'sustainability';
}

function componentScoreReason(component: RafScoreComponent): RafScoreReason | null {
  const category = componentCategory(component.key);

  if (!component.isAvailable || component.score === null) {
    return {
      code: `${component.key}_component_missing`,
      category,
      severity: 'warning',
      params: {
        componentKey: component.key,
        label: component.label,
      },
    };
  }

  if (component.score < 50) {
    return {
      code: `${component.key}_low_score`,
      category,
      severity: 'negative',
      params: {
        componentKey: component.key,
        label: component.label,
        score: component.score,
      },
    };
  }

  if (component.score >= 80) {
    return {
      code: `${component.key}_high_score`,
      category,
      severity: 'positive',
      params: {
        componentKey: component.key,
        label: component.label,
        score: component.score,
      },
    };
  }

  return null;
}

function rankReason(reason: RafScoreReason): number {
  return SEVERITY_PRIORITY[reason.severity] * 10 + CATEGORY_PRIORITY[reason.category];
}

function dedupeByCategory(reasons: RafScoreReason[]): RafScoreReason[] {
  const byCategory = new Map<RafScoreReasonCategory, RafScoreReason>();

  for (const reason of reasons) {
    const existing = byCategory.get(reason.category);

    if (!existing || rankReason(reason) < rankReason(existing)) {
      byCategory.set(reason.category, reason);
    }
  }

  return [...byCategory.values()];
}

function sortAndCapReasons(reasons: RafScoreReason[]): RafScoreReason[] {
  return dedupeByCategory(reasons)
    .sort((a, b) => {
      const rankDiff = rankReason(a) - rankReason(b);
      if (rankDiff !== 0) return rankDiff;

      return a.code.localeCompare(b.code);
    })
    .slice(0, MAX_RAF_SCORE_REASONS);
}

export function buildRafScoreReasons(input: RafScoreReasonBuilderInput): RafScoreReason[] {
  const reasons: RafScoreReason[] = [];
  const rafScore = input.rafScore;

  if (!rafScore) {
    return [
      {
        code: 'raf_score_unavailable',
        category: 'data_quality',
        severity: 'warning',
      },
    ];
  }

  if (input.overallConfidence?.level === 'low' || rafScore.confidence === 'low') {
    reasons.push({
      code: 'data_low_confidence',
      category: 'data_quality',
      severity: 'warning',
      params: {
        confidence: input.overallConfidence?.level ?? rafScore.confidence,
      },
    });
  }

  if (!input.priceConfidence || input.priceConfidence.status === 'not_found') {
    reasons.push({
      code: 'price_missing',
      category: 'price',
      severity: 'warning',
    });
  } else if (input.priceConfidence.status === 'live' && !input.priceConfidence.isSynthetic) {
    reasons.push({
      code: 'price_live_available',
      category: 'price',
      severity: 'positive',
    });
  } else if (input.priceConfidence.status === 'recent') {
    reasons.push({
      code: 'price_recent',
      category: 'price',
      severity: 'warning',
      params: {
        observedAt: input.priceConfidence.observedAt,
      },
    });
  } else {
    reasons.push({
      code: 'price_beta_reference',
      category: 'price',
      severity: 'warning',
      params: {
        isSynthetic: input.priceConfidence.isSynthetic,
      },
    });
  }

  if (!input.allergenInfo || input.allergenInfo.dataStatus === 'unknown') {
    reasons.push({
      code: 'allergen_data_unknown',
      category: 'allergen',
      severity: 'warning',
    });
  } else {
    reasons.push({
      code: 'allergen_structured_present',
      category: 'allergen',
      severity: 'neutral',
      params: {
        declaredAllergenCount: input.allergenInfo.declaredAllergens.length,
        traceAllergenCount: input.allergenInfo.traceAllergens.length,
      },
    });
  }

  for (const component of rafScore.components) {
    const reason = componentScoreReason(component);

    if (reason) {
      reasons.push(reason);
    }
  }

  return sortAndCapReasons(reasons);
}
