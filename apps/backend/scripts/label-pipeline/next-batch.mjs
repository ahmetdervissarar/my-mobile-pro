// RafSkoru — Codex için sıradaki etiket partisi (ADR-009 §15).
//
// Kullanım (apps/backend içinden):  node scripts/label-pipeline/next-batch.mjs [--yalniz-indir]
//
// --yalniz-indir: ana oturum indirir, Codex sonra okur (Codex'in ortamında tsx çalışmıyor,
//   2026-11-23). Açık partide Codex okuması eksikse indirmez ve deneme sayacına dokunmaz;
//   yeni partinin deneme sayacını 0'dan başlatır (ilk Codex çalıştırması 1 olur).
//
// 1. Son indirilen parti Codex tarafından henüz bitmediyse yeni sayfa İNDİRMEZ;
//    eksik ürünler için iş listesini (data/label-store/codex-is.json) yeniden yazar.
//    Aynı ürünler 2 denemede de okunamadıysa onları bırakır ve yeni sayfaya geçer.
// 2. Bitti ise OFF'tan sıradaki partiyi BİR KEZ indirir (tekrar deneme yok) ve
//    bütün ürünler için Codex iş listesini yazar.
//    data/label-store/off/kuyruk.json varsa (ADR-009 §16) ürün listesi OFF arama
//    servisinden değil kuyruktan alınır; yalnız fotoğraflar indirilir.
// Sayfa sırası data/label-store/off/ilerleme.json dosyasında tutulur
// (arama: sonSayfa, kuyruk: kuyrukSayfa).
//
// Çıkış: "HAZIR: ..." (Codex okumaya başlayabilir) veya "DUR: ..." (bugün iş yok).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const offDir = join(backendDir, 'data', 'label-store', 'off');
const progressPath = join(offDir, 'ilerleme.json');
const CONTACT = 'rafskoru.iletisim@gmail.com';
const MAX_ATTEMPTS = 2;
const onlyDownload = process.argv.includes('--yalniz-indir');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n', 'utf8');
const runJobs = (batchDir, only = []) => {
  const r = spawnSync(process.execPath, [join(backendDir, 'scripts/label-pipeline/make-jobs.mjs'), 'codex', batchDir, ...only], { encoding: 'utf8' });
  if (r.status !== 0) { console.log(`DUR: iş listesi yazılamadı.\n${r.stderr}`); process.exit(1); }
  return r.stdout.trim();
};

if (!existsSync(progressPath)) {
  console.log(`DUR: ${progressPath} yok. Ana oturuma haber ver.`);
  process.exit(1);
}
const progress = readJson(progressPath);

// 1. Açık parti var mı?
if (progress.acikParti) {
  const batchDir = join(offDir, progress.acikParti);
  const statePath = join(batchDir, 'durum.json');
  const state = existsSync(statePath) ? readJson(statePath) : { codexDeneme: 0 };
  const manifest = readJson(join(batchDir, 'manifest.json'));
  const missing = manifest.map((e) => e.barcode).filter((bc) => !existsSync(join(batchDir, 'reads-codex', `${bc}-2.json`)));
  // Deneme sayacı yalnız İLERLEMESİZ çalıştırmaları sayar: Codex önceki iş listesinden beri
  // yeni ürün okuduysa sayaç sıfırlanır (Codex bir çalıştırmada partinin bir kısmını okuyabiliyor).
  const readCount = manifest.length - missing.length;
  if (readCount > (state.codexOkunanSon ?? 0)) state.codexDeneme = 0;
  state.codexOkunanSon = readCount;
  if (onlyDownload && missing.length > 0) {
    console.log(`DUR: ${progress.acikParti} partisinde Codex okuması eksik ${missing.length} ürün var; önce Codex bitirmeli. Yeni parti indirilmedi.`);
    process.exit(1);
  }
  if (missing.length > 0 && state.codexDeneme < MAX_ATTEMPTS) {
    state.codexDeneme += 1;
    writeJson(statePath, state);
    console.log(runJobs(batchDir, missing));
    console.log(`HAZIR: ${progress.acikParti} partisinde Codex okuması eksik ${missing.length} ürün var (deneme ${state.codexDeneme}/${MAX_ATTEMPTS}). Yeni sayfa indirilmedi.`);
    process.exit(0);
  }
  state.codexBitti = new Date().toISOString();
  state.codexOkunamayan = missing;
  writeJson(statePath, state);
  progress.acikParti = null;
  writeJson(progressPath, progress);
  if (missing.length > 0) console.log(`Not: ${missing.length} ürün ${MAX_ATTEMPTS} denemede okunamadı, bırakıldı: ${missing.join(' ')}`);
}

// 2. Sıradaki partiyi indir.
const queueMode = existsSync(join(offDir, 'kuyruk.json'));
const page = ((queueMode ? progress.kuyrukSayfa : progress.sonSayfa) ?? 0) + 1;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const fetchArgs = ['run', '-s', 'label:fetch-off', '--', `--contact=${CONTACT}`, '--limit=50', `--page=${page}`, ...(queueMode ? ['--queue'] : [])];
const r = spawnSync(npm, fetchArgs, {
  cwd: backendDir, encoding: 'utf8', shell: process.platform === 'win32',
});
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
const stop = out.split('\n').find((l) => l.startsWith('DUR:'));
const done = out.split('\n').find((l) => l.startsWith('Bitti:'));
if (stop || !done || r.status !== 0) {
  // Asıl hata metni ana oturum için dosyaya yazılır (Codex yalnız DUR satırını aktarır).
  const tail = out.trim().split(/\r?\n/).slice(-30);
  writeFileSync(join(offDir, 'son-hata.txt'), [
    new Date().toISOString(),
    `komut: ${npm} ${fetchArgs.join(' ')}`,
    `çıkış: ${r.status}`,
    `spawn hatası: ${r.error?.message ?? '-'}`,
    '---',
    ...tail,
  ].join('\n') + '\n', 'utf8');
  console.log(stop ?? `DUR: indirme tamamlanmadı (çıkış kodu ${r.status}). Ayrıntı: data/label-store/off/son-hata.txt`);
  if (stop?.includes('kuyrukta indirilecek ürün kalmadı')) {
    console.log('Saatlik denemeyi bırak; ana oturuma haber ver.');
  } else {
    console.log('Bu çalıştırmada tekrar deneme; en erken 1 saat sonra yeniden başlatılabilir.');
  }
  process.exit(1);
}
const manifestPath = done.split('Manifest: ')[1]?.trim();
const batchDir = dirname(manifestPath);
const batchName = batchDir.split(/[\\/]/).pop();
writeJson(join(batchDir, 'durum.json'), { sayfa: page, kaynak: queueMode ? 'kuyruk' : 'arama', indiren: onlyDownload ? 'ana-oturum' : 'codex', indirildi: new Date().toISOString(), codexDeneme: onlyDownload ? 0 : 1 });
if (queueMode) progress.kuyrukSayfa = page; else progress.sonSayfa = page;
progress.acikParti = batchName;
writeJson(progressPath, progress);
console.log(done);
console.log(runJobs(batchDir));
console.log(`HAZIR: ${batchName} (${queueMode ? 'kuyruk' : 'arama'} sayfası ${page}) indirildi; Codex okumaya başlayabilir.`);
