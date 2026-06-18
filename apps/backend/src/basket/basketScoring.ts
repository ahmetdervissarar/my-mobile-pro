import type {
  BasketEvaluateRequest,
  BasketProfile,
  BasketProfileItem,
  BasketProfileSubScores,
} from './types.js';

const EMPTY_SUB_SCORES: BasketProfileSubScores = {
  health: null,
  content: null,
  additives: null,
  sustainability: null,
};

function toProfileItem(item: BasketEvaluateRequest['items'][number]): BasketProfileItem {
  return {
    type: item.type,
    label: item.label,
    productGroupKey: item.productGroupKey,
    quantity: item.quantity,
    score: null,
    subScores: EMPTY_SUB_SCORES,
    riskFlags: [],
  };
}

export function buildBasketProfile(request: BasketEvaluateRequest): BasketProfile {
  const perItem = request.items.map(toProfileItem);

  return {
    itemCount: request.items.length,
    coverage: request.items.length > 0 ? 'insufficient_data' : 'insufficient_data',
    basketRafSkoru: null,
    subScores: EMPTY_SUB_SCORES,
    perItem,
  };
}
