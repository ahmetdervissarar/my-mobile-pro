import { Router, type NextFunction, type Request, type Response } from 'express';

import { PriceProviderService } from '../price/priceProviderService.js';
import type { PriceQuery } from '../price/types.js';
import { loadSeedAlternativeCandidates, normalizeAlternativeProductShape, scoreAlternatives } from '../price/alternatives/index.js';
import type { SustainabilityCategoryKey } from '../price/sustainability/index.js';
import type { ManualBetaPriceEntry } from '../price/providers/manualBetaPriceProvider.js';
import { buildAlternativesBetaQueryEvent, buildPriceResolveBetaQueryEvent, logBetaQueryEvent } from '../price/betaTelemetry/queryEvent.js';

const SUSTAINABILITY_CATEGORY_KEYS = new Set<string>([
  'plant_based',
  'staple_food',
  'beverages',
  'breakfast',
  'baby_food',
  'dairy',
  'sauces_condiments',
  'snacks',
  'sweets_chocolate',
  'frozen_ready',
  'meat',
  'unknown',
]);

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



function parseOptionalNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCategoryKey(value: unknown): SustainabilityCategoryKey | undefined {
  if (typeof value !== 'string' || !SUSTAINABILITY_CATEGORY_KEYS.has(value)) {
    return undefined;
  }

  return value as SustainabilityCategoryKey;
}

function buildTransitionSafeAlternativeCurrentProduct(input: {
  barcode?: string;
  productName?: string;
  categoryKey: SustainabilityCategoryKey;
  productGroupKey: string;
  price?: number | null;
  rafScore?: number | null;
  healthScore?: number | null;
  contentScore?: number | null;
  sustainabilityScore?: number | null;
}) {
  const shape = normalizeAlternativeProductShape(input);

  return {
    ...input,
    resolvedProductGroupKey: input.productGroupKey
      ? shape.canonicalProductGroupKey
      : undefined,
    packageSize: shape.packageSize ?? undefined,
    alternativesEligible: Boolean(shape.canonicalProductGroupKey && shape.packageSize),
  };
}

function parseProductGroupKey(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}
function parseCoordinate(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return undefined;
  }

  return parsed;
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

    const latitude = parseCoordinate(req.query.lat ?? req.query.latitude, -90, 90);
    const longitude = parseCoordinate(req.query.lng ?? req.query.longitude, -180, 180);
    const location =
      latitude !== undefined && longitude !== undefined
        ? { lat: latitude, lng: longitude }
        : undefined;

    const query: PriceQuery = { barcode, productName, location };

    try {
      const response = await service.resolve(query);
      const { raw, ...resultPublic } = response.result;
      void raw;

      logBetaQueryEvent(
        buildPriceResolveBetaQueryEvent({
          query,
          result: resultPublic,
          triedProviders: response.triedProviders,
        }),
      );

      return res.json({
        result: resultPublic,
        disclaimer: response.disclaimer,
        triedProviders: response.triedProviders,
      });
    } catch (err) {
      console.error('[priceRoutes] resolve failed:', err);
      logBetaQueryEvent(
        buildPriceResolveBetaQueryEvent({ query, errorCode: 'resolve_failed' }),
      );

      return res.status(500).json({
        error: 'Fiyat sorgulanırken beklenmedik bir hata oluştu.',
      });
    }
  });


  router.get('/alternatives', (req: Request, res: Response) => {
    const categoryKey = parseCategoryKey(req.query.categoryKey);

    if (!categoryKey || categoryKey === 'unknown') {
      logBetaQueryEvent(
        buildAlternativesBetaQueryEvent({
          query: {
            barcode: typeof req.query.barcode === 'string' ? req.query.barcode : undefined,
            productName: typeof req.query.productName === 'string' ? req.query.productName : undefined,
          },
          categoryKey: typeof req.query.categoryKey === 'string' ? req.query.categoryKey : undefined,
          recommendationCount: 0,
          suppressionReason: 'invalid_category',
        }),
      );

      return res.status(400).json({
        error: 'Geçerli bir categoryKey parametresi gereklidir.',
      });
    }

    const productGroupKey = parseProductGroupKey(req.query.productGroupKey);

    if (!productGroupKey) {
      logBetaQueryEvent(
        buildAlternativesBetaQueryEvent({
          query: {
            barcode: typeof req.query.barcode === 'string' ? req.query.barcode : undefined,
            productName: typeof req.query.productName === 'string' ? req.query.productName : undefined,
          },
          categoryKey,
          recommendationCount: 0,
          suppressionReason: 'missing_product_group',
        }),
      );

      return res.json({ recommendations: [] });
    }

    const currentProduct = buildTransitionSafeAlternativeCurrentProduct({
      barcode: typeof req.query.barcode === 'string' ? req.query.barcode : undefined,
      productName: typeof req.query.productName === 'string' ? req.query.productName : undefined,
      categoryKey,
      productGroupKey,
      price: parseOptionalNumber(req.query.price),
      rafScore: parseOptionalNumber(req.query.rafScore),
      healthScore: parseOptionalNumber(req.query.healthScore),
      contentScore: parseOptionalNumber(req.query.contentScore),
      sustainabilityScore: parseOptionalNumber(req.query.sustainabilityScore),
    });

    if (currentProduct.alternativesEligible === false) {
      logBetaQueryEvent(
        buildAlternativesBetaQueryEvent({
          query: {
            barcode: typeof req.query.barcode === 'string' ? req.query.barcode : undefined,
            productName: typeof req.query.productName === 'string' ? req.query.productName : undefined,
          },
          categoryKey,
          productGroupKey,
          resolvedProductGroupKey: currentProduct.resolvedProductGroupKey,
          alternativesEligible: false,
          recommendationCount: 0,
          suppressionReason: 'not_alternatives_eligible',
        }),
      );

      return res.json({ recommendations: [] });
    }

    const candidates = loadSeedAlternativeCandidates();
    const recommendations = scoreAlternatives({
      currentProduct,
      candidates,
      limit: parseOptionalNumber(req.query.limit),
    });

    logBetaQueryEvent(
      buildAlternativesBetaQueryEvent({
        query: {
          barcode: typeof req.query.barcode === 'string' ? req.query.barcode : undefined,
          productName: typeof req.query.productName === 'string' ? req.query.productName : undefined,
        },
        categoryKey,
        productGroupKey,
        resolvedProductGroupKey: currentProduct.resolvedProductGroupKey,
        alternativesEligible: currentProduct.alternativesEligible,
        recommendationCount: recommendations.length,
        suppressionReason: recommendations.length === 0 ? 'no_safe_recommendation' : undefined,
      }),
    );

    return res.json({ recommendations });
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
