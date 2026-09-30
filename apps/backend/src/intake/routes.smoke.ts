/**
 * RafSkoru — Intake auth uç noktaları sözleşmesi
 * apps/backend/src/intake/routes.smoke.ts
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import express from 'express';

import { ADMIN_KEY_HEADER, requireAdminAuth, VOLUNTEER_CODE_HEADER, VOLUNTEER_KEY_HEADER } from './auth.js';
import { __resetIntakeDbForTesting } from './db.js';
import { createIntakeRouter, createIntakeUnavailableRouter } from './routes.js';
import { __resetVolunteersCacheForTesting } from './volunteers.js';

const fixtureDir = mkdtempSync(join(tmpdir(), 'rafskoru-intake-routes-'));
const volunteersPath = join(fixtureDir, 'volunteers.json');
writeFileSync(volunteersPath, JSON.stringify({ 'MRS-01': 'key-1' }));

// routes.ts kendi volunteersFilePath'ini config.ts'ten türetir; test burada
// INTAKE_VOLUNTEERS_JSON ile o yolu bypass edip sabit bir fixture'a bağlar.
__resetVolunteersCacheForTesting();
process.env.INTAKE_VOLUNTEERS_JSON = JSON.stringify({ 'MRS-01': 'key-1' });
__resetIntakeDbForTesting(':memory:');

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

// ── POST /auth/verify ─────────────────────────────────────────────────────
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeRouter());

  await withServer(app, async (baseUrl) => {
    const ok = await fetch(`${baseUrl}/api/intake/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'MRS-01', key: 'key-1' }),
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ok: true, volunteerCode: 'MRS-01' });

    const wrongKey = await fetch(`${baseUrl}/api/intake/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'MRS-01', key: 'yanlis' }),
    });
    assert.equal(wrongKey.status, 401);

    // GET /auth/ping başlıklardan doğrular (gövdeden DEĞİL).
    const pingOk = await fetch(`${baseUrl}/api/intake/auth/ping`, {
      headers: { [VOLUNTEER_CODE_HEADER]: 'MRS-01', [VOLUNTEER_KEY_HEADER]: 'key-1' },
    });
    assert.equal(pingOk.status, 200);

    const pingMissingHeaders = await fetch(`${baseUrl}/api/intake/auth/ping`);
    assert.equal(pingMissingHeaders.status, 401);
  });
}

// ── GET /lookup ────────────────────────────────────────────────────────────
// Karar mantığının tüm dalları lookup.smoke.ts'te doğrulanıyor; burada
// yalnızca HTTP katmanı (auth zorunluluğu, durum kodları, gövde biçimi)
// test edilir.
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeRouter());
  const authHeaders = { [VOLUNTEER_CODE_HEADER]: 'MRS-01', [VOLUNTEER_KEY_HEADER]: 'key-1' };

  await withServer(app, async (baseUrl) => {
    const noAuth = await fetch(`${baseUrl}/api/intake/lookup?barcode=8690504000013`);
    assert.equal(noAuth.status, 401, 'lookup da kimlik doğrulama gerektirmeli');

    const missingBarcode = await fetch(`${baseUrl}/api/intake/lookup`, { headers: authHeaders });
    assert.equal(missingBarcode.status, 400);

    const invalidGtin = await fetch(`${baseUrl}/api/intake/lookup?barcode=1234567890123`, { headers: authHeaders });
    assert.equal(invalidGtin.status, 400);
    assert.equal(((await invalidGtin.json()) as { error: string }).error, 'invalid_gtin');

    // Katalogda ve toplama kayıtlarında olmayan geçerli bir GTIN → 'new'.
    const newProduct = await fetch(`${baseUrl}/api/intake/lookup?barcode=8690504000013`, { headers: authHeaders });
    assert.equal(newProduct.status, 200);
    const newBody = (await newProduct.json()) as { ok: boolean; status: string; neededSlots: string[] };
    assert.equal(newBody.ok, true);
    assert.equal(newBody.status, 'new');
    assert.deepEqual(newBody.neededSlots, ['front', 'ingredients', 'nutrition']);
  });
}

// ── /api/intake devre dışıyken her istek 503 dönmeli ─────────────────────
{
  const app = express();
  app.use(express.json());
  app.use('/api/intake', createIntakeUnavailableRouter('test: Node sürümü yetersiz'));

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/intake/auth/verify`, { method: 'POST' });
    assert.equal(response.status, 503);
    const body = (await response.json()) as { error: string };
    assert.equal(body.error, 'intake_unavailable');
  });
}

// ── requireAdminAuth: anahtar tanımsız → 503; yanlış → 401; doğru → 200 ──
{
  const app = express();
  app.get('/admin-only', requireAdminAuth, (_req, res) => res.json({ ok: true }));

  delete process.env.INTAKE_ADMIN_KEY;
  await withServer(app, async (baseUrl) => {
    const notConfigured = await fetch(`${baseUrl}/admin-only`);
    assert.equal(notConfigured.status, 503, 'INTAKE_ADMIN_KEY tanımsızken 503 dönmeli');
  });

  process.env.INTAKE_ADMIN_KEY = 'super-secret-admin';
  await withServer(app, async (baseUrl) => {
    const wrongKey = await fetch(`${baseUrl}/admin-only`, { headers: { [ADMIN_KEY_HEADER]: 'yanlis' } });
    assert.equal(wrongKey.status, 401);

    const rightKey = await fetch(`${baseUrl}/admin-only`, { headers: { [ADMIN_KEY_HEADER]: 'super-secret-admin' } });
    assert.equal(rightKey.status, 200);
  });
  delete process.env.INTAKE_ADMIN_KEY;
}

delete process.env.INTAKE_VOLUNTEERS_JSON;
rmSync(fixtureDir, { recursive: true, force: true });
console.log('INTAKE_ROUTES_AUTH_SMOKE_OK');
