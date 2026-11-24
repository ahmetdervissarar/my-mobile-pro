// RafSkoru — Okuma 1 grup istemlerini üretir (token tasarrufu, ADR-009 §16).
//
// Kullanım (apps/backend içinden):  node scripts/label-pipeline/claude-prompts.mjs [grup boyu, varsayılan 5]
//
// data/label-store/claude-is.json'daki ürünleri gruplara böler ve her grup için bir
// label-reader istemini yazdırır. Her alt-ajan birkaç ürünü SIRAYLA ve BAĞIMSIZ okur;
// collect-reads.mjs yanıtı "[OKUMA 1 <barkod>]" başlıklarından ürünlere ayırır.
// İstemler arasında "=== İSTEM n/N ===" ayırıcısı vardır (ayırıcı istemin parçası değildir).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const storeDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/label-store');
const size = Math.max(1, Math.min(10, Number(process.argv[2] ?? 5) || 5));
const job = JSON.parse(readFileSync(join(storeDir, 'claude-is.json'), 'utf8'));
const products = job.products ?? [];

const groups = [];
for (let i = 0; i < products.length; i += size) groups.push(products.slice(i, i + size));

groups.forEach((group, i) => {
  const lines = [
    '[OKUMA 1 GRUP] Aşağıdaki ürünleri SIRAYLA ve her birini BİRBİRİNDEN BAĞIMSIZ oku. Her ürün için',
    'yalnız o ürünün fotoğraflarını Read aracıyla aç; bir ürünün etiketinden başka ürüne bilgi taşıma.',
    'Yanıtında her ürün için önce tek başına "[OKUMA 1 <barkod>]" satırını, hemen altına yalnız o ürünün',
    'talimatındaki biçimde JSON\'unu yaz. Başka metin ekleme. Bir ürünün fotoğrafını açamazsan o ürünün',
    'başlığının altına yalnız "ATLANDI" yaz.',
    '',
  ];
  for (const p of group) {
    lines.push(`ÜRÜN ${p.barcode}:`);
    for (const photo of p.photos) lines.push(`- ${photo}`);
  }
  console.log(`=== İSTEM ${i + 1}/${groups.length} (${group.length} ürün) ===`);
  console.log(lines.join('\n'));
  console.log('');
});
