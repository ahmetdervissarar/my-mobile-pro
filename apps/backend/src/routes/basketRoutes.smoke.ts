process.env.USE_ONLINE_TEST_PRICE_SEED = '1';
import assert from 'node:assert/strict';

import express from 'express';

import { createBasketRouter } from './basketRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/basket', createBasketRouter());

async function post(path: string, body: unknown): Promise<Response> {
  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Test server address not available.');
    }

    return await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

const validResponse = await post('/api/basket/evaluate', {
  items: [
    {
      type: 'product_group',
      productGroupKey: 'rice',
      label: 'Pirinç',
      quantity: { amount: 1, unit: 'kilogram' },
    },
  ],
});

assert.equal(validResponse.status, 200);

const validJson = (await validResponse.json()) as {
  ok: boolean;
  basketProfile: {
    itemCount: number;
    coverage: string;
    basketRafSkoru: number | null;
  };
  marketEvaluations: {
    status: string;
    markets: Array<{
      marketId: string;
      priceEstimate?: {
        amount: number;
        currency: string;
        coversItemCount: number;
      };
    }>;
    cheapestMarketId?: string | null;
    bestRafScoreMarketId?: string | null;
  };
};

assert.equal(validJson.ok, true);
assert.equal(validJson.basketProfile.itemCount, 1);
assert.equal(validJson.basketProfile.coverage, 'partial');
assert.equal(typeof validJson.basketProfile.basketRafSkoru, 'number');
assert.equal(validJson.marketEvaluations.status, 'demo');
assert.ok(validJson.marketEvaluations.markets.length > 0);
assert.ok(validJson.marketEvaluations.cheapestMarketId);
assert.ok(validJson.marketEvaluations.bestRafScoreMarketId);
assert.ok(
  validJson.marketEvaluations.markets.some((market) =>
    market.marketId === validJson.marketEvaluations.cheapestMarketId &&
    market.priceEstimate &&
    market.priceEstimate.coversItemCount === validJson.basketProfile.itemCount,
  ),
);

const invalidResponse = await post('/api/basket/evaluate', {
  items: 'rice',
});

assert.equal(invalidResponse.status, 400);

console.log('BASKET_ROUTES_EVALUATE_SMOKE_OK');
