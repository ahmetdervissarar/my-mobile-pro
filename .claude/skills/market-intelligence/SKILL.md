---
name: market-intelligence
description: RafSkoru için Türkiye market fiyatı, şube ve yerel ürün verisini yalnız izinli/belgelenmiş kaynaklardan araştırma ve toplama kuralları; Open Prices ölçümü ve kaynak kararı (2026-09-18) buradan okunur. Fiyat kaynağı, haftalık fiyat işi, Market Fiyatı/perakendeci ortaklığı veya probe aracı işlerinde kullan.
---

# Market Intelligence (kompakt)

Kanıt ve karar: `docs/research/turkey-weekly-price-source-spike.md` (+ `docs/research/evidence/`). Karar geçmişi: `docs/research/price-source-history.md`. Araç: `tools/market-source-spike/probe.mjs`.

**Durum (2026-09-18): Bugün RafSkoru'nun bütün sepeti kapsayan, otomatik, haftalık ve izinli çevrim içi fiyat kaynağı çözülememiştir.** Open Prices yalnız şema/araştırma referansıdır.

## Sınırlar (CLAUDE.md, invariants E1–E4, G1–G2)
- Yalnız belgelenmiş, salt okunur uç noktalar veya yazılı izinli feed. Scraping, resmî olmayan API (arşiv `marketfiyati` istemcisi, Apify/MCP "scraper"lar), bot/CAPTCHA aşma, TLS doğrulamasını kapatma, egress engelini dolaşma: yasak.
- Anahtar/hesap/oturum: istemez, üretmez, yazmaz; hesap açma ve dış servise yazma insan onaylıdır.
- Kişisel veri: `owner`, fiş görseli, cihaz kimliği tutulmaz; yalnız beyaz liste alanları (probe `PRICE_FIELD_WHITELIST`).
- Fixture ≠ ölçüm: `isFixture:true` çıktı kapsam iddiası üretmez; kanıt yalnız `--live` çıktısıdır.
- Fiyat alerjen kararına girmez; sentetik fiyat canlı gibi gösterilmez; `source/observedAt/isSynthetic/confidence` uçtan uca korunur.

## Bilinen kapanmış yollar — yeni kanıt olmadan tekrar önerme
Kaynak: `docs/research/price-source-history.md` (proje sahibi beyanı; dayanak yazışmaları henüz repoda değil). Bir yolu yeniden önermeden önce oradaki "yeniden açılma şartı"nın karşılandığını göster.
- TÜBİTAK BİLGEM / Market Fiyatı resmî erişim: görüşüldü, izin alınamadı → yalnız yeni belgelenmiş kamu erişimi veya yeni yazılı davetle.
- Gizli Market Fiyatı endpointleri, resmî olmayan istemciler, scraping, dolaylı MarketTamam/Cimri: kalıcı ret (E1).
- Zincir marketlerle doğrudan veri ortaklığı: bu aşamada gerçekçi değil; 30 günlük çözüm olarak sunma.
- REM People: API dışarı açılmıyor, yıllık kategori sözleşmesi pahalı → kapalı.
- JoJ/Camgöz: 500 kredi ≈ 19 istek → ana kaynak olamaz.
- CollectAPI: paketli ürün/zincir market fiyatına uygun değil → kapalı.
- Haftalık fiziksel raf/mağaza toplama: operasyonel olarak sürdürülemez → önerilen çözüm veya MVP planı değil.
- Price2Spy benzeri: yalnız seçili çevrim içi URL; raf/şube/tüm sepet yok → en fazla "çevrim içi referans fiyat".

Açık ürün seçenekleri (insan kararı, spike §7): (1) MVP'yi otomatik market karşılaştırması olmadan yayımlamak, fiyat `veri yok`/opsiyonel referans; (2) dar "çevrim içi referans fiyat" denemesi, fiziksel raf veya "en ucuz market" iddiası yok.

## Kaynak merdiveni (2026-09-18 durumu)
| Sıra | Kaynak | Durum | Kullanım |
|---|---|---|---|
| 1 | Yazılı izinli feed (kamu veya zincir) | Bugün yok; BİLGEM ve zincir yolları kapalı (yukarıdaki şartlar) | `retailer_feed`; `observedAt` ile `live` olabilir, UI metni iddia sınırından geçer ("resmî fiyat" denmez) |
| 2 | Open Prices (ODbL; API + haftalık JSONL dump) | TR: 27 fiyat / 26 GTIN (21'i OFF-TR etiketli) / 14 konum; 27/27 `proof_id` bağlantılı, içerik doğrulanmamış — kapsam yetersiz, şema uygun | Yalnız şema/araştırma referansı; üretim fiyat çözümü olarak önerilmez |
| 3 | Kanıtlı saha gözlemi (etiket/fiş fotoğrafı) | Kapalı: operasyonel olarak sürdürülemez | Tekil `manual_beta` + `verified_observation` kaydı için sözleşme tanımı korunur |
| 4 | Ticari çevrim içi izleme (seçili URL) | Yalnız "çevrim içi referans fiyat"; yöntem ve hak yazılı değilse reddet; ADR gerekir | `observedAt` + kaynak URL, UI: "mağaza fiyatı değil" |
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
