import { Router } from 'express';

import { evaluateBasket } from '../basket/basketEvaluation.js';
import type { BasketEvaluateRequest } from '../basket/types.js';

function isBasketEvaluateRequest(value: unknown): value is BasketEvaluateRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<BasketEvaluateRequest>;

  return Array.isArray(candidate.items);
}

export function createBasketRouter(): Router {
  const router = Router();

  router.post('/evaluate', (req, res) => {
    if (!isBasketEvaluateRequest(req.body)) {
      res.status(400).json({
        ok: false,
        error: 'INVALID_BASKET_EVALUATE_REQUEST',
      });
      return;
    }

    res.json(evaluateBasket(req.body));
  });

  return router;
}
