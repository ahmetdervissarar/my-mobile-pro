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

  const sustainabilityComponent = response.result.rafScore?.components.find(
    (component) => component.key === 'sustainability',
  );

  assert.equal(sustainabilityComponent?.isAvailable, false);
  assert.equal(sustainabilityComponent?.score, null);

  console.log('PRICE_PROVIDER_SERVICE_SMOKE_OK');
} finally {
  globalThis.fetch = originalFetch;
}
