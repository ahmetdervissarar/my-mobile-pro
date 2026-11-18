/**
 * RafSkoru — Etiket okumalarını yerel depoya aday olarak alır (İş 1.4)
 * apps/backend/src/labelStore/importReadsCli.ts
 *
 * Kullanım:  npm run label:import -- <okuma.json> [<okuma2.json> ...]
 *
 * Her dosya bir LabelReadImport nesnesidir (bkz. importReads.ts). Yalnız
 * yerel depoya (data/label-store/) yazar; dış servis çağırmaz, onay vermez.
 * Çıktıda alan değerleri değil yalnız durum ve ayrışan alan adları yazılır.
 */
import { readFileSync } from 'node:fs';

import { getLabelStoreDbPath } from './config.js';
import { initLabelStoreDb } from './db.js';
import { importLabelReads, type LabelReadImport } from './importReads.js';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Kullanım: npm run label:import -- <okuma.json> [<okuma2.json> ...]');
  process.exit(2);
}

initLabelStoreDb(getLabelStoreDbPath());

let failed = 0;
for (const file of files) {
  try {
    const input = JSON.parse(readFileSync(file, 'utf8')) as LabelReadImport;
    const result = importLabelReads(input);
    const { candidate } = result;
    console.log(
      `${result.status === 'imported' ? 'ALINDI' : 'ZATEN VAR'}  ${file}  barkod=${candidate.barcode} ` +
        `aday=${candidate.id} durum=${candidate.status}` +
        (candidate.differingFields && candidate.differingFields.length > 0
          ? ` ayrışan=${candidate.differingFields.join(',')}`
          : ''),
    );
  } catch (err) {
    failed += 1;
    console.error(`HATA  ${file}: ${(err as Error).message}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
