import { strict as assert } from 'node:assert';

import { PriceProviderService } from './priceProviderService.js';

const originalFetch = globalThis.fetch;

globalThis.fetch = (async () =>
  new Response(
    JSON.stringify({
      status: 0,
      status_verbose: 'product not found',
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    },
  )) as typeof fetch;

try {
  const service = new PriceProviderService();

  const response = await service.resolve({
    barcode: '1111111111111',
  });

  assert.equal(response.result.productFacts ?? null, null);
  assert.equal(response.result.sustainability ?? null, null);
  assert.equal(response.result.rafScore?.status, 'unavailable');
  assert.equal(response.result.rafScore?.score, null);

  assert.equal(response.result.healthScore?.status, 'unavailable');
  assert.equal(response.result.healthScore?.score, null);
  assert.equal(response.result.contentScore?.status, 'unavailable');
  assert.equal(response.result.contentScore?.score, null);
  assert.equal(response.result.overallConfidence?.level, 'low');
  assert.equal(response.result.priceConfidence?.status, 'not_found');
  assert.equal(response.result.priceConfidence?.source, null);
  assert.equal(response.result.priceConfidence?.observedAt, null);
  assert.equal(response.result.priceConfidence?.isSynthetic, false);

  const sustainabilityComponent = response.result.rafScore?.components.find(
    (component) => component.key === 'sustainability',
  );

  assert.equal(sustainabilityComponent?.isAvailable, false);
  assert.equal(sustainabilityComponent?.score, null);

  if (response.result.priceConfidence?.isSynthetic) {
  assert.notEqual(
    response.result.priceConfidence.status,
    'live',
    'synthetic price must never be rendered as live',
  );
}

console.log('PRICE_PROVIDER_SERVICE_SMOKE_OK');
} finally {
  globalThis.fetch = originalFetch;
}
