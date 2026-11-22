// RafSkoru — Codex için sıradaki etiket partisi (ADR-009 §15).
//
// Kullanım (apps/backend içinden):  node scripts/label-pipeline/next-batch.mjs
//
// 1. Son indirilen parti Codex tarafından henüz bitmediyse yeni sayfa İNDİRMEZ;
//    eksik ürünler için iş listesini (data/label-store/codex-is.json) yeniden yazar.
//    Aynı ürünler 2 denemede de okunamadıysa onları bırakır ve yeni sayfaya geçer.
// 2. Bitti ise OFF'tan sıradaki sayfayı BİR KEZ indirir (tekrar deneme yok) ve
//    bütün ürünler için Codex iş listesini yazar.
// Sayfa sırası data/label-store/off/ilerleme.json dosyasında tutulur.
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

// 2. Sıradaki sayfayı indir.
const page = (progress.sonSayfa ?? 0) + 1;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const r = spawnSync(npm, ['run', '-s', 'label:fetch-off', '--', `--contact=${CONTACT}`, '--limit=50', `--page=${page}`], {
  cwd: backendDir, encoding: 'utf8', shell: process.platform === 'win32',
});
const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
const stop = out.split('\n').find((l) => l.startsWith('DUR:'));
const done = out.split('\n').find((l) => l.startsWith('Bitti:'));
if (stop || !done || r.status !== 0) {
  console.log(stop ?? `DUR: indirme tamamlanmadı (çıkış kodu ${r.status}).`);
  console.log('Bugün tekrar deneme; ana oturuma haber ver.');
  process.exit(1);
}
const manifestPath = done.split('Manifest: ')[1]?.trim();
const batchDir = dirname(manifestPath);
const batchName = batchDir.split(/[\\/]/).pop();
writeJson(join(batchDir, 'durum.json'), { sayfa: page, indirildi: new Date().toISOString(), codexDeneme: 1 });
progress.sonSayfa = page;
progress.acikParti = batchName;
writeJson(progressPath, progress);
console.log(done);
console.log(runJobs(batchDir));
console.log(`HAZIR: ${batchName} (sayfa ${page}) indirildi; Codex okumaya başlayabilir.`);
