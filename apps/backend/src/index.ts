import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCatalog, loadCatalog } from './catalog/catalog.js';
import { createHttpsEnforcementMiddleware } from './httpsEnforcement.js';
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

// Katalog boşsa (products.jsonl temiz sunucuya hiç kopyalanmadıysa veya
// bozuksa) uygulama SESSİZCE canlı OFF yoluna düşüyordu — açılışta loadCatalog
// zaten bir satır uyarı basıyor ama bu, günlüklerde kolayca kaybolan tek bir
// satırdı. Burada aynı durumu AYRICA yüksek görünürlükte tekrarlıyoruz;
// çalıştırma talimatı için bkz. README.md "Katalog verisini sunucuya taşıma"
// (bkz. görev onayı, madde 5c).
if (getCatalog().products.length === 0) {
  console.warn('='.repeat(72));
  console.warn('[catalog] UYARI: katalog BOŞ — hiçbir ürün yüklenmedi.');
  console.warn(`[catalog] Beklenen dosya: ${catalogPath}`);
  console.warn('[catalog] Bu dosya repoya commit edilmez (ODbL lisans yükümlülüğü —');
  console.warn('[catalog] bkz. README.md "Katalog verisini sunucuya taşıma"); sunucuya');
  console.warn('[catalog] ELLE kopyalanmalıdır. Kopyalanana kadar /api/price/resolve');
  console.warn('[catalog] canlı OpenFoodFacts sorgusuna düşer ve yanıtında');
  console.warn('[catalog] catalogStatus.empty=true döner.');
  console.warn('='.repeat(72));
}

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

// Üretimde HTTPS zorunlu — Intake modülü gönüllü anahtarını ve ürün
// fotoğraflarını taşır, düz HTTP'de bunlar şifresiz dolaşır (bkz. görev
// onayı, madde 4c). Yerel/dev ortamda (NODE_ENV !== 'production') HTTP
// kalabilir. 'trust proxy' olmadan X-Forwarded-Proto rastgele istemcilerce
// taklit edilebilir — ters vekil (nginx/Caddy) arkasında çalışıldığı kabul
// edilir.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  app.use(createHttpsEnforcementMiddleware());
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
    // Katalog boş başlarsa (products.jsonl eksik) uygulama sessizce canlı
    // OFF'a düşer — bunu /health'te açıkça görünür kılar (bkz. görev onayı,
    // madde 5b).
    catalogProductCount: getCatalog().products.length,
  });
});

app.use('/api/price', createPriceRouter(priceService));
app.use('/api/search', createSearchRouter());
app.use('/api/basket', createBasketRouter());
app.use('/api/beta', createBetaRouter());
app.use('/api/intake', intakeRouter);

// Gönüllü ürün toplama sayfası (apps/intake/) — sade HTML+vanilla JS,
// backend tarafından statik olarak sunulur (bkz. görev planı, YERLEŞİM).
const intakeWebDir = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../intake');
app.use('/intake', express.static(intakeWebDir));

app.listen(PORT, () => {
  console.log(`RafSkoru backend running on http://localhost:${PORT}`);
});