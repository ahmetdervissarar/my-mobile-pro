import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { ManualBetaPriceProvider } from './price/providers/manualBetaPriceProvider.js';
import { PriceProviderService } from './price/priceProviderService.js';
import { createPriceRouter } from './routes/priceRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

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

app.listen(PORT, () => {
  console.log(`RafSkoru backend running on http://localhost:${PORT}`);
});