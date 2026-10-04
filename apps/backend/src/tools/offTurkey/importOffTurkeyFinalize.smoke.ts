// Görev (ürün görselleri — yeniden içe aktarma hazırlığı): finalizeImportOutput
// atomik, yedekli dosya değişimini gerçek bir geçici dizinle doğrular —
// ağ/dump erişimi gerektirmez, indirme BAŞLATMAZ.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { finalizeImportOutput } from './importFinalize.js';

const outDir = mkdtempSync(join(tmpdir(), 'rafskoru-import-finalize-smoke-'));
const finalPath = join(outDir, 'products.jsonl');
const stagingPath = join(outDir, 'products.jsonl.incoming');

// 1) writtenCount 0 ise var olan iyi dosyaya DOKUNULMAZ — re-import kaynağı
// boş/erişilemez olsa bile çalışan katalog kaybolmamalı.
writeFileSync(finalPath, 'eski-iyi-veri\n');
writeFileSync(stagingPath, '');
{
  const result = finalizeImportOutput({
    outDir,
    stagingFileName: 'products.jsonl.incoming',
    finalFileName: 'products.jsonl',
    writtenCount: 0,
    backupSuffix: '2026-01-01T00-00-00-000Z',
  });
  assert.equal(result.skipped, true);
  assert.equal(result.backupPath, null);
  assert.equal(readFileSync(finalPath, 'utf8'), 'eski-iyi-veri\n', 'writtenCount 0 iken eski dosya DEĞİŞMEMELİ');
}

// 2) writtenCount > 0 ve eski dosya varsa: eski dosya zaman damgalı yedeğe
// taşınır, staging YERİNE geçer (atomik rename) — iki kopya YAN YANA kalıcı
// tutulmaz, yedek yalnız geri dönüş içindir.
writeFileSync(stagingPath, 'yeni-veri\n');
{
  const result = finalizeImportOutput({
    outDir,
    stagingFileName: 'products.jsonl.incoming',
    finalFileName: 'products.jsonl',
    writtenCount: 3,
    backupSuffix: '2026-06-19T09-00-00-000Z',
  });
  assert.equal(result.skipped, false);
  assert.ok(result.backupPath);
  assert.equal(readFileSync(finalPath, 'utf8'), 'yeni-veri\n', 'yeni dosya devreye girmeli');
  assert.equal(readFileSync(result.backupPath!, 'utf8'), 'eski-iyi-veri\n', 'eski veri yedekte korunmalı');
  assert.ok(!existsSync(stagingPath), 'staging dosyası rename sonrası artık orada olmamalı (taşındı)');
}

// 3) Hiç önceki dosya yoksa (ilk çalıştırma) yedek oluşturulmaz, sorunsuz
// yerleştirilir.
{
  const freshOutDir = mkdtempSync(join(tmpdir(), 'rafskoru-import-finalize-smoke-fresh-'));
  writeFileSync(join(freshOutDir, 'products.jsonl.incoming'), 'ilk-veri\n');
  const result = finalizeImportOutput({
    outDir: freshOutDir,
    stagingFileName: 'products.jsonl.incoming',
    finalFileName: 'products.jsonl',
    writtenCount: 1,
    backupSuffix: '2026-01-01T00-00-00-000Z',
  });
  assert.equal(result.skipped, false);
  assert.equal(result.backupPath, null, 'önceki dosya yoksa yedek oluşturulmamalı');
  assert.equal(readFileSync(join(freshOutDir, 'products.jsonl'), 'utf8'), 'ilk-veri\n');
}

console.log('IMPORT_OFF_TURKEY_FINALIZE_SMOKE_OK');
