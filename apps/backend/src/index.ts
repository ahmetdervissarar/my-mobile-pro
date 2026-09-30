import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadCatalog } from './catalog/catalog.js';
import { getIntakeDbPath } from './intake/config.js';
import { initIntakeDb } from './intake/db.js';
import { createIntakeRouter, createIntakeUnavailableRouter } from './intake/routes.js';
import { ManualBetaPriceProvider } from './price/providers/manualBetaPriceProvider.js';
import { PriceProviderService } from './price/priceProviderService.js';
import { createPriceRouter } from './routes/priceRoutes.js';
import { createSearchRouter } from './routes/searchRoutes.js';
import { createBasketRouter } from './routes/basketRoutes.js';
import { createBetaRouter } from './routes/betaRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const catalogPath = resolve(fileURLToPath(new URL('.', import.meta.url)), '../data/off-tr/products.jsonl');
loadCatalog(catalogPath);

// Intake (gönüllü ürün toplama) modülü node:sqlite gerektirir — bu isteğe
// bağlı bir alt sistemdir, başarısız olursa ANA backend (price/search/basket)
// ayakta kalmaya devam eder; yalnızca /api/intake/* 503 döner.
let intakeRouter;
try {
  initIntakeDb(getIntakeDbPath());
  console.log('[intake] veritabanı hazır.');
  intakeRouter = createIntakeRouter();
} catch (err) {
  console.error(`[intake] devre dışı: ${(err as Error).message}`);
  intakeRouter = createIntakeUnavailableRouter((err as Error).message);
}

app.use(cors());
app.use(express.json());

const manualBeta = new ManualBetaPriceProvider({
  persistPath: process.env.MANUAL_PRICES_PATH ?? './data/manual-prices.json',
});

const priceService = new PriceProviderService({
  manualBeta,
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'rafskoru-backend',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/price', createPriceRouter(priceService));
app.use('/api/search', createSearchRouter());
app.use('/api/basket', createBasketRouter());
app.use('/api/beta', createBetaRouter());
app.use('/api/intake', intakeRouter);

app.listen(PORT, () => {
  console.log(`RafSkoru backend running on http://localhost:${PORT}`);
});