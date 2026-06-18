import assert from 'node:assert/strict';

import express from 'express';

import { createSearchRouter } from './searchRoutes.js';

const app = express();
app.use(express.json());
app.use('/api/search', createSearchRouter());

async function get(path: string): Promise<Response> {
  const server = app.listen(0);

  try {
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Test server address not available.');
    }

    return await fetch(`http://127.0.0.1:${address.port}${path}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

const response = await get('/api/search/suggest?q=pir');
assert.equal(response.status, 200);

const json = (await response.json()) as {
  ok: boolean;
  query: string;
  suggestions: Array<{ type: string; label: string; productGroupKey: string }>;
};

assert.equal(json.ok, true);
assert.equal(json.query, 'pir');
assert.equal(json.suggestions[0]?.type, 'product_group');
assert.equal(json.suggestions[0]?.label, 'Pirinç');
assert.equal(json.suggestions[0]?.productGroupKey, 'rice');

const shortResponse = await get('/api/search/suggest?q=p');
assert.equal(shortResponse.status, 200);

const shortJson = (await shortResponse.json()) as {
  ok: boolean;
  query: string;
  suggestions: unknown[];
};

assert.equal(shortJson.ok, true);
assert.equal(shortJson.query, 'p');
assert.deepEqual(shortJson.suggestions, []);

console.log('SEARCH_ROUTES_SUGGESTIONS_SMOKE_OK');
