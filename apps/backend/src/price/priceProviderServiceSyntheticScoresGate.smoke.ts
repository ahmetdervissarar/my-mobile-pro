/**
 * RafSkoru — ENABLE_SYNTHETIC_SCORES kapısı (madde 8, chore/stabilization)
 * apps/backend/src/price/priceProviderServiceSyntheticScoresGate.smoke.ts
 *
 * inferBetaHealthScore/inferBetaContentScore ve BetaReferencePriceProvider
 * GERÇEK veri değil — ürün adından UYDURULMUŞ skor/fiyat üretir. Bu test
 * production'da varsayılan KAPALI olduğunu, ENABLE_SYNTHETIC_SCORES=1 ile
 * açıkça açılabildiğini ve development'ta (varsayılan) açık kaldığını
 * kanıtlar.
 */
import { strict as assert } from 'node:assert';

import { PriceProviderService } from './priceProviderService.js';

const originalFetch = globalThis.fetch;
const originalNodeEnv = process.env.NODE_ENV;
const originalFlag = process.env.ENABLE_SYNTHETIC_SCORES;

// Katalogda yok, canlı OFF'ta da yok — productFacts her zaman null, bu
// yüzden sentetik yola (ya da boş girdiye) her zaman düşülür.
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ status: 0, status_verbose: 'product not found' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;

try {
  // ── production + bayrak KAPALI (varsayılan) → sentetik veri YOK ─────────
  process.env.NODE_ENV = 'production';
  delete process.env.ENABLE_SYNTHETIC_SCORES;

  const disabledService = new PriceProviderService();
  const disabledResponse = await disabledService.resolve({ productName: 'Kola' });

  assert.equal(
    disabledResponse.result.healthScore?.score,
    null,
    'production + bayrak kapalıyken sentetik sağlık skoru üretilmemeli',
  );
  assert.equal(
    disabledResponse.result.price,
    null,
    'production + bayrak kapalıyken BetaReferencePriceProvider fiyat üretmemeli',
  );

  // ── production + bayrak AÇIK → sentetik veri üretilir (eski davranış) ──
  process.env.ENABLE_SYNTHETIC_SCORES = '1';

  const enabledService = new PriceProviderService();
  const enabledResponse = await enabledService.resolve({ productName: 'Kola' });

  assert.equal(
    enabledResponse.result.healthScore?.score !== null,
    true,
    'bayrak açıkken sentetik sağlık skoru üretilmeli',
  );
  assert.equal(
    enabledResponse.result.price !== null,
    true,
    'bayrak açıkken BetaReferencePriceProvider fiyat üretmeli',
  );

  // ── development (varsayılan ortam) → bayraktan BAĞIMSIZ her zaman açık ─
  process.env.NODE_ENV = 'development';
  delete process.env.ENABLE_SYNTHETIC_SCORES;

  const devService = new PriceProviderService();
  const devResponse = await devService.resolve({ productName: 'Kola' });

  assert.equal(
    devResponse.result.healthScore?.score !== null,
    true,
    'development ortamında bayraktan bağımsız sentetik veri açık olmalı',
  );

  console.log('PRICE_PROVIDER_SERVICE_SYNTHETIC_SCORES_GATE_SMOKE_OK');
} finally {
  globalThis.fetch = originalFetch;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalFlag === undefined) delete process.env.ENABLE_SYNTHETIC_SCORES;
  else process.env.ENABLE_SYNTHETIC_SCORES = originalFlag;
}
