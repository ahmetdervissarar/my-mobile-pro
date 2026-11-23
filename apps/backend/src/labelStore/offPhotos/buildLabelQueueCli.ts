/**
 * RafSkoru — OFF dökümünden etiket okuma kuyruğu (ADR-009 §16)
 * apps/backend/src/labelStore/offPhotos/buildLabelQueueCli.ts
 *
 * Kullanım:
 *   npm run label:queue-from-dump -- --dump=<openfoodfacts-products.jsonl.gz yolu>
 *
 * Ne yapar: OFF'un resmî toplu dökümünü bir kez baştan sona okur; arama servisiyle
 * aynı süzgeçten geçen ürünleri (Türkiye, içindekiler fotoğrafı seçili, metni
 * tamamlanmamış) barkod sırasıyla data/label-store/off/kuyruk.json'a yazar.
 * Ağ çağrısı YAPMAZ; fotoğraf indirmez; depoya yazmaz. Fotoğraflar sonra
 * `label:fetch-off -- --queue` ile parti parti indirilir.
 *
 * Döküm yarım/bozuksa açık hata verir ve var olan kuyruğa dokunmaz.
 */
import { createReadStream, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';

import { isValidGtin } from '../../tools/offTurkey/normalize.js';
import { isOffLabelQueueCandidate, toOffQueueProduct, type OffSearchProduct } from './offLabelPhotos.js';

const OFF_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../data/label-store/off');

async function main(): Promise<void> {
  const dump = process.argv.find((arg) => arg.startsWith('--dump='))?.slice(7);
  if (!dump) {
    console.error('Kullanım: npm run label:queue-from-dump -- --dump=<openfoodfacts-products.jsonl.gz>');
    process.exit(2);
  }

  const failure: { error: Error | null } = { error: null };
  const source = createReadStream(dump);
  const gunzip = createGunzip();
  const rl = createInterface({ input: source.pipe(gunzip), crlfDelay: Infinity });
  const onError = (e: Error) => { failure.error ??= e; rl.close(); };
  source.on('error', onError);
  gunzip.on('error', onError);

  const products = new Map<string, OffSearchProduct>();
  try {
    for await (const line of rl) {
      if (failure.error) break;
      if (!line.includes('en:turkey')) continue; // hızlı ön eleme
      let raw: Record<string, unknown>;
      try { raw = JSON.parse(line) as Record<string, unknown>; } catch { continue; }
      if (!isOffLabelQueueCandidate(raw)) continue;
      const code = typeof raw.code === 'string' ? raw.code : '';
      if (!isValidGtin(code) || products.has(code)) continue;
      products.set(code, toOffQueueProduct(raw));
    }
  } catch (e) {
    failure.error ??= e as Error;
  }
  if (failure.error) {
    console.error(`DUR: döküm sonuna kadar okunamadı (yarım inmiş veya bozuk olabilir): ${failure.error.message}`);
    process.exit(1);
  }

  const sorted = [...products.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
  mkdirSync(OFF_DIR, { recursive: true });
  const outPath = join(OFF_DIR, 'kuyruk.json');
  const staging = `${outPath}.incoming`;
  writeFileSync(staging, JSON.stringify({
    createdAt: new Date().toISOString(),
    dumpModifiedAt: statSync(dump).mtime.toISOString(),
    count: sorted.length,
    products: sorted,
  }) + '\n', 'utf8');
  renameSync(staging, outPath);
  console.log(`Bitti: ${sorted.length} ürün kuyruğa yazıldı. Kuyruk: ${outPath}`);
}

void main().catch((err) => {
  console.error(`HATA: ${(err as Error).message}`);
  process.exit(1);
});
