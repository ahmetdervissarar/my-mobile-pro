// RafSkoru — İki okuması farklı adaylar için Codex "hakem" okuması (yalnız yardımcı bilgi).
//
// Kullanım (apps/backend içinden):
//   npx tsx scripts/label-pipeline/hakem.mts is     → data/label-store/codex-hakem-is.json
//   npx tsx scripts/label-pipeline/hakem.mts rapor  → data/label-store/hakem/onay-yardimi.md
//
// Hakem okuması depoya GİRMEZ ve hiçbir kararı değiştirmez. Rapor yalnız, ayrışan her
// alan için Codex'in hangi okumayla aynı okuduğunu gösterir; karar fotoğrafa bakan
// onaylayanındır.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const load = (p: string) => import(pathToFileURL(join(backendDir, p)).href);
const db = await load('src/labelStore/db.ts');
const cfg = await load('src/labelStore/config.ts');
const cmp = await load('src/labelStore/compareReads.ts');
db.initLabelStoreDb(cfg.getLabelStoreDbPath());

const dataDir = join(backendDir, 'data');
const storeDir = join(dataDir, 'label-store');
const outDir = join(storeDir, 'hakem');
mkdirSync(outDir, { recursive: true });

const mode = process.argv[2];
const candidates: any[] = db.listCandidatesByStatus('disagreed', 5000);

if (mode === 'is') {
  const products = [];
  for (const c of candidates) {
    if (existsSync(join(outDir, `${c.barcode}-3.json`))) continue;
    const photos = c.photos.map((p: any) => join(dataDir, p.ref));
    if (!photos.every((p: string) => existsSync(p))) { console.log(`atlandı (fotoğraf dosyası yok): ${c.barcode}`); continue; }
    products.push({ barcode: c.barcode, photos });
  }
  const job = { createdAt: new Date().toISOString(), outputDir: outDir, products };
  writeFileSync(join(storeDir, 'codex-hakem-is.json'), JSON.stringify(job, null, 2) + '\n', 'utf8');
  console.log(`codex-hakem-is.json yazıldı: ${products.length} ürün (iki okuması farklı aday: ${candidates.length})`);
} else if (mode === 'rapor') {
  const asRead = (fields: any, unreadable: string[] = []) => ({ reader: 'x', model: 'x', readAt: '', fields, unreadableFields: unreadable });
  const get = (fields: any, key: string) => {
    if (key.startsWith('nutritionPer100.')) return fields?.nutritionPer100?.[key.slice(16)] ?? null;
    return fields?.[key] ?? null;
  };
  const show = (v: unknown) => {
    if (v === null || v === undefined) return '(boş)';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  };
  const lines: string[] = [];
  let done = 0, missing = 0, allResolved = 0;
  for (const c of candidates) {
    const p = join(outDir, `${c.barcode}-3.json`);
    if (!existsSync(p)) { missing += 1; continue; }
    let h: any;
    try { h = JSON.parse(readFileSync(p, 'utf8')); } catch { lines.push(`### ${c.barcode}\n- Codex dosyası okunamadı.\n`); continue; }
    if (!h?.fields || h._reader !== 'codex') { lines.push(`### ${c.barcode}\n- Codex dosyasının biçimi geçersiz.\n`); continue; }
    done += 1;
    const r1 = c.extractRead.fields, r2 = c.verifyRead.fields;
    const d1: string[] = cmp.compareLabelReads(asRead(r1), asRead(h.fields));
    const d2: string[] = cmp.compareLabelReads(asRead(r2), asRead(h.fields));
    const name = r1.productName ?? r2.productName ?? h.fields.productName ?? '(ad okunmadı)';
    const out: string[] = [];
    let resolved = 0;
    for (const f of c.differingFields ?? []) {
      const same1 = !d1.includes(f), same2 = !d2.includes(f);
      let verdict: string;
      if (same1 && !same2) { verdict = '**Okuma 1 ile aynı**'; resolved += 1; }
      else if (same2 && !same1) { verdict = '**Okuma 2 ile aynı**'; resolved += 1; }
      else if (!same1 && !same2) verdict = 'ikisinden de farklı → fotoğrafa bak';
      else verdict = 'ikisiyle de aynı sayıldı (yalnız yazım farkı)';
      out.push(`- \`${f}\`: ${verdict}\n  - Okuma 1: ${show(get(r1, f))}\n  - Okuma 2: ${show(get(r2, f))}\n  - Codex: ${show(get(h.fields, f))}`);
    }
    if (resolved === (c.differingFields ?? []).length) allResolved += 1;
    lines.push(`### ${c.barcode} — ${name}\n${out.join('\n')}${h.notes ? `\n- Codex notu: ${show(h.notes)}` : ''}\n`);
  }
  const head = [
    '# Onay yardımı — Codex hakem okuması',
    '',
    `Oluşturuldu: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    '',
    'Bu liste yalnız yardımcı bilgidir; depoya hiçbir şey yazılmadı. Her ayrışan alan için',
    "Codex'in hangi okumayla aynı okuduğu gösterilir. Karar yine fotoğrafa bakılarak verilir;",
    'özellikle içindekiler ve alerjen/eser cümlelerinde fotoğrafı mutlaka kontrol et.',
    '',
    `- İki okuması farklı aday: ${candidates.length}`,
    `- Codex hakem okuması olan: ${done} (eksik: ${missing})`,
    `- Bütün farkları Codex'in bir okumayla eşleştiği aday: ${allResolved}`,
    '',
  ];
  writeFileSync(join(outDir, 'onay-yardimi.md'), head.concat(lines).join('\n') + '\n', 'utf8');
  console.log(`onay-yardimi.md yazıldı: ${done} aday (eksik ${missing}, tamamen eşleşen ${allResolved})`);
} else {
  console.error('Kullanım: hakem.mts is|rapor');
  process.exit(2);
}
