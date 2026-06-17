import assert from 'node:assert/strict';

import express from 'express';

import { createPriceRouter } from './priceRoutes.js';
import type { PriceProviderService } from '../price/priceProviderService.js';

const previousCanonicalFlag = process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;

const app = express();

app.use(
  '/api/price',
  createPriceRouter({
    resolve: async () => {
      throw new Error('resolve should not be called by alternatives parity smoke');
    },
  } as unknown as PriceProviderService),
);

const server = app.listen(0);

function getServerPort(): number {
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Test server address not available.');
  }

  return address.port;
}

function setCanonicalFlag(enabled: boolean): void {
  if (enabled) {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = '1';
    return;
  }

  delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
}

async function fetchAlternativeIds(input: {
  canonicalFlag: boolean;
  categoryKey: string;
  productGroupKey: string;
  price: string;
  rafScore: string;
  healthScore: string;
  contentScore: string;
  sustainabilityScore: string;
  limit: string;
}): Promise<string[]> {
  setCanonicalFlag(input.canonicalFlag);

  const params = new URLSearchParams({
    categoryKey: input.categoryKey,
    productGroupKey: input.productGroupKey,
    price: input.price,
    rafScore: input.rafScore,
    healthScore: input.healthScore,
    contentScore: input.contentScore,
    sustainabilityScore: input.sustainabilityScore,
    limit: input.limit,
  });

  const response = await fetch(
    `http://127.0.0.1:${getServerPort()}/api/price/alternatives?${params.toString()}`,
  );

  assert.equal(response.status, 200);

  const data = (await response.json()) as {
    recommendations?: Array<{
      candidate?: {
        id?: string;
        productGroupKey?: string;
        resolvedProductGroupKey?: string | null;
        packageSize?: unknown;
      };
    }>;
  };

  assert.ok(Array.isArray(data.recommendations));

  for (const recommendation of data.recommendations) {
    assert.ok(recommendation.candidate?.id);
    assert.ok(recommendation.candidate.productGroupKey);
    assert.ok(recommendation.candidate.resolvedProductGroupKey);
    assert.ok(recommendation.candidate.packageSize);
  }

  return data.recommendations.map((recommendation) => recommendation.candidate?.id ?? '');
}

async function assertRouteParity(input: {
  caseName: string;
  categoryKey: string;
  productGroupKey: string;
  price: string;
  rafScore: string;
  healthScore: string;
  contentScore: string;
  sustainabilityScore: string;
  limit: string;
}): Promise<void> {
  const legacyIds = await fetchAlternativeIds({
    ...input,
    canonicalFlag: false,
  });

  const canonicalIds = await fetchAlternativeIds({
    ...input,
    canonicalFlag: true,
  });

  assert.ok(legacyIds.length > 0, `${input.caseName}: expected legacy recommendations`);
  assert.deepEqual(
    canonicalIds,
    legacyIds,
    `${input.caseName}: canonical route recommendations must match legacy ordered IDs`,
  );
}

try {
  await assertRouteParity({
    caseName: 'milk_1l route parity',
    categoryKey: 'dairy',
    productGroupKey: 'milk_1l',
    price: '46',
    rafScore: '74',
    healthScore: '70',
    contentScore: '72',
    sustainabilityScore: '65',
    limit: '3',
  });

  await assertRouteParity({
    caseName: 'chips_100g route parity',
    categoryKey: 'snacks',
    productGroupKey: 'chips_100g',
    price: '32',
    rafScore: '66',
    healthScore: '32',
    contentScore: '68',
    sustainabilityScore: '50',
    limit: '3',
  });

  console.log('PRICE_ROUTES_ALTERNATIVES_PARITY_SMOKE_OK');
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

  if (previousCanonicalFlag === undefined) {
    delete process.env.USE_CANONICAL_ALTERNATIVE_MATCHING;
  } else {
    process.env.USE_CANONICAL_ALTERNATIVE_MATCHING = previousCanonicalFlag;
  }
}
