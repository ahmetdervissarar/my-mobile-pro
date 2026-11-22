// RafSkoru — Etiket okuyucu çıktılarını toplar ve içe aktarma dosyalarını yazar (ADR-009).
//
// Kullanım:
//   node scripts/label-pipeline/collect-reads.mjs <proje-oturum-klasörü> <parti-klasörü>
//
// <proje-oturum-klasörü>: ~/.claude/projects/<proje> klasörü. Altındaki bütün
//   "<oturum>/subagents/*.jsonl" dosyaları taranır; yalnız "[OKUMA 1|2 <barkod>]"
//   etiketli ve barkodu bu partinin manifest'inde olan okumalar alınır.
// Her okumanın hangi modelle yapıldığı (köken) dökümün kendisinden okunur;
//   okunamazsa "bilinmiyor" yazılır, tahmin edilmez.
// İki okuması da olan ürünler için <parti>/imports/<barkod>.json yazılır.
// Yalnız tek okuması olan ürün içe aktarılmaz.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [projectDir, batchDir] = process.argv.slice(2);
if (!projectDir || !batchDir) throw new Error('Kullanım: collect-reads.mjs <proje-klasörü> <parti-klasörü>');

const readsDir = join(batchDir, 'reads');
const importsDir = join(batchDir, 'imports');
mkdirSync(readsDir, { recursive: true });
mkdirSync(importsDir, { recursive: true });

const manifest = JSON.parse(readFileSync(join(batchDir, 'manifest.json'), 'utf8'));
const byBarcode = new Map(manifest.map((entry) => [entry.barcode, entry]));

const files = [];
for (const session of existsSync(projectDir) ? readdirSync(projectDir) : []) {
  const sub = join(projectDir, session, 'subagents');
  if (!existsSync(sub) || !statSync(sub).isDirectory()) continue;
  for (const name of readdirSync(sub)) if (name.endsWith('.jsonl')) files.push(join(sub, name));
}

let found = 0;
const unparsable = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  let tag = null;
  let report = null;
  let model = null;
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const content = entry.message?.content;
    if (!tag && entry.type === 'user') {
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map((p) => p.text ?? '').join('\n') : '';
      const match = /\[OKUMA ([12]) (\d{8,14})\]/.exec(text);
      if (match) tag = { n: match[1], barcode: match[2] };
    }
    if (entry.type === 'assistant' && typeof entry.message?.model === 'string') model = entry.message.model;
    if (Array.isArray(content)) {
      for (const part of content) if (part.type === 'tool_use' && part.name === 'SubagentHandback') report = part.input?.message ?? null;
    }
  }
  if (!tag || !byBarcode.has(tag.barcode) || !report) continue;
  let parsed;
  try {
    parsed = JSON.parse(report.slice(report.indexOf('{'), report.lastIndexOf('}') + 1));
    if (!parsed.fields) throw new Error('fields yok');
  } catch {
    unparsable.push(`${tag.barcode}-${tag.n}`);
    continue;
  }
  parsed._model = model ?? 'bilinmiyor';
  writeFileSync(join(readsDir, `${tag.barcode}-${tag.n}.json`), JSON.stringify(parsed, null, 2) + '\n', 'utf8');
  found += 1;
}

// Codex okumaları (ADR-009 §15): <parti>/reads-codex/<barkod>-2.json. Yalnız
// biçimi doğru olanlar ve aynı ürün için başka ikinci okuma yoksa alınır.
const FIELD_KEYS = ['productName', 'brand', 'quantityText', 'ingredientsText', 'ingredientsLang', 'allergenStatementText', 'traceStatementText', 'nutritionPer100'];
const NUTRITION_KEYS = ['basis', 'energyKcal', 'fat', 'saturatedFat', 'carbohydrates', 'sugars', 'fiber', 'protein', 'salt'];
function codexReadProblem(o) {
  if (!o || typeof o !== 'object' || !o.fields || typeof o.fields !== 'object') return 'fields yok';
  for (const k of FIELD_KEYS) if (!(k in o.fields)) return `alan eksik: ${k}`;
  for (const k of FIELD_KEYS.filter((k) => k !== 'nutritionPer100')) {
    const v = o.fields[k];
    if (v !== null && typeof v !== 'string') return `alan metin değil: ${k}`;
  }
  const n = o.fields.nutritionPer100;
  if (n !== null) {
    if (typeof n !== 'object') return 'nutritionPer100 nesne değil';
    for (const k of NUTRITION_KEYS) if (!(k in n)) return `besin alanı eksik: ${k}`;
    if (n.basis !== null && n.basis !== '100g' && n.basis !== '100ml') return 'basis geçersiz';
    for (const k of NUTRITION_KEYS.filter((k) => k !== 'basis')) {
      if (n[k] !== null && (typeof n[k] !== 'number' || !Number.isFinite(n[k]))) return `besin değeri sayı değil: ${k}`;
    }
  }
  if (!Array.isArray(o.unreadableFields)) return 'unreadableFields liste değil';
  if (o._reader !== 'codex') return '_reader "codex" değil';
  return null;
}
const codexDir = join(batchDir, 'reads-codex');
let codexTaken = 0;
const codexRejected = [];
if (existsSync(codexDir)) {
  for (const entry of manifest) {
    const src = join(codexDir, `${entry.barcode}-2.json`);
    const dst = join(readsDir, `${entry.barcode}-2.json`);
    if (!existsSync(src)) continue;
    let o;
    try { o = JSON.parse(readFileSync(src, 'utf8')); } catch { codexRejected.push(`${entry.barcode}: JSON okunamadı`); continue; }
    const problem = codexReadProblem(o);
    if (problem) { codexRejected.push(`${entry.barcode}: ${problem}`); continue; }
    if (existsSync(dst)) {
      const prev = JSON.parse(readFileSync(dst, 'utf8'));
      if (prev._reader !== 'codex') { codexRejected.push(`${entry.barcode}: başka bir ikinci okuma zaten var`); continue; }
    }
    const model = typeof o._model === 'string' && o._model.trim() ? o._model.trim() : 'bilinmiyor';
    writeFileSync(dst, JSON.stringify({ ...o, _reader: 'codex', _model: model }, null, 2) + '\n', 'utf8');
    codexTaken += 1;
  }
}

const readAt = new Date().toISOString();
let complete = 0;
const missing = [];
for (const entry of manifest) {
  const paths = [1, 2].map((n) => join(readsDir, `${entry.barcode}-${n}.json`));
  if (!paths.every((p) => existsSync(p))) { missing.push(entry.barcode); continue; }
  const [first, second] = paths.map((p) => JSON.parse(readFileSync(p, 'utf8')));
  const toRead = (output) => ({
    reader: 'desktop_session',
    model: `${output._reader === 'codex' ? 'codex' : 'label-reader'} (${output._model ?? 'bilinmiyor'})`,
    readAt,
    fields: output.fields,
    unreadableFields: output.unreadableFields ?? [],
    notes: typeof output.notes === 'string' && output.notes.trim() ? output.notes : null,
  });
  const importFile = {
    barcode: entry.barcode,
    photoSource: 'off_photo',
    photos: entry.photos.map((photo) => ({ slot: photo.slot, ref: photo.ref, attribution: photo.attribution })),
    observedAt: entry.observedAt,
    declaredProductKind: null,
    extractRead: toRead(first),
    verifyRead: toRead(second),
  };
  writeFileSync(join(importsDir, `${entry.barcode}.json`), JSON.stringify(importFile, null, 2) + '\n', 'utf8');
  complete += 1;
}

console.log(`okuma dosyası: ${found}; iki okuması tamam ürün: ${complete}/${manifest.length}; ayrıştırılamayan: ${unparsable.join(',') || 'yok'}`);
if (existsSync(codexDir)) console.log(`Codex okuması alınan: ${codexTaken}; reddedilen: ${codexRejected.length ? '\n  ' + codexRejected.join('\n  ') : 'yok'}`);
if (missing.length) console.log(`tek okumalı / okunmamış ürünler: ${missing.join(' ')}`);
