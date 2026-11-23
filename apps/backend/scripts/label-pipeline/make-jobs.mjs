// RafSkoru — Etiket okuma iş listeleri (ADR-009 §15).
//
// Okuma sırası: önce Codex partideki bütün ürünleri okur (Okuma 2 dosyaları),
// sonra Claude yalnız Codex'in içerik bulduğu ürünleri okur (Okuma 1 dosyaları).
//
// Kullanım (apps/backend içinden):
//   node scripts/label-pipeline/make-jobs.mjs codex  <parti-klasörü> [barkod ...]
//   node scripts/label-pipeline/make-jobs.mjs claude <parti-klasörü>
//
// codex : data/label-store/codex-is.json yazılır. Barkod verilmezse partideki bütün
//         ürünler (Codex okuması henüz olmayanlar) alınır.
// claude: data/label-store/claude-is.json yazılır. Codex okumasında içindekiler VEYA
//         en az bir besin değeri olan, fotoğraftaki barkodu klasör barkoduyla
//         çelişmeyen ve henüz Okuma 1'i olmayan ürünler alınır.
// Codex sonuçları <parti>/reads-codex/<barkod>-2.json dosyalarına yazılır.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [mode, batchArg, ...only] = process.argv.slice(2);
if (!['codex', 'claude'].includes(mode) || !batchArg) {
  throw new Error('Kullanım: make-jobs.mjs codex|claude <parti-klasörü> [barkod ...]');
}
const batchDir = resolve(batchArg);
const storeDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/label-store');
const codexDir = join(batchDir, 'reads-codex');
mkdirSync(codexDir, { recursive: true });

const manifest = JSON.parse(readFileSync(join(batchDir, 'manifest.json'), 'utf8'));
const hasNumber = (n) => !!n && Object.entries(n).some(([k, v]) => k !== 'basis' && typeof v === 'number');
const products = [];
const skipped = [];

for (const entry of manifest) {
  const bc = entry.barcode;
  const photos = entry.photos.map((p) => p.localPath);
  if (mode === 'codex') {
    if (only.length > 0 && !only.includes(bc)) continue;
    if (existsSync(join(codexDir, `${bc}-2.json`))) { skipped.push(`${bc}: Codex okuması zaten var`); continue; }
    products.push({ barcode: bc, photos });
    continue;
  }
  const cPath = join(codexDir, `${bc}-2.json`);
  if (!existsSync(cPath)) { skipped.push(`${bc}: Codex okuması yok`); continue; }
  let c;
  try { c = JSON.parse(readFileSync(cPath, 'utf8')); } catch { skipped.push(`${bc}: Codex dosyası okunamadı`); continue; }
  const f = c.fields ?? {};
  if (!f.ingredientsText && !hasNumber(f.nutritionPer100)) { skipped.push(`${bc}: okunacak içerik yok`); continue; }
  if (c.barcodeDigits && !sameBarcode(c.barcodeDigits, bc)) { skipped.push(`${bc}: fotoğraftaki barkod farklı (${c.barcodeDigits})`); continue; }
  if (existsSync(join(batchDir, 'reads', `${bc}-1.json`))) { skipped.push(`${bc}: Okuma 1 zaten var`); continue; }
  products.push({ barcode: bc, photos });
}

// Baştaki sıfırlar yok sayılır: UPC-A (12 hane) ile aynı barkodun EAN-13 yazımı (başta 0) aynı üründür.
function sameBarcode(a, b) {
  const norm = (v) => String(v).replace(/D/g, '').replace(/^0+/, '');
  return norm(a) !== '' && norm(a) === norm(b);
}

const jobPath = join(storeDir, mode === 'codex' ? 'codex-is.json' : 'claude-is.json');
const job = { createdAt: new Date().toISOString(), batch: batchDir, outputDir: codexDir, products };
writeFileSync(jobPath, JSON.stringify(job, null, 2) + '\n', 'utf8');
console.log(`${jobPath} yazıldı: ${products.length} ürün`);
if (mode === 'claude' && manifest.length > 0) {
  console.log(`kullanılabilir oran: ${products.length}/${manifest.length} (%${Math.round((products.length / manifest.length) * 100)})`);
}
if (skipped.length) console.log('Alınmayanlar:\n  ' + skipped.join('\n  '));
