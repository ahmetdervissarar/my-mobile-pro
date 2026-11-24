// RafSkoru — Ekrandan onay listesi (yerel, yalnız okuma). Depodaki bekleyen adayları teyit listesiyle
// karşılaştırır, data/label-store/onay-listesi.md dosyasına gruplu liste yazar. Depoya yazmaz, onay vermez.
// Kullanım (apps/backend içinden): npx tsx scripts/label-pipeline/onay-listesi.mts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const b = process.cwd();
const db = await import(pathToFileURL(b + '/src/labelStore/db.ts').href);
const cfg = await import(pathToFileURL(b + '/src/labelStore/config.ts').href);
const cmp = await import(pathToFileURL(b + '/src/labelStore/compareReads.ts').href);
db.initLabelStoreDb(cfg.getLabelStoreDbPath());
const store = join(b, 'data/label-store');

const teyit = readFileSync(join(store, 'teyit-listesi.md'), 'utf8');
const inTeyit = (bc: string) => new RegExp(`\\|\\s*${bc}\\s*\\|`).test(teyit);

const NON_FOOD = new Set(['0503466654003', '0744504668259', '3574661526065', '3574660533538', '2050002855472', '3600524172275',
  '0603084071487', '4006000165325', '4335619202269', '4305615549279', '7004712664904', '8606014106312', '8681511098865', '8682214730984', '8682241201440', '8682241221295', '8682276605558', '8682276607170', '8682773091038']);
const DECISION = new Map<string, string>();
const SAFETY = ['ingredientsText', 'allergenStatementText', 'traceStatementText'];

const cands: any[] = [...db.listCandidatesByStatus('agreed', 5000), ...db.listCandidatesByStatus('disagreed', 5000)];
const name = (c: any) => {
  const f1 = c.extractRead.fields, f2 = c.verifyRead.fields;
  const n = f1.productName ?? f2.productName ?? '(ad okunmadı)';
  const br = f1.brand ?? f2.brand;
  return (br ? `${br} — ` : '') + String(n).replace(/\|/g, '/').slice(0, 70);
};
const asRead = (fields: any) => ({ reader: 'x', model: 'x', readAt: '', fields, unreadableFields: [] });
const hakemHint = (c: any) => {
  const p = join(store, 'hakem', `${c.barcode}-3.json`);
  if (!existsSync(p)) return '';
  try {
    const h = JSON.parse(readFileSync(p, 'utf8'));
    const d1: string[] = cmp.compareLabelReads(asRead(c.extractRead.fields), asRead(h.fields));
    const d2: string[] = cmp.compareLabelReads(asRead(c.verifyRead.fields), asRead(h.fields));
    const parts = (c.differingFields ?? []).map((f: string) => {
      const s1 = !d1.includes(f), s2 = !d2.includes(f);
      return `${f}: ${s1 && !s2 ? 'Okuma 1' : s2 && !s1 ? 'Okuma 2' : '?'}`;
    });
    return parts.length ? ` (hakem: ${parts.join(', ')})` : '';
  } catch { return ''; }
};
const label: Record<string, string> = {
  productName: 'ad', brand: 'marka', quantityText: 'miktar', ingredientsText: 'içindekiler', ingredientsLang: 'dil',
  allergenStatementText: 'alerjen cümlesi', traceStatementText: 'eser cümlesi', nutritionPer100: 'besin tablosu',
};
const fl = (f: string) => label[f] ?? (f.startsWith('nutritionPer100.') ? `besin: ${f.slice(16)}` : f);

const groups: Record<string, string[]> = { A: [], B: [], C: [], D: [], E: [], F: [] };
let skippedTeyit = 0, skippedNoIng = 0;
for (const c of cands.sort((x, y) => x.barcode.localeCompare(y.barcode))) {
  if (inTeyit(c.barcode)) { skippedTeyit++; continue; }
  const diff: string[] = c.differingFields ?? [];
  const ing1 = c.extractRead.fields.ingredientsText, ing2 = c.verifyRead.fields.ingredientsText;
  const row = (extra = '') => `| ☐ | ${c.barcode} | ${name(c)} | ${extra} |`;
  if (NON_FOOD.has(c.barcode)) { groups.E.push(row(c.status === 'agreed' ? 'okumalar aynı' : `farklı: ${diff.map(fl).join(', ')}`)); continue; }
  if (DECISION.has(c.barcode)) { groups.F.push(row(DECISION.get(c.barcode)!)); continue; }
  if (!ing1 && !ing2) { skippedNoIng++; continue; }
  if (c.status === 'agreed') { groups.A.push(row('—')); continue; }
  const hint = hakemHint(c);
  if (diff.some((f) => SAFETY.includes(f))) groups.D.push(row(diff.map(fl).join(', ') + hint));
  else if (diff.some((f) => f.startsWith('nutritionPer100'))) groups.C.push(row(diff.map(fl).join(', ') + hint));
  else groups.B.push(row(diff.map(fl).join(', ') + hint));
}

const table = (rows: string[], col: string) => ['| ✓ | Barkod | Ürün | ' + col + ' |', '|---|---|---|---|', ...rows].join('\n');
const out = `# Ekrandan onay listesi

Oluşturuldu: ${new Date().toISOString().slice(0, 10)}. Bu liste yalnız bu bilgisayarda durur (git'e girmez).

Bu listedekiler **markete gitmeden**, onay ekranında fotoğrafa bakarak onaylanabilir. Teyit listesindeki
ürünler (okunamayan, barkodu farklı, emin olunmayan) burada YOK; onlar market listesinde.
Her ürünü onaylamadan önce fotoğrafa bir kez göz at: iki okumanın aynı olması doğru olduğunu kesinleştirmez.
Uygulamada "doğrulanmış" görünmeleri için onay şart.

Özet: A ${groups.A.length} · B ${groups.B.length} · C ${groups.C.length} · D ${groups.D.length} · E ${groups.E.length} · F ${groups.F.length}
(teyit listesinde olduğu için çıkarılan: ${skippedTeyit}; iki okumada da içindekiler olmayan, markete kalan: ${skippedNoIng})

## A. İki okuma aynı — olduğu gibi onayla (${groups.A.length})

${table(groups.A, 'Not')}

## B. Fark yalnız ad / marka / miktar / dil — fotoğrafa bakıp doğru okumayı seç (${groups.B.length})

${table(groups.B, 'Farklı alanlar')}

## C. Fark besin tablosunda — tabloya bakıp doğru okumayı seç (${groups.C.length})

${table(groups.C, 'Farklı alanlar')}

## D. Dikkat: fark içindekiler / alerjen / eser cümlesinde (${groups.D.length})

Alerjen bilgisi bu alanlardan gelir. Fotoğrafı yakından kontrol et; emin değilsen onaylama, bana söyle,
teyit listesine alırım. "hakem" notu, Codex'in üçüncü okumasının hangi okumayla aynı çıktığını gösterir
(yalnız yardımcı bilgi).

${table(groups.D, 'Farklı alanlar')}

## E. Gıda dışı — türünü "gıda dışı" seçerek onayla (${groups.E.length})

${table(groups.E, 'Not')}

## F. Karar bekliyor — şimdilik dokunma (${groups.F.length})

${table(groups.F, 'Konu')}
`;
writeFileSync(join(store, 'onay-listesi.md'), out, 'utf8');
console.log(`A ${groups.A.length} B ${groups.B.length} C ${groups.C.length} D ${groups.D.length} E ${groups.E.length} F ${groups.F.length} | teyitte ${skippedTeyit} | içindekiler yok ${skippedNoIng} | toplam aday ${cands.length}`);
