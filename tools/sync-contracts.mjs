// RafSkoru contract sync: backend tek kaynak -> mobil üretilmiş kopya.
// Kullanım:
//   node tools/sync-contracts.mjs          -> apps/mobile/src/contracts/generated.ts yazar
//   node tools/sync-contracts.mjs --check  -> mevcut üretilmiş dosya ile parite denetler
// Bağımlılık yok. Çıktı deterministiktir (sabit modül sırası, LF, UTF-8, BOM yok).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = path.join(ROOT, 'apps', 'backend', 'src', 'contracts');
const TARGET_FILE = path.join(ROOT, 'apps', 'mobile', 'src', 'contracts', 'generated.ts');
// Sıra sabittir: bağımlılık yönü provenance -> allergenStatus -> productFacts.
const MODULE_ORDER = ['provenance.ts', 'allergenStatus.ts', 'productFacts.ts'];

function normalizeNewlines(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

// Yalnız beklenen, tek satırlık yerel tip importlarını satır satır kaldırır:
//   import type { A, B } from './modul.js';
// Tek dosyada tüm tipler aynı kapsamda olur. Bu kalıba uymayan herhangi bir import
// satırı (değer importu, çok satırlı import, dış modül) üretimi hata ile durdurur;
// satırlar arasında eşleşen geniş regex kullanılmaz.
const LOCAL_TYPE_IMPORT = /^import type \{[^{}\n]*\} from '\.\/[A-Za-z0-9_-]+\.js';$/;

function stripLocalImports(text, fileName) {
  const kept = [];
  for (const line of text.split('\n')) {
    if (LOCAL_TYPE_IMPORT.test(line)) continue;
    if (/^\s*import\b/.test(line) || /^\s*export\s+.*\bfrom\s+'/.test(line)) {
      throw new Error(`CONTRACTS_SYNC_FAIL: unexpected import/re-export in ${fileName}: ${line.trim()}`);
    }
    kept.push(line);
  }
  return kept.join('\n');
}

function buildBody() {
  const sections = MODULE_ORDER.map((fileName) => {
    const sourcePath = path.join(SOURCE_DIR, fileName);
    const raw = normalizeNewlines(fs.readFileSync(sourcePath, 'utf8'));
    const stripped = stripLocalImports(raw, fileName).trimEnd();
    return `// ---- ${fileName} ----\n${stripped}\n`;
  });
  return sections.join('\n');
}

function buildOutput() {
  const body = buildBody();
  const hash = createHash('sha256').update(body, 'utf8').digest('hex');
  const header = [
    '// ELLE DÜZENLEMEYİN — bu dosya `tools/sync-contracts.mjs` tarafından üretilir.',
    '// Kaynak: apps/backend/src/contracts/*.ts (tek kaynak). Değişiklik için kaynağı düzenleyip',
    '// `node tools/sync-contracts.mjs` çalıştırın; `--check` parite denetimi yapar.',
    `// contracts-sha256: ${hash}`,
    '',
    '',
  ].join('\n');
  return { output: header + body, hash };
}

function main() {
  const check = process.argv.includes('--check');
  const { output, hash } = buildOutput();

  if (check) {
    if (!fs.existsSync(TARGET_FILE)) {
      console.error(`CONTRACTS_PARITY_FAIL: missing ${path.relative(ROOT, TARGET_FILE)}`);
      process.exit(1);
    }
    const current = normalizeNewlines(fs.readFileSync(TARGET_FILE, 'utf8'));
    if (current !== output) {
      const currentHash = (current.match(/contracts-sha256: ([0-9a-f]{64})/) ?? [])[1] ?? 'none';
      console.error(`CONTRACTS_PARITY_FAIL: expected ${hash}, found ${currentHash}`);
      process.exit(1);
    }
    console.log(`CONTRACTS_PARITY_OK ${hash}`);
    return;
  }

  fs.mkdirSync(path.dirname(TARGET_FILE), { recursive: true });
  fs.writeFileSync(TARGET_FILE, output, { encoding: 'utf8' });
  console.log(`CONTRACTS_SYNC_OK ${hash} -> ${path.relative(ROOT, TARGET_FILE)}`);
}

main();
