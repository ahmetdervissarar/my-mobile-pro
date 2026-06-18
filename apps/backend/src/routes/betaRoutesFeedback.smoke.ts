import assert from 'node:assert/strict';

import express from 'express';

import { createBetaRouter } from './betaRoutes.js';

const app = express();

app.use(express.json());
app.use('/api/beta', createBetaRouter());

async function postFeedback(payload: unknown): Promise<Response> {
  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Test server address not available.');
    }

    return await fetch(`http://127.0.0.1:${address.port}/api/beta/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

const validResponse = await postFeedback({
  feedbackType: 'wrong_price',
  severity: 'medium',
  message: 'Wrong price',
  barcode: '8690000000000',
  productName: 'Milk 1 L',
  screen: 'product-result',
  rafScore: 87,
  productGroupKey: 'milk_1l',
  resolvedProductGroupKey: 'milk',
});

assert.equal(validResponse.status, 202);

const validJson = (await validResponse.json()) as {
  ok: boolean;
  accepted: boolean;
};

assert.deepEqual(validJson, {
  ok: true,
  accepted: true,
});

const invalidTypeResponse = await postFeedback({
  feedbackType: 'bad_type',
});

assert.equal(invalidTypeResponse.status, 400);

const invalidTypeJson = (await invalidTypeResponse.json()) as {
  ok: boolean;
  error: string;
};

assert.deepEqual(invalidTypeJson, {
  ok: false,
  error: 'invalid_feedback_type',
});

const invalidSeverityResponse = await postFeedback({
  feedbackType: 'wrong_score',
  severity: 'urgent',
});

assert.equal(invalidSeverityResponse.status, 400);

const invalidSeverityJson = (await invalidSeverityResponse.json()) as {
  ok: boolean;
  error: string;
};

assert.deepEqual(invalidSeverityJson, {
  ok: false,
  error: 'invalid_severity',
});

const tooLongResponse = await postFeedback({
  feedbackType: 'other',
  message: 'x'.repeat(1001),
});

assert.equal(tooLongResponse.status, 400);

const tooLongJson = (await tooLongResponse.json()) as {
  ok: boolean;
  error: string;
};

assert.deepEqual(tooLongJson, {
  ok: false,
  error: 'message_too_long',
});

console.log('BETA_ROUTES_FEEDBACK_SMOKE_OK');
