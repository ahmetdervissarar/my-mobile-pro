import { buildBasketProfile } from './basketScoring.js';
import type { BasketEvaluateRequest, BasketEvaluateResponse } from './types.js';

export function evaluateBasket(request: BasketEvaluateRequest): BasketEvaluateResponse {
  return {
    ok: true,
    basketProfile: buildBasketProfile(request),
    marketEvaluations: {
      status: 'insufficient_data',
      markets: [],
    },
  };
}
