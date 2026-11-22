// Codex okumalarını aynı ürünün önceki iki okumasıyla karşılaştırır (deneme için).
// Kullanım (apps/backend içinden): npx tsx scripts/label-pipeline/compare-codex.mts <parti-klasörü>
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const batchDir = process.argv[2];
const cmp = await import(pathToFileURL(resolve(process.cwd(), 'src/labelStore/compareReads.ts')).href);
const asRead = (o: any) => ({ reader: 'x', model: 'x', readAt: '', fields: o.fields, unreadableFields: o.unreadableFields ?? [] });
const dir = join(batchDir, 'reads-codex');
for (const f of readdirSync(dir).filter((n) => n.endsWith('-2.json'))) {
  const bc = f.replace('-2.json', '');
  const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  const out: string[] = [`model=${c._model}`];
  for (const n of [1, 2]) {
    const p = join(batchDir, 'reads', `${bc}-${n}.json`);
    if (!existsSync(p)) continue;
    const d = cmp.compareLabelReads(asRead(JSON.parse(readFileSync(p, 'utf8'))), asRead(c));
    out.push(`önceki${n}↔codex: ${d.length ? d.join(',') : 'AYNI'}`);
  }
  console.log(`${bc} | ${out.join(' | ')}`);
}
