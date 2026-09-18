#!/usr/bin/env node
// RafSkoru — market fiyat kaynağı probe aracı (spike, üretim dışı)
//
// Amaç: Türkiye'de GTIN düzeyinde haftalık fiyat edinme seçeneklerini yalnız
// BELGELENMİŞ, salt okunur, kimlik doğrulamasız uç noktalara gerçek istek atarak
// ölçmek ve sonucu makinece okunur JSON + insan okunur Markdown olarak yazmak.
//
// Kurallar (CLAUDE.md / rafskoru-invariants E1, E3):
//  - Yalnız Node yerleşikleri; paket yok.
//  - Yalnız belgelenmiş açık uç noktalar; scraping, resmî olmayan API, bot/CAPTCHA aşma yok.
//  - Kimlik bilgisi / anahtar okunmaz, istenmez, yazılmaz.
//  - Kişisel veri saklanmaz: yanıt örneklerinden `owner` gibi kullanıcı alanları atılır,
//    yalnız beyaz listedeki alanlar tutulur (en fazla 3 kayıt).
//  - Gerçek istek sonucu (`isFixture:false`) ile örnek/fixture (`isFixture:true`) ayrı etiketlenir;
//    fixture asla "kapsam ölçüldü" iddiası üretmez.
//
// Kullanım:
//   node tools/market-source-spike/probe.mjs --live [--gtin 8690504012345,...] [--out DIR]
//   node tools/market-source-spike/probe.mjs --fixture
//   node tools/market-source-spike/probe.mjs --selftest

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOOL_VERSION = '0.1.0';
const USER_AGENT = 'RafSkoru-MarketSourceSpike/0.1 (read-only research probe; github.com/ahmetdervissarar/my-mobile-pro)';
const REQUEST_TIMEOUT_MS = 20_000;
const REQUEST_GAP_MS = 1_000; // nazik hız: ardışık istekler arası bekleme
const MAX_REQUESTS_PER_RUN = 10;
const SAMPLE_LIMIT = 3;

// Yanıt örneklerinde saklanmasına izin verilen alanlar (kişisel veri yok).
const PRICE_FIELD_WHITELIST = [
  'id', 'type', 'product_code', 'product_name', 'category_tag', 'price', 'price_is_discounted',
  'price_without_discount', 'discount_type', 'currency', 'date', 'location_id', 'location_osm_id',
  'location_osm_type', 'proof_id', 'source', 'created', 'updated',
];
const LOCATION_FIELD_WHITELIST = [
  'id', 'type', 'osm_id', 'osm_type', 'osm_name', 'osm_address_city', 'osm_address_country',
  'osm_address_country_code', 'osm_tag_key', 'osm_tag_value', 'price_count', 'created', 'updated',
];
const OFF_FIELD_WHITELIST = ['code', 'product_name', 'brands', 'countries_tags'];

// Belgelenmiş, kimlik doğrulamasız GET uç noktaları.
// Kaynak: openfoodfacts/open-prices → docs/guides/API.md, docs/guides/data.md,
//         open_prices/api/urls.py, open_prices/api/{prices,locations}/filters.py (erişim 2026-09-18).
//         Open Food Facts API v2 search (documented; countries_tags_en filtresi).
const OPEN_PRICES_BASE = 'https://prices.openfoodfacts.org';
const OFF_BASE = 'https://world.openfoodfacts.org';

function buildPlan(gtins) {
  const steps = [
    {
      id: 'open_prices_status',
      source: 'open_prices',
      purpose: 'Servis ayakta mı (sağlık ucu).',
      url: `${OPEN_PRICES_BASE}/api/v1/status`,
      kind: 'json',
    },
    {
      id: 'open_prices_stats',
      source: 'open_prices',
      purpose: 'Küresel toplamlar (fiyat/ürün/konum/kanıt sayısı).',
      url: `${OPEN_PRICES_BASE}/api/v1/stats`,
      kind: 'json',
    },
    {
      id: 'open_prices_locations_tr',
      source: 'open_prices',
      purpose: 'Türkiye konum kayıtları ve her birindeki fiyat sayısı (ülke adı "Türkiye").',
      url: `${OPEN_PRICES_BASE}/api/v1/locations?osm_address_country__like=T%C3%BCrkiye&order_by=-price_count&size=100`,
      kind: 'paginated', whitelist: LOCATION_FIELD_WHITELIST,
    },
    {
      id: 'open_prices_locations_turkey',
      source: 'open_prices',
      purpose: 'Türkiye konum kayıtları (İngilizce ülke adı "Turkey" ile de kayıt olabilir).',
      url: `${OPEN_PRICES_BASE}/api/v1/locations?osm_address_country__like=Turkey&order_by=-price_count&size=100`,
      kind: 'paginated', whitelist: LOCATION_FIELD_WHITELIST,
    },
    {
      id: 'open_prices_prices_try',
      source: 'open_prices',
      purpose: 'Para birimi TRY olan fiyat kayıtları; GTIN (product_code), tarih, indirim, konum, kanıt alanları var mı?',
      url: `${OPEN_PRICES_BASE}/api/v1/prices?currency=TRY&order_by=-date&size=100`,
      kind: 'paginated', whitelist: PRICE_FIELD_WHITELIST,
    },
    {
      id: 'open_prices_prices_try_last_30d',
      source: 'open_prices',
      purpose: 'Son 30 günde TRY fiyat girişi (güncelleme hızı göstergesi).',
      url: `${OPEN_PRICES_BASE}/api/v1/prices?currency=TRY&date__gte=${isoDaysAgo(30)}&size=1`,
      kind: 'paginated', whitelist: PRICE_FIELD_WHITELIST,
    },
    {
      id: 'off_products_turkey_count',
      source: 'open_food_facts',
      purpose: 'OFF\'ta Türkiye etiketli ürün sayısı (GTIN tabanı büyüklüğü; fiyat içermez).',
      url: `${OFF_BASE}/api/v2/search?countries_tags_en=turkey&page_size=1&fields=code,product_name,brands`,
      kind: 'off_search', whitelist: OFF_FIELD_WHITELIST,
    },
  ];
  for (const gtin of gtins.slice(0, 3)) {
    steps.push({
      id: `open_prices_prices_gtin_${gtin}`,
      source: 'open_prices',
      purpose: `Belirli GTIN için fiyat kaydı var mı? (${gtin})`,
      url: `${OPEN_PRICES_BASE}/api/v1/prices?product_code=${encodeURIComponent(gtin)}&order_by=-date&size=10`,
      kind: 'paginated', whitelist: PRICE_FIELD_WHITELIST,
    });
  }
  return steps.slice(0, MAX_REQUESTS_PER_RUN);
}

// Belgelenmiş arayüzü bulunamayan kaynaklar: HTTP isteği ATILMAZ, yalnız durum kaydedilir.
const NOT_PROBED = [
  {
    id: 'market_fiyati_tubitak_bilgem',
    source: 'market_fiyati',
    status: 'skipped_no_documented_interface',
    note: 'marketfiyati.org.tr / Market Fiyatı (TÜBİTAK BİLGEM) için belgelenmiş açık API veya veri paylaşım başvurusu bulunamadı; erişilebilir entegrasyon kanıtlanamadı. Resmî olmayan istemci (arşiv) kullanılmaz.',
  },
  {
    id: 'retailer_public_feeds',
    source: 'retailers_tr',
    status: 'skipped_no_documented_interface',
    note: 'Migros, CarrefourSA, A101, BİM, ŞOK için tüketiciye açık fiyat feed/API belgesi bulunamadı; Trendyol/Hepsiburada geliştirici portalları yalnız satıcı hesabıyla kendi listelemeleri içindir.',
  },
];

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function pick(obj, whitelist) {
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const k of whitelist) if (k in obj) out[k] = obj[k];
  return out;
}

function classifyError(err) {
  const msg = String(err?.cause?.message || err?.message || err);
  if (err?.name === 'AbortError') return { status: 'timeout', detail: `timeout after ${REQUEST_TIMEOUT_MS}ms` };
  if (/403|CONNECT|tunnel|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|proxy|blocked/i.test(msg)) {
    return { status: 'network_blocked', detail: msg.slice(0, 200) };
  }
  return { status: 'error', detail: msg.slice(0, 200) };
}

async function fetchJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    const latencyMs = Date.now() - started;
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = null; }
    // Ortam egress proxy'si engellediğinde 403 + x-deny-reason döner; bunu kaynak hatasıyla karıştırma.
    const denyReason = res.headers.get('x-deny-reason');
    return { httpStatus: res.status, latencyMs, body, bodyBytes: text.length, denyReason };
  } finally {
    clearTimeout(timer);
  }
}

// Yanıtı özetle: toplam sayı, alan adları, GTIN varlığı, örnek kayıtlar (beyaz liste).
function summarize(step, body) {
  const out = { total: null, itemCount: null, fields: [], hasGtinField: null, samples: [] };
  if (!body || typeof body !== 'object') return out;
  if (step.kind === 'paginated') {
    const items = Array.isArray(body.items) ? body.items : [];
    out.total = typeof body.total === 'number' ? body.total : null;
    out.itemCount = items.length;
    out.fields = items[0] ? Object.keys(items[0]).sort() : [];
    out.hasGtinField = items[0] ? 'product_code' in items[0] : null;
    out.samples = items.slice(0, SAMPLE_LIMIT).map((it) => pick(it, step.whitelist));
    if (step.whitelist === LOCATION_FIELD_WHITELIST) {
      out.priceCountSum = items.reduce((a, it) => a + (Number(it.price_count) || 0), 0);
    }
    if (step.whitelist === PRICE_FIELD_WHITELIST && items.length) {
      const dates = items.map((it) => it.date).filter(Boolean).sort();
      out.dateRange = { min: dates[0] ?? null, max: dates[dates.length - 1] ?? null };
      out.discountedCount = items.filter((it) => it.price_is_discounted === true).length;
      out.withProofCount = items.filter((it) => it.proof_id != null).length;
      out.distinctGtins = new Set(items.map((it) => it.product_code).filter(Boolean)).size;
    }
  } else if (step.kind === 'off_search') {
    const products = Array.isArray(body.products) ? body.products : [];
    out.total = typeof body.count === 'number' ? body.count : null;
    out.itemCount = products.length;
    out.fields = products[0] ? Object.keys(products[0]).sort() : [];
    out.hasGtinField = products[0] ? 'code' in products[0] : null;
    out.samples = products.slice(0, SAMPLE_LIMIT).map((p) => pick(p, step.whitelist));
  } else {
    // stats / status: yalnız sayısal ve string alanları tut
    const flat = {};
    for (const [k, v] of Object.entries(body)) if (typeof v === 'number' || typeof v === 'string') flat[k] = v;
    out.samples = [flat];
    out.fields = Object.keys(flat).sort();
  }
  return out;
}

async function runLive(gtins) {
  const plan = buildPlan(gtins);
  const results = [];
  for (const step of plan) {
    const requestedAt = new Date().toISOString();
    let rec;
    try {
      const r = await fetchJson(step.url);
      const blocked = r.denyReason != null;
      rec = {
        ...baseRecord(step, requestedAt, false),
        status: blocked ? 'network_blocked' : r.httpStatus >= 200 && r.httpStatus < 300 ? 'ok' : 'http_error',
        httpStatus: r.httpStatus, latencyMs: r.latencyMs, bodyBytes: r.bodyBytes,
        ...(blocked ? { detail: `egress proxy: ${r.denyReason}` } : {}),
        summary: blocked ? null : summarize(step, r.body),
      };
    } catch (err) {
      rec = { ...baseRecord(step, requestedAt, false), ...classifyError(err), httpStatus: null, latencyMs: null };
    }
    results.push(rec);
    process.stderr.write(`[${rec.status}] ${step.id} ${rec.httpStatus ?? ''}\n`);
    await sleep(REQUEST_GAP_MS);
  }
  return results;
}

async function runFixture() {
  const raw = JSON.parse(await readFile(join(__dirname, 'fixtures', 'open-prices-sample.json'), 'utf8'));
  if (raw._fixture !== true) throw new Error('fixture dosyası _fixture:true ile işaretli olmalı');
  const plan = buildPlan(raw.gtins ?? []);
  return plan.map((step) => {
    const body = raw.responses[step.id] ?? null;
    return {
      ...baseRecord(step, raw.generatedAt, true),
      status: body ? 'ok' : 'fixture_missing',
      httpStatus: body ? 200 : null, latencyMs: null,
      summary: body ? summarize(step, body) : null,
    };
  });
}

function baseRecord(step, requestedAt, isFixture) {
  return {
    id: step.id, source: step.source, purpose: step.purpose, url: step.url,
    isFixture, mode: isFixture ? 'fixture' : 'live', requestedAt,
  };
}

function buildSummary(mode, results) {
  const bySource = {};
  for (const r of results) {
    const s = (bySource[r.source] ??= { ok: 0, failed: 0, blocked: 0 });
    if (r.status === 'ok') s.ok += 1;
    else if (r.status === 'network_blocked' || r.status === 'timeout') s.blocked += 1;
    else s.failed += 1;
  }
  const liveOk = results.filter((r) => !r.isFixture && r.status === 'ok').length;
  return {
    tool: 'market-source-spike', toolVersion: TOOL_VERSION, mode,
    generatedAt: new Date().toISOString(),
    node: process.version,
    disclaimer: mode === 'fixture'
      ? 'FIXTURE: Örnek yapı verisidir; gerçek kaynak yanıtı DEĞİLDİR ve kapsam ölçümü sayılmaz.'
      : 'LIVE: Belgelenmiş açık uç noktalara salt okunur gerçek istekler. Kişisel alanlar atılmıştır.',
    evidence: { liveRequestsOk: liveOk, coverageMeasured: mode === 'live' && liveOk > 0 },
    bySource,
    results,
    notProbed: NOT_PROBED,
  };
}

function renderReport(summary) {
  const L = [];
  L.push(`# Market fiyat kaynağı probe raporu (${summary.mode})`, '');
  L.push(`- Üretim: ${summary.generatedAt} · Node ${summary.node} · araç v${summary.toolVersion}`);
  L.push(`- **${summary.disclaimer}**`);
  L.push(`- Gerçek başarılı istek: ${summary.evidence.liveRequestsOk} · kapsam ölçüldü mü: ${summary.evidence.coverageMeasured ? 'evet' : 'HAYIR'}`, '');
  L.push('| Adım | Kaynak | Durum | HTTP | total | kayıt | GTIN alanı | Not |', '|---|---|---|---|---|---|---|---|');
  for (const r of summary.results) {
    const s = r.summary ?? {};
    const note = r.detail ?? (s.dateRange ? `tarih ${s.dateRange.min}…${s.dateRange.max}; kanıtlı ${s.withProofCount}/${s.itemCount}; indirimli ${s.discountedCount}` : s.priceCountSum != null ? `price_count toplam ${s.priceCountSum}` : '');
    L.push(`| ${r.id} | ${r.source} | ${r.status}${r.isFixture ? ' (fixture)' : ''} | ${r.httpStatus ?? '—'} | ${s.total ?? '—'} | ${s.itemCount ?? '—'} | ${s.hasGtinField == null ? '—' : s.hasGtinField ? 'evet' : 'hayır'} | ${note} |`);
  }
  L.push('', '## İstek atılmayan kaynaklar', '');
  for (const n of summary.notProbed) L.push(`- **${n.id}** (${n.source}): \`${n.status}\` — ${n.note}`);
  L.push('', '## Örnek kayıtlar (beyaz liste alanları, en fazla 3)', '');
  for (const r of summary.results) {
    if (!r.summary?.samples?.length) continue;
    L.push(`### ${r.id}${r.isFixture ? ' — FIXTURE (gerçek değil)' : ''}`, '```json', JSON.stringify(r.summary.samples, null, 2), '```', '');
  }
  return L.join('\n') + '\n';
}

function selftest(summary) {
  const assert = (cond, msg) => { if (!cond) throw new Error(`SELFTEST FAIL: ${msg}`); };
  assert(summary.mode === 'fixture', 'mode fixture olmalı');
  assert(summary.evidence.coverageMeasured === false, 'fixture kapsam ölçümü sayılmamalı');
  assert(summary.results.every((r) => r.isFixture === true), 'tüm kayıtlar isFixture:true olmalı');
  const prices = summary.results.find((r) => r.id === 'open_prices_prices_try');
  assert(prices?.summary?.hasGtinField === true, 'fixture fiyat kaydında product_code olmalı');
  assert(prices.summary.samples.every((s) => !('owner' in s)), 'owner alanı örneklere sızmamalı');
  const stats = summary.results.find((r) => r.id === 'open_prices_stats');
  assert(stats?.status === 'ok', 'stats fixture yüklenmeli');
  const md = renderReport(summary);
  assert(md.includes('FIXTURE'), 'rapor fixture etiketini taşımalı');
  return true;
}

function parseArgs(argv) {
  const args = { mode: null, gtins: [], out: join(__dirname, 'out') };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--live') args.mode = 'live';
    else if (a === '--fixture') args.mode = 'fixture';
    else if (a === '--selftest') args.mode = 'selftest';
    else if (a === '--gtin') args.gtins = String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter((s) => /^\d{8,14}$/.test(s));
    else if (a === '--out') args.out = resolve(String(argv[++i] ?? args.out));
    else throw new Error(`bilinmeyen argüman: ${a}`);
  }
  if (!args.mode) throw new Error('mod seçin: --live | --fixture | --selftest');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'selftest') {
    const summary = buildSummary('fixture', await runFixture());
    selftest(summary);
    process.stdout.write('SELFTEST_OK\n');
    return;
  }
  const results = args.mode === 'live' ? await runLive(args.gtins) : await runFixture();
  const summary = buildSummary(args.mode, results);
  await mkdir(args.out, { recursive: true });
  const jsonPath = join(args.out, `summary.${args.mode}.json`);
  const mdPath = join(args.out, `report.${args.mode}.md`);
  await writeFile(jsonPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  await writeFile(mdPath, renderReport(summary), 'utf8');
  process.stdout.write(`${jsonPath}\n${mdPath}\n`);
  process.stdout.write(`liveRequestsOk=${summary.evidence.liveRequestsOk} coverageMeasured=${summary.evidence.coverageMeasured}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
