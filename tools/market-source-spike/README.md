# market-source-spike — fiyat kaynağı probe aracı

Türkiye'de GTIN düzeyinde haftalık fiyat kaynağı seçeneklerini **belgelenmiş, salt okunur,
kimlik doğrulamasız** uç noktalara gerçek istek atarak ölçer. Üretim koduna bağlı değildir;
`apps/*` içine entegre edilmemiştir. Yalnız Node yerleşikleri (Node ≥ 18, `fetch`); paket yok,
`package.json`/lockfile değişmez.

## Komutlar

```bash
# Kendi kendini test (fixture ile; ağ gerekmez)
node tools/market-source-spike/probe.mjs --selftest

# Fixture modu: yalnız rapor şeklini gösterir; GERÇEK VERİ DEĞİLDİR
node tools/market-source-spike/probe.mjs --fixture

# Canlı mod: belgelenmiş açık uç noktalara gerçek GET istekleri (en fazla 10 istek, 1 s aralık)
node tools/market-source-spike/probe.mjs --live --gtin 8690504012345,8690637012345
```

Çıktılar `tools/market-source-spike/out/` altına yazılır (`--out DIR` ile değiştirilebilir):
`summary.<mode>.json` (makinece okunur) ve `report.<mode>.md` (insan okunur).
`out/` git'e alınmaz; canlı sonuç kanıt olarak `docs/research/` altına elle kopyalanır.

## Sorgulanan kaynaklar

| Adım | Uç nokta | Belge |
|---|---|---|
| `open_prices_status`, `open_prices_stats` | `GET /api/v1/status`, `GET /api/v1/stats` | open-prices `open_prices/api/urls.py` |
| `open_prices_locations_tr` / `_turkey` | `GET /api/v1/locations?osm_address_country__like=…` | `open_prices/api/locations/filters.py` |
| `open_prices_prices_try`, `_last_30d`, `_gtin_*` | `GET /api/v1/prices?currency=TRY…`, `?product_code=…` | `open_prices/api/prices/filters.py` |
| `off_products_turkey_count` | `GET /api/v2/search?countries_tags_en=turkey&page_size=1` | Open Food Facts API v2 |

İstek atılmayan kaynaklar (`notProbed`): Market Fiyatı / TÜBİTAK BİLGEM ve zincir market
feed'leri — belgelenmiş açık arayüz bulunamadığı için `skipped_no_documented_interface`.
Bu araç hiçbir koşulda web sayfası taramaz, resmî olmayan API çağırmaz, oturum açmaz.

## Çıktı sözleşmesi

Her kayıt: `id, source, purpose, url, mode, isFixture, requestedAt, status, httpStatus, latencyMs, summary`.
`status ∈ ok | http_error | network_blocked | timeout | error | fixture_missing`.
`summary`: `total, itemCount, fields, hasGtinField, samples[≤3]` ve fiyat adımlarında
`dateRange, withProofCount, discountedCount, distinctGtins`; konum adımlarında `priceCountSum`.
`evidence.coverageMeasured` yalnız canlı modda ve en az bir `ok` yanıt varsa `true` olur.

## Gizlilik ve kurallar

- Yanıt örneklerinden yalnız beyaz listedeki alanlar saklanır; `owner` gibi kullanıcı alanları atılır.
- Anahtar/parola okunmaz, istenmez, yazılmaz; yalnız anonim GET.
- Fixture (`fixtures/open-prices-sample.json`, `_fixture:true`) uydurma yapı verisidir ve raporda
  her yerde "FIXTURE" etiketiyle görünür; kapsam iddiası üretmez.
- User-Agent uygulama adı ve depo adresi taşır (OFF API nezaket kuralı); e-posta gömülmez.
