import { Router } from 'express';

import { buildBetaFeedbackEvent, logBetaFeedbackEvent } from '../beta/feedback.js';

export function createBetaRouter(): Router {
  const router = Router();

  router.post('/feedback', (req, res) => {
    const result = buildBetaFeedbackEvent(req.body);

    if (!result.ok) {
      return res.status(400).json({
        ok: false,
        error: result.errorCode,
      });
    }

    logBetaFeedbackEvent(result.event);

    return res.status(202).json({
      ok: true,
      accepted: true,
    });
  });

  return router;
}
