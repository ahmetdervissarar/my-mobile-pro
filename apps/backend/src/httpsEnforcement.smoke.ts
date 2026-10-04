/**
 * RafSkoru — httpsEnforcement sözleşmesi
 * apps/backend/src/httpsEnforcement.smoke.ts
 */
import assert from 'node:assert/strict';

import express from 'express';

import { createHttpsEnforcementMiddleware } from './httpsEnforcement.js';

async function withServer<T>(app: express.Express, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server address not available.');
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolvePromise, reject) => {
      server.close((err) => (err ? reject(err) : resolvePromise()));
    });
  }
}

{
  const app = express();
  app.use(createHttpsEnforcementMiddleware());
  app.get('/ping', (_req, res) => res.json({ ok: true }));

  await withServer(app, async (baseUrl) => {
    // Vekilden gelen bir ipucu olmadan (test sunucusu düz HTTP) → reddedilir.
    const plainHttp = await fetch(`${baseUrl}/ping`);
    assert.equal(plainHttp.status, 403);
    assert.equal(((await plainHttp.json()) as { error: string }).error, 'https_required');

    // Ters vekilin ilettiği X-Forwarded-Proto: https → kabul edilir.
    const viaHttpsProxy = await fetch(`${baseUrl}/ping`, { headers: { 'X-Forwarded-Proto': 'https' } });
    assert.equal(viaHttpsProxy.status, 200);

    // Vekil açıkça http diyor → reddedilir.
    const viaHttpProxy = await fetch(`${baseUrl}/ping`, { headers: { 'X-Forwarded-Proto': 'http' } });
    assert.equal(viaHttpProxy.status, 403);
  });
}

console.log('HTTPS_ENFORCEMENT_SMOKE_OK');
