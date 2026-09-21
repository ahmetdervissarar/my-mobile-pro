import { getCatalog } from '../catalog/catalog.js';
import type {
  BasketEvaluateRequest,
  BasketItem,
  BasketProfile,
  BasketProfileItem,
  BasketProfileSubScores,
  Score0To100,
} from './types.js';

interface ProductGroupScoreEstimate {
  score: Score0To100;
  subScores: BasketProfileSubScores;
  riskFlags: string[];
}

const EMPTY_SUB_SCORES: BasketProfileSubScores = {
  health: null,
  content: null,
  additives: null,
  sustainability: null,
};

const PRODUCT_GROUP_SCORE_ESTIMATES: Record<string, ProductGroupScoreEstimate> = {
  milk: {
    score: 78,
    subScores: {
      health: 82,
      content: 82,
      additives: 86,
      sustainability: 62,
    },
    riskFlags: [],
  },
  lactose_free_milk: {
    score: 80,
    subScores: {
      health: 82,
      content: 84,
      additives: 84,
      sustainability: 62,
    },
    riskFlags: [],
  },
  yogurt: {
    score: 79,
    subScores: {
      health: 82,
      content: 84,
      additives: 86,
      sustainability: 64,
    },
    riskFlags: [],
  },
  ayran: {
    score: 75,
    subScores: {
      health: 78,
      content: 80,
      additives: 82,
      sustainability: 62,
    },
    riskFlags: [],
  },
  kefir: {
    score: 82,
    subScores: {
      health: 86,
      content: 84,
      additives: 86,
      sustainability: 64,
    },
    riskFlags: [],
  },
  rice: {
    score: 76,
    subScores: {
      health: 78,
      content: 88,
      additives: 92,
      sustainability: 52,
    },
    riskFlags: [],
  },
  bulgur: {
    score: 82,
    subScores: {
      health: 86,
      content: 90,
      additives: 92,
      sustainability: 60,
    },
    riskFlags: [],
  },
  pasta: {
    score: 70,
    subScores: {
      health: 70,
      content: 78,
      additives: 86,
      sustainability: 52,
    },
    riskFlags: [],
  },
  lentils: {
    score: 85,
    subScores: {
      health: 90,
      content: 92,
      additives: 94,
      sustainability: 64,
    },
    riskFlags: [],
  },
  flour: {
    score: 68,
    subScores: {
      health: 68,
      content: 76,
      additives: 86,
      sustainability: 50,
    },
    riskFlags: [],
  },
  sugar: {
    score: 38,
    subScores: {
      health: 28,
      content: 52,
      additives: 90,
      sustainability: 48,
    },
    riskFlags: [],
  },
  olive_oil: {
    score: 82,
    subScores: {
      health: 88,
      content: 88,
      additives: 92,
      sustainability: 58,
    },
    riskFlags: [],
  },
  sunflower_oil: {
    score: 68,
    subScores: {
      health: 68,
      content: 78,
      additives: 90,
      sustainability: 50,
    },
    riskFlags: [],
  },
  chips: {
    score: 42,
    subScores: {
      health: 35,
      content: 42,
      additives: 55,
      sustainability: 44,
    },
    riskFlags: [],
  },
  cracker: {
    score: 48,
    subScores: {
      health: 44,
      content: 50,
      additives: 58,
      sustainability: 44,
    },
    riskFlags: [],
  },
  biscuit: {
    score: 45,
    subScores: {
      health: 38,
      content: 46,
      additives: 58,
      sustainability: 44,
    },
    riskFlags: [],
  },
  chocolate: {
    score: 50,
    subScores: {
      health: 42,
      content: 52,
      additives: 64,
      sustainability: 44,
    },
    riskFlags: [],
  },
  oat_bar: {
    score: 62,
    subScores: {
      health: 62,
      content: 66,
      additives: 68,
      sustainability: 50,
    },
    riskFlags: [],
  },
  water: {
    score: 72,
    subScores: {
      health: 90,
      content: 88,
      additives: 94,
      sustainability: 38,
    },
    riskFlags: [],
  },
  cola: {
    score: 28,
    subScores: {
      health: 20,
      content: 32,
      additives: 45,
      sustainability: 42,
    },
    riskFlags: [],
  },
  fruit_juice: {
    score: 52,
    subScores: {
      health: 48,
      content: 56,
      additives: 66,
      sustainability: 46,
    },
    riskFlags: [],
  },
};

function roundScore(value: number): Score0To100 {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getQuantityWeight(item: { quantity: { amount: number } }): number {
  const amount = Number.isFinite(item.quantity.amount) ? item.quantity.amount : 1;

  return Math.max(1, Math.min(20, amount));
}

function getEstimate(item: BasketItem): ProductGroupScoreEstimate | null {
  return PRODUCT_GROUP_SCORE_ESTIMATES[item.productGroupKey] ?? null;
}

/**
 * Katalogda bulunan ürün için isteğe bağlı sunum alanlarını ekler.
 * Puan (score/subScores/riskFlags) burada ASLA değiştirilmez — yalnız
 * scoreSource ile hangi kaynaktan geldiği etiketlenir (bkz. görev
 * değişmez kural 7).
 */
function toProfileItem(item: BasketEvaluateRequest['items'][number]): BasketProfileItem {
  const estimate = getEstimate(item);
  const scoreSource: BasketProfileItem['scoreSource'] = estimate ? 'group_estimate' : 'none';

  const base: BasketProfileItem = {
    type: item.type,
    label: item.label,
    productGroupKey: item.productGroupKey,
    quantity: item.quantity,
    score: estimate?.score ?? null,
    subScores: estimate?.subScores ?? EMPTY_SUB_SCORES,
    riskFlags: estimate?.riskFlags ?? [],
    scoreSource,
  };

  const catalogProduct = item.type === 'product' ? getCatalog().byId.get(item.productId) : undefined;

  if (!catalogProduct) {
    return { ...base, allergenDataStatus: 'unknown_or_unverified' };
  }

  return {
    ...base,
    brand: catalogProduct.brand ?? undefined,
    imageUrl: catalogProduct.imageUrl,
    nutriScore: catalogProduct.nutriScore,
    nova: catalogProduct.nova,
    allergenData: catalogProduct.allergenData,
  };
}

function weightedAverage(
  values: Array<{ value: number | null; weight: number }>,
): Score0To100 | null {
  const knownValues = values.filter((entry): entry is { value: number; weight: number } =>
    typeof entry.value === 'number',
  );

  if (knownValues.length === 0) {
    return null;
  }

  const totalWeight = knownValues.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return null;
  }

  const weightedSum = knownValues.reduce(
    (sum, entry) => sum + entry.value * entry.weight,
    0,
  );

  return roundScore(weightedSum / totalWeight);
}

function aggregateSubScores(perItem: BasketProfileItem[]): BasketProfileSubScores {
  const weightedItems = perItem.map((item) => ({
    item,
    weight: getQuantityWeight(item),
  }));

  return {
    health: weightedAverage(
      weightedItems.map(({ item, weight }) => ({
        value: item.subScores.health,
        weight,
      })),
    ),
    content: weightedAverage(
      weightedItems.map(({ item, weight }) => ({
        value: item.subScores.content,
        weight,
      })),
    ),
    additives: weightedAverage(
      weightedItems.map(({ item, weight }) => ({
        value: item.subScores.additives,
        weight,
      })),
    ),
    sustainability: weightedAverage(
      weightedItems.map(({ item, weight }) => ({
        value: item.subScores.sustainability,
        weight,
      })),
    ),
  };
}

export function buildBasketProfile(request: BasketEvaluateRequest): BasketProfile {
  const perItem = request.items.map(toProfileItem);
  const knownItemCount = perItem.filter((item) => item.score !== null).length;

  if (request.items.length === 0 || knownItemCount === 0) {
    return {
      itemCount: request.items.length,
      coverage: 'insufficient_data',
      basketRafSkoru: null,
      subScores: EMPTY_SUB_SCORES,
      perItem,
    };
  }

  const basketRafSkoru = weightedAverage(
    perItem.map((item) => ({
      value: item.score,
      weight: getQuantityWeight(item),
    })),
  );

  return {
    itemCount: request.items.length,
    coverage: knownItemCount === request.items.length ? 'partial' : 'partial',
    basketRafSkoru,
    subScores: aggregateSubScores(perItem),
    perItem,
  };
}
