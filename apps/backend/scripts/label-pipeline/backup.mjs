// RafSkoru — Etiket deposunun yedeği (onay deposu, fotoğraflar, okumalar, teyit listesi).
//
// Kullanım (apps/backend içinden):
//   node scripts/label-pipeline/backup.mjs [hedef klasör]
//
// Varsayılan hedef: <kullanıcı klasörü>/RafSkoru-yedek (proje klasörünün DIŞINDA).
// Her çalıştırma tarihli bir klasör yazar: rafskoru-etiket-<tarih-saat>/label-store/...
// Eski yedekleri silmez. Veritabanı açıkken bile tutarlı kopya için "VACUUM INTO" ile
// anlık görüntü alınır. Yedekte sağlık profili yoktur: profil yalnız telefonda durur.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoDir = resolve(backendDir, '..', '..');
const storeDir = join(backendDir, 'data', 'label-store');
const dbPath = join(storeDir, 'label-store.db');
const target = resolve(process.argv[2] ?? join(homedir(), 'RafSkoru-yedek'));
const LIVE_DB = /^label-store\.db(-wal|-shm|-journal)?$/;

const stop = (msg) => { console.log(`DUR: ${msg}`); process.exit(1); };
if (!existsSync(dbPath)) stop(`${dbPath} yok.`);
if (target.toLowerCase().startsWith(repoDir.toLowerCase())) stop('Hedef klasör proje içinde olamaz.');

const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
const outDir = join(target, `rafskoru-etiket-${stamp}`);
const outStore = join(outDir, 'label-store');
if (existsSync(outDir)) stop(`${outDir} zaten var; bir dakika sonra yeniden dene.`);
mkdirSync(outStore, { recursive: true });

const relOf = (root, p) => p.slice(root.length + 1).replaceAll('\\', '/');
// Dosya sayısı ve toplam boyut (canlı veritabanı dosyaları hariç).
const scan = (root) => {
  let files = 0, bytes = 0;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (!LIVE_DB.test(relOf(root, p))) { files += 1; bytes += statSync(p).size; }
    }
  };
  walk(root);
  return { files, bytes };
};
const count = (path) => {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    return Object.fromEntries(['label_candidates', 'verified_label_products'].map((t) => [t, db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]));
  } finally { db.close(); }
};

// 1. Veritabanının tutarlı anlık görüntüsü.
const snapshot = join(outStore, 'label-store.db');
const live = new DatabaseSync(dbPath);
live.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`);
live.close();
const a = count(dbPath), b = count(snapshot);
if (JSON.stringify(a) !== JSON.stringify(b)) stop(`anlık görüntü kayıt sayısı tutmuyor: ${JSON.stringify(a)} / ${JSON.stringify(b)}`);

// 2. Diğer bütün dosyalar (canlı veritabanı hariç; yerine anlık görüntü var).
cpSync(storeDir, outStore, { recursive: true, filter: (src) => src === storeDir || !LIVE_DB.test(relOf(storeDir, src)) });

// 3. Doğrulama: dosya sayısı ve toplam boyut aynı olmalı.
const src = scan(storeDir), dst = scan(outStore);
if (src.files !== dst.files || src.bytes !== dst.bytes) stop(`kopya tutmuyor: kaynak ${src.files} dosya/${src.bytes} bayt, yedek ${dst.files}/${dst.bytes}.`);

const mb = ((dst.bytes + statSync(snapshot).size) / 1048576).toFixed(0);
console.log(`Bitti: ${outDir}`);
console.log(`  ${dst.files + 1} dosya, ${mb} MB; aday ${b.label_candidates}, onaylı kayıt ${b.verified_label_products}.`);
