// OFF Türkiye ürünlerini JSONL'e aktarır. Veritabanına yazmaz; üretim yoluna bağlı değildir.
// Kullanım:
//   npm run import:off-tr                          (API, sayfalı, ~15 dk)
//   npm run import:off-tr -- --dump=/yol/openfoodfacts-products.jsonl.gz   (tam döküm, önerilen)
// Çıktı: apps/backend/data/off-tr/products.jsonl + report.json (git'e eklenmez)
import { createReadStream, createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OFF_FIELDS, normalizeOffProduct, type OffImportRecord } from './normalize.js';

const USER_AGENT = 'RafSkoru/0.2 (arastirma pilotu; iletisim: ahmetdervissarar@gmail.com)';
const SEARCH_DELAY_MS = 6500; // OFF arama uç noktası: dakikada en fazla 10 istek
const PAGE_SIZE = 100;
const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../data/off-tr');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function* fromApi(): AsyncGenerator<Record<string, unknown>> {
  // 10.000 sonuç sınırına takılmamak için Nutri-Score sınıfına göre bölünmüş sorgular.
  const partitions = ['a', 'b', 'c', 'd', 'e', 'unknown', 'not-applicable'];
  for (const grade of partitions) {
    for (let page = 1; ; page++) {
      const url = `https://world.openfoodfacts.org/api/v2/search?countries_tags=en:turkey&nutrition_grades_tags=${grade}` +
        `&fields=${OFF_FIELDS}&page_size=${PAGE_SIZE}&page=${page}&sort_by=code`;
      let body: { count?: number; products?: Record<string, unknown>[] } | null = null;
      for (let attempt = 1; attempt <= 3 && !body; attempt++) {
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        if (res.ok) body = await res.json();
        else { console.warn(`HTTP ${res.status} (${grade} s.${page}) deneme ${attempt}`); await sleep(SEARCH_DELAY_MS * attempt * 2); }
      }
      if (!body) throw new Error(`Sayfa alınamadı: ${grade} s.${page}`);
      const products = body.products ?? [];
      if (page === 1) console.log(`Nutri-Score ${grade}: ${body.count ?? '?'} ürün`);
      for (const p of products) yield p;
      await sleep(SEARCH_DELAY_MS);
      if (products.length < PAGE_SIZE) break;
    }
  }
}

async function* fromDump(path: string): AsyncGenerator<Record<string, unknown>> {
  const rl = createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('en:turkey')) continue; // hızlı ön eleme
    try {
      const p = JSON.parse(line) as Record<string, unknown>;
      if (Array.isArray(p.countries_tags) && p.countries_tags.includes('en:turkey')) yield p;
    } catch { /* bozuk satır atlanır */ }
  }
}

async function main() {
  const dumpArg = process.argv.find((a) => a.startsWith('--dump='))?.slice(7);
  const fetchedAt = new Date().toISOString();
  mkdirSync(OUT_DIR, { recursive: true });
  const out = createWriteStream(resolve(OUT_DIR, 'products.jsonl'));
  const seen = new Set<string>();
  const stats = { source: dumpArg ? 'dump' : 'api', fetchedAt, raw: 0, invalidGtin: 0, duplicates: 0, written: 0,
    completeness: {} as Record<string, number>, allergenStatus: {} as Record<string, number>,
    withTurkishIngredients: 0, withNutriScore: 0, withNova: 0, withImage: 0 };
  const inc = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };

  for await (const raw of dumpArg ? fromDump(dumpArg) : fromApi()) {
    stats.raw++;
    const rec: OffImportRecord | null = normalizeOffProduct(raw, fetchedAt);
    if (!rec) { stats.invalidGtin++; continue; }
    if (seen.has(rec.gtin)) { stats.duplicates++; continue; }
    seen.add(rec.gtin);
    out.write(JSON.stringify(rec) + '\n');
    stats.written++;
    inc(stats.completeness, rec.completeness);
    inc(stats.allergenStatus, rec.allergens.dataStatus);
    if (rec.ingredientsLang === 'tr') stats.withTurkishIngredients++;
    if (rec.nutriscoreGrade) stats.withNutriScore++;
    if (rec.novaGroup) stats.withNova++;
    if (rec.imageUrl) stats.withImage++;
    if (stats.written % 1000 === 0) console.log(`${stats.written} kayıt yazıldı`);
  }
  out.end();
  writeFileSync(resolve(OUT_DIR, 'report.json'), JSON.stringify(stats, null, 2));
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
