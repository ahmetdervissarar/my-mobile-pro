# Open Prices — TRY fiyat kayıtlarının tamamı (canlı, 2026-09-18)

Kaynak: `GET https://prices.openfoodfacts.org/api/v1/prices?currency=TRY&order_by=-date&size=100` (toplam 27, tek sayfa).
Yalnız beyaz liste alanları; katkıcı (`owner`), kanıt görseli ve istemci cihaz bilgisi tutulmadı. Konum alanları OSM kaynaklıdır (ODbL).
Bu tablo bir kapsam ölçümüdür; hiçbir satır RafSkoru için canlı fiyat sayılmaz (`isSynthetic=false`, doğrulama düzeyi: topluluk katkısı; kanıt kaydı bağlantılı, kanıt içeriği doğrulanmamış).

| # | date | product_code (GTIN) | product_name | price | disc | mağaza (OSM adı) | ilçe | proof.type (API) |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-09-05 | 8683130038161 | algida cornetto oreo | 75.0 TRY | — | Migros | Güngören | PRICE_TAG |
| 2 | 2026-09-04 | 80050278 | Ferrero Rocher t3 | 49.9 TRY | evet | Migros | Güngören | PRICE_TAG |
| 3 | 2026-09-04 | 8690632762876 | NESCAFE Xpress Café Choco | 80.0 TRY | — | Migros | Ataşehir | RECEIPT |
| 4 | 2026-08-29 | 8695077004369 | Natural Yoghurt | 192.0 TRY | — | BİM | Fatih | PRICE_TAG |
| 5 | 2026-08-26 | 8682815041403 | Pürsu 0.5 lt | 15.0 TRY | — | Migros | Ataşehir | PRICE_TAG |
| 6 | 2026-04-05 | 8695077001078 | Dudi Çikolata Kaymak Kornet Dondurma | 19.5 TRY | — | Mithatpaşa Ortaokulu | Akdeniz | PRICE_TAG |
| 7 | 2026-04-05 | 8695077020833 | Kakao | 53.5 TRY | — | Mithatpaşa Ortaokulu | Akdeniz | PRICE_TAG |
| 8 | 2026-04-05 | 1230000168045 | FEASTABLES Milk Choco. | 149.0 TRY | evet | Mithatpaşa Ortaokulu | Akdeniz | PRICE_TAG |
| 9 | 2026-01-16 | 8690547188341 | Kakao | 27.45 TRY | — | MM Migros | Buca | RECEIPT |
| 10 | 2026-01-15 | 8683347030866 | Glutensiz Karabuğday Patlağı | 62.9 TRY | — | Migros Jet | Bornova | PRICE_TAG |
| 11 | 2026-01-15 | 09868687 | Glutensiz Yulaf Ezmesi | 109.95 TRY | — | Migros Jet | Bornova | PRICE_TAG |
| 12 | 2026-01-14 | 8693454000812 | Yeşil İç Mercimek | 77.5 TRY | — | Pehlivanoğlu | Bornova | RECEIPT |
| 13 | 2026-01-04 | 8681324004510 | Kaf Kefir | 36.0 TRY | — | Pehlivanoğlu | Bornova | RECEIPT |
| 14 | 2026-01-04 | 8697471725666 | Pratik Hindi Füme | 43.5 TRY | — | Pehlivanoğlu | Bornova | RECEIPT |
| 15 | 2026-01-03 | 8690504410911 | İçim Rahat Lactose-Free Semi-Skimmed Mil | 46.0 TRY | — | Pehlivanoğlu | Bornova | RECEIPT |
| 16 | 2026-01-03 | 8690533091136 | — | 47.95 TRY | — | Pehlivanoğlu | Bornova | RECEIPT |
| 17 | 2025-08-27 | 8690504011521 | Altınbaşak tahıl cipsi | 15.75 TRY | — | BİM | Lapseki | PRICE_TAG |
| 18 | 2025-08-27 | 8690504011521 | Altınbaşak tahıl cipsi | 15.75 TRY | — | BİM | Lapseki | PRICE_TAG |
| 19 | 2025-08-26 | 8691641380051 | Kakaolu Fındık Kreması | 158.0 TRY | — | Mithatpaşa Ortaokulu | Akdeniz | PRICE_TAG |
| 20 | 2025-08-23 | 8690526748344 | ETi Lifalif BİTTER ÇİKOLATALI YULAF BAR  | 27.5 TRY | — | ŞOK Market | Orhaneli | PRICE_TAG |
| 21 | 2025-08-15 | 5000112664478 | Coca Cola | 50.0 TRY | — | Migros | Selçuklu | PRICE_TAG |
| 22 | 2025-07-25 | 8691020006336 | Karışık Meyve Aromalı Gazoz | 17.5 TRY | — | Mithatpaşa Ortaokulu | Akdeniz | PRICE_TAG |
| 23 | 2025-07-12 | 8680908020885 | İndomie Hazır Noodle Jumbo Paket | 20.75 TRY | — | A101 | Aksu | PRICE_TAG |
| 24 | 2025-05-31 | 8695077157959 | Plastik Poşet | 0.5 TRY | — | Mithatpaşa Ortaokulu | Akdeniz | PRICE_TAG |
| 25 | 2025-05-28 | 8699495573421 | Pistachio Paste | 350.0 TRY | — | Migros | Bodrum | RECEIPT |
| 26 | 2024-10-04 | 8690526689890 | Eti Burçak Kurabi Lokmalık | 25.0 TRY | — | Migros | Deregümü | PRICE_TAG |
| 27 | 2024-07-06 | 8690698512835 | Bran Bread | 36.25 TRY | — | A101 | Avcılar | RECEIPT |

## Türetilmiş sayılar

- Kayıt: 27 · farklı GTIN: 26 · farklı konum: 14
- `proof_id` bağlantısı mevcut: 27/27 · `proof.type` (API alanı; görsel açılmadı, içerik doğrulanmadı): {'PRICE_TAG': 18, 'RECEIPT': 9}
- İndirimli: 2
- Yıla göre: {'2024': 2, '2025': 9, '2026': 16}
- Son 30 / 90 / 365 gün (`date__gte` ile ayrı sorgu): 5 / 5 / 16
- Mağaza adına göre kayıt: {'Migros (tüm formatlar)': 10, 'Mithatpaşa Ortaokulu': 6, 'Pehlivanoğlu': 5, 'BİM': 3, 'A101': 2, 'ŞOK Market': 1}
- Ürün kaynağı (Open Prices `product.source`): {'off': 25, 'opf': 2}

## OFF kesişimi (26 GTIN, `GET /api/v2/product/{code}?fields=code,countries_tags`, 1 s aralık)

- OFF'ta kayıtlı: 24/26 · `en:turkey` etiketli: 21/26 · OFF'ta yok: 8682815041403, 8695077157959 (Open Prices `product.source=opf`) · OFF'ta var, Türkiye etiketi yok: 1230000168045 (NL), 80050278 (AU/MA/NZ/ES), 8699495573421 (FR).
- Ham sonuç: `off-intersection-2026-09-18.json`.

## Ek istekler (probe dışı, salt okunur, 1 s aralık)

| Adım | URL | süre (s) | total |
|---|---|---|---|
| prices_try_p1 | `https://prices.openfoodfacts.org/api/v1/prices?currency=TRY&order_by=-date&size=100&page=1` | 1.2 | 27 |
| locations_tr_cc | `https://prices.openfoodfacts.org/api/v1/locations?osm_address_country_code=TR&order_by=-price_count&size=100` | 0.82 | 7275 |
| try_30d | `https://prices.openfoodfacts.org/api/v1/prices?currency=TRY&date__gte=2026-08-19&size=1` | 0.71 | 5 |
| try_90d | `https://prices.openfoodfacts.org/api/v1/prices?currency=TRY&date__gte=2026-06-20&size=1` | 1.08 | 5 |
| try_365d | `https://prices.openfoodfacts.org/api/v1/prices?currency=TRY&date__gte=2025-09-18&size=1` | 0.95 | 16 |

Not: `locations?osm_address_country_code=TR` filtresi Open Prices tarafından **uygulanmıyor** (7275 = tüm konumlar döndü); belgelenmiş filtre `osm_address_country__like` (`open_prices/api/locations/filters.py:13`). Probe bu yüzden yalnız `__like=Türkiye` (14) ve `__like=Turkey` (0) kullanır.
