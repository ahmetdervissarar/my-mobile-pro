/**
 * RafSkoru — OFF etiket fotoğraflarını indirir (İş 1.4c)
 * apps/backend/src/labelStore/offPhotos/fetchOffLabelPhotosCli.ts
 *
 * Kullanım:
 *   npm run label:fetch-off -- --contact=<proje e-postası> [--limit=50] [--page=1]
 *
 * Ne yapar:
 *   1. OFF aramasına TEK istek: Türkiye'de içindekiler fotoğrafı seçili ama
 *      içindekiler metni tamamlanmamış ürünler (en fazla --limit kadar; OFF
 *      listesi barkoda göre sıralı, --page ile sonraki partiye geçilir).
 *   1b. Atlananlar: depoda zaten adayı olan barkodlar ve OFF kategorisine göre
 *      düz su (isOffPlainWater; ad kullanılmaz).
 *   2. Her ürünün seçili içindekiler ve besin tablosu fotoğraflarını tam boy
 *      olarak BİRER BİRER, aralarında bekleyerek indirir.
 *   3. data/label-store/off/<tarih>-p<sayfa>/ altına fotoğrafları ve manifest.json'u
 *      yazar (git dışında). Depoya hiçbir şey yazmaz, okuma yapmaz.
 *
 * Durma kuralı: OFF'tan herhangi bir hata (4xx/5xx, beklenmeyen içerik) gelirse
 * durur, o ana kadar indirileni manifest'e yazar ve hata koduyla çıkar;
 * yeniden denemeyi zorlamaz.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isValidGtin } from '../../tools/offTurkey/normalize.js';
import { getLabelStoreDbPath } from '../config.js';
import { initLabelStoreDb, listCandidatesForBarcode } from '../db.js';
import {
  buildOffLabelSearchUrl,
  buildOffUserAgent,
  extractSelectedPhotos,
  isOffPlainWater,
  localPhotoFileName,
  observedAtFor,
  offPhotoAttribution,
  offProductUrl,
  type OffSearchProduct,
} from './offLabelPhotos.js';

const DOWNLOAD_DELAY_MS = 1500;
const DATA_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../data');

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

function argValue(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
}

interface ManifestEntry {
  barcode: string;
  productName: string | null;
  brands: string | null;
  sourceUrl: string;
  observedAt: string | null;
  photoSource: 'off_photo';
  photos: { slot: string; ref: string; attribution: string; sourceUrl: string; localPath: string }[];
}

async function main(): Promise<void> {
  const contact = argValue('contact');
  if (!contact) {
    console.error('Kullanım: npm run label:fetch-off -- --contact=<proje e-postası> [--limit=50] [--page=1]');
    process.exit(2);
  }
  const userAgent = buildOffUserAgent(contact);
  const limit = Math.min(Math.max(Number(argValue('limit') ?? 50) || 50, 1), 100);
  const page = Math.max(Math.floor(Number(argValue('page') ?? 1)) || 1, 1);
  initLabelStoreDb(getLabelStoreDbPath());

  const batchDir = join(DATA_DIR, 'label-store', 'off', `${new Date().toISOString().slice(0, 10)}-p${page}`);
  mkdirSync(batchDir, { recursive: true });
  const manifestPath = join(batchDir, 'manifest.json');
  const manifest: ManifestEntry[] = [];
  const writeManifest = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // 1) Tek arama isteği.
  const searchUrl = buildOffLabelSearchUrl(limit, page);
  const searchResponse = await fetch(searchUrl, { headers: { 'User-Agent': userAgent } });
  if (!searchResponse.ok) {
    console.error(`DUR: OFF araması HTTP ${searchResponse.status} döndürdü.`);
    process.exit(1);
  }
  const body = (await searchResponse.json()) as { count?: number; products?: OffSearchProduct[] };
  const products = Array.isArray(body.products) ? body.products : [];
  console.log(`Arama: OFF toplam ${body.count ?? '?'} ürün bildirdi; sayfa ${page}, bu partide ${products.length} ürün.`);

  // 2) Fotoğraflar birer birer.
  let downloaded = 0;
  let skipped = 0;
  let skippedWater = 0;
  let skippedKnown = 0;
  for (const product of products) {
    const barcode = typeof product.code === 'string' ? product.code : '';
    if (!isValidGtin(barcode)) {
      skipped += 1;
      continue;
    }
    if (listCandidatesForBarcode(barcode).length > 0) {
      skippedKnown += 1;
      continue;
    }
    if (isOffPlainWater(product)) {
      skippedWater += 1;
      continue;
    }
    const photos = extractSelectedPhotos(product);
    if (!photos.some((photo) => photo.slot === 'ingredients')) {
      skipped += 1;
      continue;
    }

    const productDir = join(batchDir, barcode);
    mkdirSync(productDir, { recursive: true });
    const entry: ManifestEntry = {
      barcode,
      productName: typeof product.product_name === 'string' && product.product_name.trim() ? product.product_name.trim() : null,
      brands: typeof product.brands === 'string' && product.brands.trim() ? product.brands.trim() : null,
      sourceUrl: offProductUrl(barcode),
      observedAt: observedAtFor(photos, product.last_modified_t),
      photoSource: 'off_photo',
      photos: [],
    };

    for (const photo of photos) {
      const localPath = join(productDir, localPhotoFileName(photo));
      if (!existsSync(localPath)) {
        await sleep(DOWNLOAD_DELAY_MS);
        const response = await fetch(photo.url, { headers: { 'User-Agent': userAgent } });
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok || !contentType.startsWith('image/')) {
          writeManifest();
          console.error(`DUR: ${photo.url} → HTTP ${response.status} (${contentType}). ${downloaded} fotoğraf indirilmişti.`);
          process.exit(1);
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length === 0) {
          writeManifest();
          console.error(`DUR: ${photo.url} boş içerik döndürdü.`);
          process.exit(1);
        }
        writeFileSync(localPath, bytes);
        downloaded += 1;
      }
      entry.photos.push({
        slot: photo.slot,
        ref: relative(DATA_DIR, localPath).split('\\').join('/'),
        attribution: offPhotoAttribution(barcode),
        sourceUrl: photo.url,
        localPath,
      });
    }

    manifest.push(entry);
    writeManifest();
  }

  writeManifest();
  console.log(`Bitti: ${manifest.length} ürün, ${downloaded} fotoğraf indirildi, ${skipped} ürün fotoğrafsız/geçersiz, ${skippedKnown} ürünün zaten adayı var, ${skippedWater} düz su atlandı. Manifest: ${manifestPath}`);
}

void main().catch((err) => {
  console.error(`HATA: ${(err as Error).message}`);
  process.exit(1);
});
