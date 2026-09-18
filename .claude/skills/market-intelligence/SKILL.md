---
name: market-intelligence
description: RafSkoru için Türkiye market fiyatı, şube ve yerel ürün verisini yalnız izinli/belgelenmiş kaynaklardan araştırma ve toplama kuralları; Open Prices ölçümü ve kaynak kararı (2026-09-18) buradan okunur. Fiyat kaynağı, haftalık fiyat işi, Market Fiyatı/perakendeci ortaklığı veya probe aracı işlerinde kullan.
---

# Market Intelligence (kompakt)

Kanıt ve karar: `docs/research/turkey-weekly-price-source-spike.md` (+ `docs/research/evidence/`). Araç: `tools/market-source-spike/probe.mjs`.

## Sınırlar (CLAUDE.md, invariants E1–E4, G1–G2)
- Yalnız belgelenmiş, salt okunur uç noktalar veya yazılı izinli feed. Scraping, resmî olmayan API (arşiv `marketfiyati` istemcisi, Apify/MCP "scraper"lar), bot/CAPTCHA aşma, TLS doğrulamasını kapatma, egress engelini dolaşma: yasak.
- Anahtar/hesap/oturum: istemez, üretmez, yazmaz; hesap açma ve dış servise yazma insan onaylıdır.
- Kişisel veri: `owner`, fiş görseli, cihaz kimliği tutulmaz; yalnız beyaz liste alanları (probe `PRICE_FIELD_WHITELIST`).
- Fixture ≠ ölçüm: `isFixture:true` çıktı kapsam iddiası üretmez; kanıt yalnız `--live` çıktısıdır.
- Fiyat alerjen kararına girmez; sentetik fiyat canlı gibi gösterilmez; `source/observedAt/isSynthetic/confidence` uçtan uca korunur.

## Kaynak merdiveni (2026-09-18 durumu)
| Sıra | Kaynak | Durum | Kullanım |
|---|---|---|---|
| 1 | Yazılı izinli feed (Market Fiyatı/TÜBİTAK BİLGEM protokolü, zincir sözleşmesi) | Başvuru yolu; belgelenmiş açık API bulunamadı (yokluğu kanıtlanmadı) — **ölçeklenebilir üretim hedefi budur** | `retailer_feed`; `observedAt` ile `live` olabilir, UI metni iddia sınırından geçer ("resmî fiyat" denmez) |
| 2 | Open Prices (ODbL; API + haftalık JSONL dump) | TR: 27 fiyat / 26 GTIN (21'i OFF-TR etiketli) / 14 konum; 27/27 `proof_id` bağlantılı, içerik doğrulanmamış — kapsam yetersiz, şema uygun | `open_prices` (yol A: kısa vadeli, insan emeğine dayalı köprü; **otomatik haftalık fiyat çözümü değildir**); `recent/stale`, asla `live` |
| 3 | Kanıtlı saha gözlemi (etiket/fiş fotoğrafı, ekip) | MVP yolu A | `manual_beta` + `verified_observation` |
| 4 | Ticari sağlayıcı | Yöntem ve hak yazılı değilse reddet; ADR gerekir | — |
| ✗ | Resmî olmayan API / scraping | Yasak | — |

Bilinen sözleşme boşlukları (kod öncesi ADR-004): `PriceSource/PriceStatus` yeni değer, `PriceConfidenceStatus`'ta `stale` yok, doğrulama düzeyi alanı yok, `remember()` kapısı status bazlı, `retailer_scraper` ölü değer. Okul/kantin gibi konumlar içe alınmaz.

## Asgari fiyat kaydı
`gtin` (check-digit doğrulanmış), `retailerId/storeId` (+OSM id varsa), `price`, `currency`, `priceIsDiscounted`, `observedAt` (gözlem tarihi; çekim tarihi değil), `source`, `proofType` (`price_tag|receipt|none`), `verification` (`verified_observation|community_proof|unverified`), `isSynthetic=false`, `matchType=barcode`, `missingFields`.
GTIN'siz kayıt fiyat kaynağıyla eşleşemez (seed-candidates bugün GTIN'siz).

## Haftalık iş (kod öncesi onay şart)
1. Kaynak başına ayrı bağdaştırıcı; haftalık, idempotent, hız sınırlı (≥1 s aralık), User-Agent'lı.
2. Sorgu yalnız bilinen GTIN listesi veya dump filtresi; tüm veritabanı çekilmez.
3. Değişen fiyat yeni gözlemdir; eski silinmez. >7 gün `stale`; sentetik/`unverified` kayıttan `last_known` türetilmez.
4. Başarısız kaynak diğer fiyatları sıfırlamaz; son gözlem tarihi görünür.

## Probe kullanımı
`node tools/market-source-spike/probe.mjs --selftest` → `SELFTEST_OK`; canlı: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<ca> node … --live --gtin <3 geçerli GTIN>`; en fazla 10 istek/çalıştırma. Çıktı `docs/research/evidence/` altına tarihli kopyalanır.

## Durma koşulları
İzin/lisans belirsiz · oturum/CAPTCHA/bot engeli · GTIN eşleşmesi güvenilir değil · konum/sağlık profili backend'e gidecek · yeni paket/servis/hesap gerekli · `PriceSource` veya sözleşme tipi değişecek (S2) → dur, insana sor.
