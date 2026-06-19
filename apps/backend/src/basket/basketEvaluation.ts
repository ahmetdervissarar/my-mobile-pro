import { PriceProviderService } from '../price/priceProviderService.js';
import type { BasketEvaluateRequest, BasketEvaluateResponse, BasketMarketEvaluation, BasketMarketEvaluations, BasketProfile, Score0To100 } from './types.js';
import { buildBasketProfile } from './basketScoring.js';

function roundScore(value: number): Score0To100 {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeMarketId(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('İ', 'I')
    .replaceAll('ı', 'i')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function scorePrice(total: number, lowest: number, highest: number): Score0To100 {
  if (highest <= lowest) {
    return 100;
  }

  const normalized = 100 - ((total - lowest) / (highest - lowest)) * 40;

  return roundScore(normalized);
}

function scoreMarketBasket(priceScore: Score0To100, basketProfile: BasketProfile): Score0To100 {
  if (typeof basketProfile.basketRafSkoru !== 'number') {
    return priceScore;
  }

  return roundScore(priceScore * 0.6 + basketProfile.basketRafSkoru * 0.4);
}

async function buildBasketMarketEvaluations(
  request: BasketEvaluateRequest,
  basketProfile: BasketProfile,
): Promise<BasketMarketEvaluations> {
  const totalItems = request.items.length;

  if (totalItems === 0) {
    return {
      status: 'insufficient_data',
      markets: [],
      cheapestMarketId: null,
      bestRafScoreMarketId: null,
      insufficientDataReason: 'Sepette ürün yok.',
    };
  }

  const priceService = new PriceProviderService();
  const marketMap = new Map<string, BasketMarketEvaluation & { runningTotal: number }>();

  for (const item of request.items) {
    const response = await priceService.resolve({
      productName: item.label,
      productGroupKey: item.productGroupKey,
      location: request.location,
    });

    const marketPrices = response.result.marketPrices ?? [];

    for (const marketPrice of marketPrices) {
      const marketId = normalizeMarketId(marketPrice.marketName);
      const current =
        marketMap.get(marketId) ??
        {
          marketId,
          name: marketPrice.marketName,
          distanceKm: null,
          availability: {
            available: 0,
            total: totalItems,
            missing: request.items.map((basketItem) => basketItem.label),
          },
          runningTotal: 0,
        };

      if (current.availability.missing.includes(item.label)) {
        current.availability.available += 1;
        current.availability.missing = current.availability.missing.filter(
          (label) => label !== item.label,
        );
      }

      current.runningTotal += marketPrice.price;
      current.basketAvailabilityScore = roundScore(
        (current.availability.available / totalItems) * 100,
      );

      marketMap.set(marketId, current);
    }
  }

  const fullCoverageMarkets = [...marketMap.values()].filter(
    (market) => market.availability.available === totalItems,
  );

  if (fullCoverageMarkets.length === 0) {
    return {
      status: 'insufficient_data',
      markets: [...marketMap.values()].map(({ runningTotal: _runningTotal, ...market }) => market),
      cheapestMarketId: null,
      bestRafScoreMarketId: null,
      insufficientDataReason:
        'Hiçbir market sepetin tamamı için fiyat verisi sunmadı.',
    };
  }

  const totals = fullCoverageMarkets.map((market) => market.runningTotal);
  const lowestTotal = Math.min(...totals);
  const highestTotal = Math.max(...totals);

  const completedMarkets = [...marketMap.values()].map((market) => {
    if (market.availability.available !== totalItems) {
      const { runningTotal: _runningTotal, ...partialMarket } = market;

      return partialMarket;
    }

    const priceScore = scorePrice(market.runningTotal, lowestTotal, highestTotal);
    const marketBasketRafSkoru = scoreMarketBasket(priceScore, basketProfile);
    const { runningTotal: _runningTotal, ...completedMarket } = market;

    return {
      ...completedMarket,
      priceEstimate: {
        amount: Number(market.runningTotal.toFixed(2)),
        currency: 'TRY' as const,
        coversItemCount: totalItems,
      },
      basketPriceScore: priceScore,
      marketBasketRafSkoru,
    };
  });

  const cheapestMarket = completedMarkets
    .filter((market) => market.priceEstimate)
    .sort((a, b) => (a.priceEstimate?.amount ?? Infinity) - (b.priceEstimate?.amount ?? Infinity))[0];

  const bestRafScoreMarket = completedMarkets
    .filter((market) => typeof market.marketBasketRafSkoru === 'number')
    .sort((a, b) => (b.marketBasketRafSkoru ?? -1) - (a.marketBasketRafSkoru ?? -1))[0];

  return {
    status: 'demo',
    markets: completedMarkets,
    cheapestMarketId: cheapestMarket?.marketId ?? null,
    bestRafScoreMarketId: bestRafScoreMarket?.marketId ?? null,
  };
}

export async function evaluateBasket(
  request: BasketEvaluateRequest,
): Promise<BasketEvaluateResponse> {
  const basketProfile = buildBasketProfile(request);

  return {
    ok: true,
    basketProfile,
    marketEvaluations: await buildBasketMarketEvaluations(request, basketProfile),
  };
}