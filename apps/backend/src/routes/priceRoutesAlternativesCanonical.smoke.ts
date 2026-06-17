import assert from 'node:assert/strict';

import express from 'express';

import { createPriceRouter } from './priceRoutes.js';
import type { PriceProviderService } from '../price/priceProviderService.js';

const previousCanonicalFlag = process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = '1';

const app = express();

app.use(
  '/api/price',
  createPriceRouter({
    resolve: async () => {
      throw new Error('resolve should not be called by alternatives smoke');
    },
  } as unknown as PriceProviderService),
);

async function fetchAlternatives(productGroupKey: string): Promise<Response> {
  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Test server address not available.');
    }

    const params = new URLSearchParams({
      categoryKey: productGroupKey === 'chips_100g' ? 'snacks' : 'dairy',
      productGroupKey,
      price: productGroupKey === 'chips_100g' ? '32' : '46',
      rafScore: productGroupKey === 'chips_100g' ? '66' : '74',
      healthScore: productGroupKey === 'chips_100g' ? '32' : '70',
      contentScore: productGroupKey === 'chips_100g' ? '68' : '72',
      sustainabilityScore: productGroupKey === 'chips_100g' ? '50' : '65',
      limit: '3',
    });

    return await fetch(
      `http://127.0.0.1:${address.port}/api/price/alternatives?${params.toString()}`,
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

try {
  const milkResponse = await fetchAlternatives('milk_1l');
  assert.equal(milkResponse.status, 200);
  const milkData = (await milkResponse.json()) as {
    recommendations: Array<{
      candidate: {
        productGroupKey?: string;
        resolvedProductGroupKey?: string | null;
        packageSize?: { normalizedValue: number; normalizedUnit: string } | null;
      };
    }>;
  };

  assert.equal(milkData.recommendations.length, 2);
  assert.ok(
    milkData.recommendations.every(
      (recommendation) => recommendation.candidate.productGroupKey === 'milk_1l',
    ),
  );
  assert.ok(
    milkData.recommendations.every(
      (recommendation) => recommendation.candidate.resolvedProductGroupKey === 'milk',
    ),
  );
  assert.ok(
    milkData.recommendations.every(
      (recommendation) =>
        recommendation.candidate.packageSize?.normalizedValue === 1000 &&
        recommendation.candidate.packageSize?.normalizedUnit === 'ml',
    ),
  );

  const chipsResponse = await fetchAlternatives('chips_100g');
  assert.equal(chipsResponse.status, 200);
  const chipsData = (await chipsResponse.json()) as {
    recommendations: Array<{
      candidate: {
        productGroupKey?: string;
        resolvedProductGroupKey?: string | null;
        packageSize?: { normalizedValue: number; normalizedUnit: string } | null;
      };
    }>;
  };

  assert.equal(chipsData.recommendations.length, 2);
  assert.ok(
    chipsData.recommendations.every(
      (recommendation) => recommendation.candidate.productGroupKey === 'chips_100g',
    ),
  );
  assert.ok(
    chipsData.recommendations.every(
      (recommendation) => recommendation.candidate.resolvedProductGroupKey === 'chips',
    ),
  );
  assert.ok(
    chipsData.recommendations.every(
      (recommendation) =>
        recommendation.candidate.packageSize?.normalizedValue === 100 &&
        recommendation.candidate.packageSize?.normalizedUnit === 'g',
    ),
  );

  console.log('PRICE_ROUTES_ALTERNATIVES_CANONICAL_SMOKE_OK');
} finally {
  if (previousCanonicalFlag === undefined) {
    delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
  } else {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = previousCanonicalFlag;
  }
}
