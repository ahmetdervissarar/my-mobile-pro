// OFF Türkiye içe aktarma çıktısında, OFF'un kendi Nutri-Score notu ile bizim hesabımızı karşılaştırır.
// Önce: npm run import:off-tr   Sonra: npm run validate:nutriscore-off
// Not: Kategori burada yalnız doğrulama amacıyla OFF kategori etiketlerinden türetilir;
// uygulamada kategori kendi ürün kaydımızdan gelir.
import { createReadStream, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeNutriScore2023 } from './nutriScore2023.js';
import { categoryFromOffTags, hasNonNutritiveSweetenerTag } from '../catalog/nutriScoreCategory.js';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/off-tr');

async function main() {
  const rl = createInterface({ input: createReadStream(resolve(DIR, 'products.jsonl')), crlfDelay: Infinity });
  let withOffGrade = 0, computed = 0, exact = 0, withinOne = 0, insufficient = 0;
  const confusion: Record<string, number> = {};
  const byCat: Record<string, { n: number; exact: number }> = {};
  const order = 'ABCDE';
  for await (const line of rl) {
    const r = JSON.parse(line);
    if (!r.nutriscoreGrade) continue;
    withOffGrade++;
    const n = r.nutrition100g;
    const cat = categoryFromOffTags(r.categories ?? []);
    const res = computeNutriScore2023({
      category: cat, energyKcal: n.energyKcal, sugars: n.sugars, saturatedFat: n.saturatedFat, fat: n.fat,
      salt: n.salt, proteins: n.proteins, fiber: n.fiber, fruitsVegLegumesPercent: null,
      hasNonNutritiveSweeteners: hasNonNutritiveSweetenerTag(r.additives ?? []),
    });
    if (res.status !== 'computed') { insufficient++; continue; }
    computed++;
    const off = String(r.nutriscoreGrade).toUpperCase();
    const key = `${off}->${res.grade}`;
    confusion[key] = (confusion[key] ?? 0) + 1;
    const b = (byCat[cat] ??= { n: 0, exact: 0 });
    b.n++;
    if (off === res.grade) { exact++; b.exact++; }
    if (Math.abs(order.indexOf(off) - order.indexOf(res.grade)) <= 1) withinOne++;
  }
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  const report = {
    withOffGrade, computed, insufficientData: insufficient,
    exactMatchPct: pct(exact, computed), withinOneGradePct: pct(withinOne, computed),
    byCategory: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, { n: v.n, exactPct: pct(v.exact, v.n) }])),
    confusion,
    note: 'Meyve-sebze oranı OFF kaydında olmadığı için 0 kabul edildi; bu, bazı ürünlerde notu bir kademe kötüleştirebilir.',
  };
  writeFileSync(resolve(DIR, 'nutriscore-validation.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
