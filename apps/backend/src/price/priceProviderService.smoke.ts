import { strict as assert } from 'node:assert';

import { PriceProviderService } from './priceProviderService.js';
import type { IPriceProvider, PriceQuery, PriceResult } from './types.js';

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

class SyntheticLiveProvider implements IPriceProvider {
  readonly name = 'manual_beta' as const;

  isEnabled(): boolean {
    return true;
  }

  async fetch(query: PriceQuery): Promise<PriceResult> {
    return {
      productName: query.productName ?? 'Sentetik canlı görünen test ürünü',
      barcode: query.barcode,
      marketName: 'Manual Beta',
      price: 10,
      currency: 'TRY',
      source: 'manual_beta',
      status: 'live',
      updatedAt: '2026-06-19T09:00:00.000Z',
      confidence: 0.95,
    };
  }
}

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

  const syntheticService = new PriceProviderService({
    extras: [new SyntheticLiveProvider()],
  });

  const syntheticResponse = await syntheticService.resolve({
    barcode: '9999999999999',
    productName: 'Sentetik canlı görünen test ürünü',
  });

  assert.equal(syntheticResponse.result.priceConfidence?.isSynthetic, true);
  assert.equal(syntheticResponse.result.priceConfidence?.source, 'manual_beta');
  assert.equal(
    syntheticResponse.result.priceConfidence?.status,
    'beta_reference',
    'synthetic provider data must be downgraded to beta_reference even if provider reports live',
  );
  assert.notEqual(syntheticResponse.result.priceConfidence?.status, 'live');

  const grainResponse = await syntheticService.resolve({
    productName: 'Pirinc',
  });

  assert.equal(
    grainResponse.result.contentScore?.factors.allergenTransparency,
    40,
    'grain fallback without explicit allergen evidence must stay unknown, not clear',
  );
  assert.notEqual(
    grainResponse.result.contentScore?.factors.allergenTransparency,
    100,
    'grain fallback without explicit allergen evidence must not receive clear allergen score',
  );

  console.log('PRICE_PROVIDER_SERVICE_SMOKE_OK');
} finally {
  globalThis.fetch = originalFetch;
}
