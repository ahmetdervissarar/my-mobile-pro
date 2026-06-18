import { Router } from 'express';

import { suggestSearch } from '../search/suggestions.js';

function parseLimit(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export function createSearchRouter(): Router {
  const router = Router();

  router.get('/suggest', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const limit = parseLimit(req.query.limit);

    res.json({
      ok: true,
      ...suggestSearch(query, { limit }),
    });
  });

  return router;
}
