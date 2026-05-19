import { Router, type NextFunction, type Request, type Response } from 'express';

import { PriceProviderService } from '../price/priceProviderService.js';
import type { PriceQuery } from '../price/types.js';
import type { ManualBetaPriceEntry } from '../price/providers/manualBetaPriceProvider.js';

function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    res.status(503).json({ error: 'Admin API yapılandırılmadı.' });
    return;
  }

  const provided = req.header('X-Admin-Key');

  if (provided !== expected) {
    res.status(401).json({ error: 'Yetkisiz.' });
    return;
  }

  next();
}

export function createPriceRouter(
  service: PriceProviderService = new PriceProviderService(),
): Router {
  const router = Router();

  router.get('/resolve', async (req: Request, res: Response) => {
    const barcode = typeof req.query.barcode === 'string' ? req.query.barcode : undefined;
    const productName = typeof req.query.q === 'string' ? req.query.q : undefined;

    if (!barcode && !productName) {
      return res.status(400).json({
        error: 'barcode veya q parametrelerinden en az biri gereklidir.',
      });
    }

    const query: PriceQuery = { barcode, productName };

    try {
      const response = await service.resolve(query);
      const { raw, ...resultPublic } = response.result;
      void raw;

      return res.json({
        result: resultPublic,
        disclaimer: response.disclaimer,
        triedProviders: response.triedProviders,
      });
    } catch (err) {
      console.error('[priceRoutes] resolve failed:', err);

      return res.status(500).json({
        error: 'Fiyat sorgulanırken beklenmedik bir hata oluştu.',
      });
    }
  });

  router.post('/manual', requireAdminKey, (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Partial<ManualBetaPriceEntry>;

    if (!body.barcode && !body.productName) {
      return res.status(400).json({
        error: 'barcode veya productName en az biri gereklidir.',
      });
    }

    if (typeof body.marketName !== 'string' || body.marketName.length === 0) {
      return res.status(400).json({ error: 'marketName zorunlu.' });
    }

    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
      return res.status(400).json({ error: 'price geçerli bir sayı olmalı.' });
    }

    try {
      const saved = service.manualBeta.upsert({
        barcode: body.barcode,
        productName: body.productName ?? 'Barkodlu ürün',
        marketName: body.marketName,
        price: body.price,
        currency: body.currency,
      });

      return res.status(201).json({ ok: true, entry: saved });
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get('/manual', requireAdminKey, (_req: Request, res: Response) => {
    return res.json({ entries: service.manualBeta.list() });
  });

  return router;
}