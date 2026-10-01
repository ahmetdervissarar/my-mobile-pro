/**
 * RafSkoru — submitBetaFeedback dönüş sözleşmesi (P0-2, feat/v2-catalog)
 * src/api/betaFeedbackClient.smoke.ts
 *
 * product-contribution.tsx'in "ağ isteği başarısızsa 'alındı' denmesin"
 * düzeltmesi bu fonksiyonun dönüşüne dayanır — bu test o sözleşmeyi kilitler:
 * ağ hatası veya response.ok=false → false; response.ok=true → true.
 * (React bileşeninin kendi handleSubmit kapanışı dışa açık değildir; bu
 * yüzden bileşen mantığı cihaz testi kontrol listesiyle doğrulanır.)
 */
import assert from 'node:assert/strict';

import { submitBetaFeedback } from './betaFeedbackClient';

type FetchFn = typeof fetch;
const originalFetch: FetchFn = globalThis.fetch;

async function main(): Promise<void> {
  // ── Ağ hatası (fetch reddediyor) → false ────────────────────────────────
  globalThis.fetch = (async () => {
    throw new Error('network unreachable (simülasyon)');
  }) as FetchFn;

  const resultOnNetworkError = await submitBetaFeedback({ feedbackType: 'product_contribution' });
  assert.equal(resultOnNetworkError, false, 'ağ hatasında submitBetaFeedback false dönmeli');

  // ── Sunucu hata kodu döndürüyor (response.ok=false) → false ─────────────
  globalThis.fetch = (async () =>
    ({ ok: false, status: 500 }) as Response) as FetchFn;

  const resultOnServerError = await submitBetaFeedback({ feedbackType: 'product_contribution' });
  assert.equal(resultOnServerError, false, 'response.ok=false iken submitBetaFeedback false dönmeli');

  // ── Başarılı yanıt → true ────────────────────────────────────────────────
  globalThis.fetch = (async () => ({ ok: true, status: 200 }) as Response) as FetchFn;

  const resultOnSuccess = await submitBetaFeedback({ feedbackType: 'product_contribution' });
  assert.equal(resultOnSuccess, true, 'response.ok=true iken submitBetaFeedback true dönmeli');

  globalThis.fetch = originalFetch;
  console.log('BETA_FEEDBACK_CLIENT_SMOKE_OK');
}

void main();
