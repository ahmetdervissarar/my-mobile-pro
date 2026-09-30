/**
 * RafSkoru — Intake oran sınırlama sözleşmesi
 * apps/backend/src/intake/rateLimit.smoke.ts
 *
 * createRateLimiter'ı üretim eşiğinden (dakikada 30/10) BAĞIMSIZ, küçük
 * bir max ile test eder — üretim ayarı ileride değişirse bu test kırılmaz.
 */
import assert from 'node:assert/strict';

import type { Request, Response } from 'express';

import { createRateLimiter } from './rateLimit.js';

function fakeRequest(key: string): Request {
  return { ip: key, intakeVolunteerCode: undefined } as unknown as Request;
}

function fakeResponse(): { res: Response; statusCode: number | null; body: unknown } {
  const state = { statusCode: null as number | null, body: undefined as unknown };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(body: unknown) {
      state.body = body;
      return res;
    },
  } as unknown as Response;
  return { res, get statusCode() { return state.statusCode; }, get body() { return state.body; } } as unknown as {
    res: Response;
    statusCode: number | null;
    body: unknown;
  };
}

// ── Limit altında: hepsi next() çağırır, hiç 429 dönmez ──────────────────
{
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, keyFor: (req) => req.ip! });
  const req = fakeRequest('1.1.1.1');
  let nextCalls = 0;

  for (let i = 0; i < 3; i += 1) {
    const { res } = fakeResponse();
    limiter(req, res, () => {
      nextCalls += 1;
    });
  }

  assert.equal(nextCalls, 3, 'limit altındaki her istek next() çağırmalı');
}

// ── Limit aşılınca 429 döner, next() ÇAĞRILMAZ ────────────────────────────
{
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, keyFor: (req) => req.ip! });
  const req = fakeRequest('2.2.2.2');
  let nextCalls = 0;

  for (let i = 0; i < 2; i += 1) {
    limiter(req, fakeResponse().res, () => {
      nextCalls += 1;
    });
  }

  const blocked = fakeResponse();
  limiter(req, blocked.res, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 2, 'limiti aşan istek next() çağırmamalı');
  assert.equal(blocked.statusCode, 429);
  assert.equal((blocked.body as { error: string }).error, 'rate_limited');
}

// ── Anahtarlar birbirinden bağımsızdır (bir gönüllü/IP diğerini etkilemez) ─
{
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, keyFor: (req) => req.ip! });

  const first = fakeResponse();
  limiter(fakeRequest('3.3.3.3'), first.res, () => {});
  assert.notEqual(first.statusCode, 429);

  const second = fakeResponse();
  limiter(fakeRequest('4.4.4.4'), second.res, () => {});
  assert.notEqual(second.statusCode, 429, 'farklı anahtar kendi limitiyle başlamalı');

  const thirdSameAsFirst = fakeResponse();
  limiter(fakeRequest('3.3.3.3'), thirdSameAsFirst.res, () => {});
  assert.equal(thirdSameAsFirst.statusCode, 429, 'aynı anahtar limiti hâlâ aşılmış olmalı');
}

console.log('INTAKE_RATE_LIMIT_SMOKE_OK');
