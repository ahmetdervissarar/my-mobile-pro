import assert from 'node:assert/strict';

import express from 'express';

import type { PriceProviderService } from '../price/priceProviderService.js';
import { createPriceRouter } from './priceRoutes.js';

const capturedBetaQueryLogs: unknown[][] = [];
const originalConsoleInfo = console.info;
const previousEnableBetaQueryLogs = process.env.ENABLE_BETA_QUERY_LOGS;

console.info = (...args: unknown[]) => {
  if (args[0] === '[beta-query]') {
    capturedBetaQueryLogs.push(args);
  }
};

process.env.ENABLE_BETA_QUERY_LOGS = '1';

const fakeService = {
  async resolve() {
    return {
      result: {
        productName: 'Milk 1 L',
        barcode: '8690000000000',
        productGroupKey: 'milk_1l',
        resolvedProductGroupKey: 'milk',
        alternativesEligible: true,
        marketName: 'Demo Market',
        price: 45,
        currency: 'TRY',
        source: 'manual_beta',
        status: 'manual_beta',
        updatedAt: new Date().toISOString(),
        confidence: 0.9,
      },
      disclaimer: 'Test disclaimer',
      triedProviders: ['manual_beta', 'last_known'],
    };
  },
} as unknown as PriceProviderService;

const app = express();

app.use(express.json());
app.use('/api/price', createPriceRouter(fakeService));

async function request(path: string): Promise<Response> {
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

try {
  const resolveResponse = await request('/api/price/resolve?barcode=8690000000000&q=Milk%201%20L&lat=36.8&lng=34.6');

  assert.equal(resolveResponse.status, 200);

  const resolveLog = capturedBetaQueryLogs.at(-1);

  assert.ok(resolveLog);
  assert.equal(resolveLog[0], '[beta-query]');
  assert.equal(typeof resolveLog[1], 'string');

  const resolveEvent = JSON.parse(resolveLog[1] as string) as {
    eventType: string;
    outcome: string;
    query: {
      hasBarcode: boolean;
      barcodeHash?: string;
      barcodeLength?: number;
      hasProductName: boolean;
      productNameLength?: number;
      hasLocation: boolean;
    };
    result?: {
      status?: string;
      source?: string | null;
      resolvedProductGroupKey?: string | null;
      triedProviderCount?: number;
    };
  };

  assert.equal(resolveEvent.eventType, 'price_resolve');
  assert.equal(resolveEvent.outcome, 'resolved');
  assert.equal(resolveEvent.query.hasBarcode, true);
  assert.equal(resolveEvent.query.barcodeLength, 13);
  assert.equal(resolveEvent.query.barcodeHash?.length, 64);
  assert.notEqual(resolveEvent.query.barcodeHash, '8690000000000');
  assert.equal(resolveEvent.query.hasProductName, true);
  assert.equal(resolveEvent.query.productNameLength, 8);
  assert.equal(resolveEvent.query.hasLocation, true);
  assert.equal(resolveEvent.result?.status, 'manual_beta');
  assert.equal(resolveEvent.result?.source, 'manual_beta');
  assert.equal(resolveEvent.result?.resolvedProductGroupKey, 'milk');
  assert.equal(resolveEvent.result?.triedProviderCount, 2);

  const invalidAlternativesResponse = await request(
    '/api/price/alternatives?categoryKey=unknown&barcode=8690000000000&productName=Milk%201%20L',
  );

  assert.equal(invalidAlternativesResponse.status, 400);

  const alternativesLog = capturedBetaQueryLogs.at(-1);

  assert.ok(alternativesLog);
  assert.equal(alternativesLog[0], '[beta-query]');
  assert.equal(typeof alternativesLog[1], 'string');

  const alternativesEvent = JSON.parse(alternativesLog[1] as string) as {
    eventType: string;
    outcome: string;
    suppressionReason?: string;
    query: {
      hasBarcode: boolean;
      barcodeHash?: string;
      barcodeLength?: number;
      hasProductName: boolean;
      productNameLength?: number;
    };
    result?: {
      recommendationCount?: number;
    };
  };

  assert.equal(alternativesEvent.eventType, 'alternatives');
  assert.equal(alternativesEvent.outcome, 'invalid_request');
  assert.equal(alternativesEvent.suppressionReason, 'invalid_category');
  assert.equal(alternativesEvent.query.hasBarcode, true);
  assert.equal(alternativesEvent.query.barcodeLength, 13);
  assert.equal(alternativesEvent.query.barcodeHash?.length, 64);
  assert.notEqual(alternativesEvent.query.barcodeHash, '8690000000000');
  assert.equal(alternativesEvent.query.hasProductName, true);
  assert.equal(alternativesEvent.query.productNameLength, 8);
  assert.equal(alternativesEvent.result?.recommendationCount, 0);
} finally {
  console.info = originalConsoleInfo;

  if (previousEnableBetaQueryLogs === undefined) {
    delete process.env.ENABLE_BETA_QUERY_LOGS;
  } else {
    process.env.ENABLE_BETA_QUERY_LOGS = previousEnableBetaQueryLogs;
  }
}

console.log('PRICE_ROUTES_BETA_TELEMETRY_SMOKE_OK');
