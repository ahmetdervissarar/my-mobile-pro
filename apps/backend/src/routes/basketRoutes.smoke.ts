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
  };
  marketEvaluations: {
    status: string;
    markets: unknown[];
  };
};

assert.equal(validJson.ok, true);
assert.equal(validJson.basketProfile.itemCount, 1);
assert.equal(validJson.basketProfile.coverage, 'insufficient_data');
assert.equal(validJson.marketEvaluations.status, 'insufficient_data');
assert.deepEqual(validJson.marketEvaluations.markets, []);

const invalidResponse = await post('/api/basket/evaluate', {
  items: 'rice',
});

assert.equal(invalidResponse.status, 400);

console.log('BASKET_ROUTES_EVALUATE_SMOKE_OK');
