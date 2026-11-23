/**
 * RafSkoru — OFF etiket fotoğraflarını indirir (İş 1.4c)
 * apps/backend/src/labelStore/offPhotos/fetchOffLabelPhotosCli.ts
 *
 * Kullanım:
 *   npm run label:fetch-off -- --contact=<proje e-postası> [--limit=50] [--page=1]
 *   npm run label:fetch-off -- --contact=<proje e-postası> --queue [--limit=50] [--page=1]
 *
 * --queue (ADR-009 §16): ürün listesi OFF arama servisinden DEĞİL, dökümden üretilmiş
 *   data/label-store/off/kuyruk.json dosyasından alınır (label:queue-from-dump). Daha önce
 *   herhangi bir partide indirilmiş veya depoda adayı olan barkodlar atlanır; sıradaki
 *   --limit kadar fotoğraflı ürün seçilir. Klasör adı <tarih>-k<sayfa> olur. Arama isteği yoktur;
 *   yalnız fotoğraflar indirilir.
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
import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, writeFileSync } from 'node:fs';
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

/** Daha önceki partilerin manifest'lerinde geçen barkodlar. */
function downloadedBarcodes(offDir: string): Set<string> {
  const done = new Set<string>();
  if (!existsSync(offDir)) return done;
  for (const entry of readdirSync(offDir, { withFileTypes: true })) {
    const manifestPath = join(offDir, entry.name, 'manifest.json');
    if (!entry.isDirectory() || !existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { barcode?: unknown }[];
      for (const item of manifest) if (typeof item.barcode === 'string') done.add(item.barcode);
    } catch {
      console.error(`DUR: ${manifestPath} okunamadı; aynı ürünleri yeniden indirmemek için durduruldu.`);
      process.exit(1);
    }
  }
  return done;
}

/**
 * Kuyruktan sıradaki ürünler: indirilmemiş, depoda adayı olmayan, düz su olmayan ve
 * içindekiler fotoğrafı adresi kurulabilen ilk `limit` ürün (barkod sırasıyla).
 */
function selectFromQueue(offDir: string, limit: number): OffSearchProduct[] {
  const queuePath = join(offDir, 'kuyruk.json');
  if (!existsSync(queuePath)) {
    console.error(`DUR: ${queuePath} yok; önce label:queue-from-dump çalıştırılmalı.`);
    process.exit(1);
  }
  const queue = JSON.parse(readFileSync(queuePath, 'utf8')) as { products?: OffSearchProduct[] };
  const done = downloadedBarcodes(offDir);
  const picked: OffSearchProduct[] = [];
  for (const product of queue.products ?? []) {
    const barcode = typeof product.code === 'string' ? product.code : '';
    if (!isValidGtin(barcode) || done.has(barcode)) continue;
    if (listCandidatesForBarcode(barcode).length > 0 || isOffPlainWater(product)) continue;
    if (!extractSelectedPhotos(product).some((photo) => photo.slot === 'ingredients')) continue;
    picked.push(product);
    if (picked.length >= limit) break;
  }
  return picked;
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

  const queueMode = process.argv.includes('--queue');
  const offDir = join(DATA_DIR, 'label-store', 'off');
  const batchDir = join(offDir, `${new Date().toISOString().slice(0, 10)}-${queueMode ? 'k' : 'p'}${page}`);
  mkdirSync(batchDir, { recursive: true });
  const manifestPath = join(batchDir, 'manifest.json');
  const manifest: ManifestEntry[] = [];
  const writeManifest = () => writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // 1) Ürün listesi: kuyruk dosyası ya da tek arama isteği.
  let products: OffSearchProduct[];
  if (queueMode) {
    products = selectFromQueue(offDir, limit);
    console.log(`Kuyruk: bu partide ${products.length} ürün (sayfa ${page}).`);
    if (products.length === 0) {
      if (readdirSync(batchDir).length === 0) rmdirSync(batchDir); // yalnız boş klasör; dolu klasöre dokunulmaz
      console.error('DUR: kuyrukta indirilecek ürün kalmadı. Yeni döküm gelince kuyruk yeniden üretilmeli.');
      process.exit(1);
    }
  } else {
    const searchUrl = buildOffLabelSearchUrl(limit, page);
    const searchResponse = await fetch(searchUrl, { headers: { 'User-Agent': userAgent } });
    if (!searchResponse.ok) {
      console.error(`DUR: OFF araması HTTP ${searchResponse.status} döndürdü.`);
      process.exit(1);
    }
    const body = (await searchResponse.json()) as { count?: number; products?: OffSearchProduct[] };
    products = Array.isArray(body.products) ? body.products : [];
    console.log(`Arama: OFF toplam ${body.count ?? '?'} ürün bildirdi; sayfa ${page}, bu partide ${products.length} ürün.`);
  }

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
