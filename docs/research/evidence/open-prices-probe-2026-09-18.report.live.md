# Market fiyat kaynağı probe raporu (live)

- Üretim: 2026-09-18T17:10:22.542Z · Node v22.22.2 · araç v0.1.1
- **LIVE: Belgelenmiş açık uç noktalara salt okunur gerçek istekler. Kişisel alanlar atılmıştır.**
- Gerçek başarılı istek: 10 · kapsam ölçüldü mü: evet

| Adım | Kaynak | Durum | HTTP | total | kayıt | GTIN alanı | Not |
|---|---|---|---|---|---|---|---|
| open_prices_status | open_prices | ok | 200 | — | — | — |  |
| open_prices_stats | open_prices | ok | 200 | — | — | — |  |
| open_prices_locations_tr | open_prices | ok | 200 | 14 | 14 | hayır | price_count toplam 27 |
| open_prices_locations_turkey | open_prices | ok | 200 | 0 | 0 | — | price_count toplam 0 |
| open_prices_prices_try | open_prices | ok | 200 | 27 | 27 | evet | tarih 2024-07-06…2026-09-05; kanıtlı 27/27; indirimli 2 |
| open_prices_prices_try_last_30d | open_prices | ok | 200 | 5 | 1 | evet | tarih 2026-08-26…2026-08-26; kanıtlı 1/1; indirimli 0 |
| off_products_turkey_count | open_food_facts | ok | 200 | 11404 | 1 | evet |  |
| open_prices_prices_gtin_8690504011521 | open_prices | ok | 200 | 2 | 2 | evet | tarih 2025-08-27…2025-08-27; kanıtlı 2/2; indirimli 0 |
| open_prices_prices_gtin_8690504410911 | open_prices | ok | 200 | 1 | 1 | evet | tarih 2026-01-03…2026-01-03; kanıtlı 1/1; indirimli 0 |
| open_prices_prices_gtin_8691381000486 | open_prices | ok | 200 | 0 | 0 | — |  |

## İstek atılmayan kaynaklar

- **market_fiyati_tubitak_bilgem** (market_fiyati): `skipped_no_documented_interface` — marketfiyati.org.tr / Market Fiyatı (TÜBİTAK BİLGEM) için belgelenmiş açık API veya veri paylaşım başvurusu bulunamadı; erişilebilir entegrasyon kanıtlanamadı. Resmî olmayan istemci (arşiv) kullanılmaz.
- **retailer_public_feeds** (retailers_tr): `skipped_no_documented_interface` — Migros, CarrefourSA, A101, BİM, ŞOK için tüketiciye açık fiyat feed/API belgesi bulunamadı; Trendyol/Hepsiburada geliştirici portalları yalnız satıcı hesabıyla kendi listelemeleri içindir.

## Örnek kayıtlar (beyaz liste alanları, en fazla 3)

### open_prices_status
```json
[
  {
    "status": "running"
  }
]
```

### open_prices_stats
```json
[
  {
    "price_count": 312953,
    "price_type_product_code_count": 302930,
    "price_type_category_tag_count": 10023,
    "price_with_discount_count": 29945,
    "price_currency_count": 92,
    "price_year_count": 16,
    "price_location_country_count": 125,
    "price_kind_community_count": 265392,
    "price_kind_consumption_count": 47561,
    "price_source_web_count": 212057,
    "price_source_mobile_count": 30796,
    "price_source_api_count": 37752,
    "price_source_other_count": 32348,
    "price_in_challenge_count": 24573,
    "product_count": 4508543,
    "product_source_off_count": 4376411,
    "product_source_obf_count": 75631,
    "product_source_opff_count": 14321,
    "product_source_opf_count": 44518,
    "product_with_price_count": 136954,
    "product_source_off_with_price_count": 114965,
    "product_source_obf_with_price_count": 2448,
    "product_source_opff_with_price_count": 388,
    "product_source_opf_with_price_count": 2215,
    "location_count": 7247,
    "location_with_price_count": 6800,
    "location_type_osm_count": 7111,
    "location_type_online_count": 136,
    "location_type_osm_country_count": 125,
    "proof_count": 123051,
    "proof_with_price_count": 115252,
    "proof_type_price_tag_count": 111750,
    "proof_type_receipt_count": 11280,
    "proof_type_gdpr_request_count": 15,
    "proof_type_shop_import_count": 6,
    "proof_kind_community_count": 117092,
    "proof_kind_consumption_count": 5959,
    "proof_source_web_count": 90796,
    "proof_source_mobile_count": 20867,
    "proof_source_api_count": 2409,
    "proof_source_other_count": 8979,
    "proof_currency_count": 92,
    "proof_in_challenge_count": 13203,
    "price_tag_count": 285168,
    "price_tag_status_unknown_count": 66224,
    "price_tag_status_linked_to_price_count": 186129,
    "user_count": 7934,
    "user_with_price_count": 3563,
    "challenge_count": 16,
    "badge_count": 19,
    "badge_with_user_count": 19,
    "product_created_count": 214,
    "product_created_source_off_count": 136,
    "product_created_source_obf_count": 30,
    "product_created_source_opff_count": 4,
    "product_created_source_opf_count": 44,
    "updated": "2026-09-16T01:00:35.416544Z"
  }
]
```

### open_prices_locations_tr
```json
[
  {
    "id": 3489,
    "type": "OSM",
    "osm_id": 656752307,
    "osm_type": "WAY",
    "osm_name": "Mithatpaşa Ortaokulu",
    "osm_address_city": "Akdeniz",
    "osm_address_country": "Türkiye",
    "osm_address_country_code": "TR",
    "osm_tag_key": "amenity",
    "osm_tag_value": "school",
    "price_count": 6,
    "created": "2025-07-25T14:26:54.294319Z",
    "updated": "2026-09-16T08:46:20.689892Z"
  },
  {
    "id": 4847,
    "type": "OSM",
    "osm_id": 867541605,
    "osm_type": "WAY",
    "osm_name": "Pehlivanoğlu",
    "osm_address_city": "Bornova",
    "osm_address_country": "Türkiye",
    "osm_address_country_code": "TR",
    "osm_tag_key": "shop",
    "osm_tag_value": "supermarket",
    "price_count": 5,
    "created": "2026-01-03T14:45:54.740870Z",
    "updated": "2026-09-16T08:55:14.168003Z"
  },
  {
    "id": 4933,
    "type": "OSM",
    "osm_id": 7824886357,
    "osm_type": "NODE",
    "osm_name": "Migros Jet",
    "osm_address_city": "Bornova",
    "osm_address_country": "Türkiye",
    "osm_address_country_code": "TR",
    "osm_tag_key": "shop",
    "osm_tag_value": "convenience",
    "price_count": 2,
    "created": "2026-01-15T07:50:32.455145Z",
    "updated": "2026-01-15T07:50:41.295941Z"
  }
]
```

### open_prices_prices_try
```json
[
  {
    "id": 325734,
    "type": "PRODUCT",
    "product_code": "8683130038161",
    "product_name": null,
    "category_tag": null,
    "price": 75,
    "price_is_discounted": false,
    "price_without_discount": null,
    "discount_type": null,
    "currency": "TRY",
    "date": "2026-09-05",
    "location_id": 7067,
    "location_osm_id": 307995426,
    "location_osm_type": "WAY",
    "proof_id": 132133,
    "source": "Smoothie - OpenFoodFacts",
    "created": "2026-09-05T11:24:39.208215Z",
    "updated": "2026-09-05T11:24:39.216230Z"
  },
  {
    "id": 325448,
    "type": "PRODUCT",
    "product_code": "80050278",
    "product_name": null,
    "category_tag": null,
    "price": 49.9,
    "price_is_discounted": true,
    "price_without_discount": 64.5,
    "discount_type": null,
    "currency": "TRY",
    "date": "2026-09-04",
    "location_id": 7067,
    "location_osm_id": 307995426,
    "location_osm_type": "WAY",
    "proof_id": 132036,
    "source": "Smoothie - OpenFoodFacts",
    "created": "2026-09-04T16:23:01.695105Z",
    "updated": "2026-09-04T16:23:01.702312Z"
  },
  {
    "id": 325502,
    "type": "PRODUCT",
    "product_code": "8690632762876",
    "product_name": null,
    "category_tag": null,
    "price": 80,
    "price_is_discounted": false,
    "price_without_discount": null,
    "discount_type": null,
    "currency": "TRY",
    "date": "2026-09-04",
    "location_id": 6964,
    "location_osm_id": 256284875,
    "location_osm_type": "WAY",
    "proof_id": 132068,
    "source": "Smoothie - OpenFoodFacts",
    "created": "2026-09-04T18:09:33.279541Z",
    "updated": "2026-09-04T18:09:33.287164Z"
  }
]
```

### open_prices_prices_try_last_30d
```json
[
  {
    "id": 319955,
    "type": "PRODUCT",
    "product_code": "8682815041403",
    "product_name": null,
    "category_tag": null,
    "price": 15,
    "price_is_discounted": false,
    "price_without_discount": null,
    "discount_type": null,
    "currency": "TRY",
    "date": "2026-08-26",
    "location_id": 6964,
    "location_osm_id": 256284875,
    "location_osm_type": "WAY",
    "proof_id": 129745,
    "source": "Smoothie - OpenFoodFacts",
    "created": "2026-08-26T17:06:18.408143Z",
    "updated": "2026-08-26T17:06:18.414361Z"
  }
]
```

### off_products_turkey_count
```json
[
  {
    "code": "8691381000486",
    "product_name": "Beypazarı Doğal Maden Suyu",
    "brands": "Beypazarı"
  }
]
```

### open_prices_prices_gtin_8690504011521
```json
[
  {
    "id": 135732,
    "type": "PRODUCT",
    "product_code": "8690504011521",
    "product_name": null,
    "category_tag": null,
    "price": 15.75,
    "price_is_discounted": false,
    "price_without_discount": null,
    "discount_type": null,
    "currency": "TRY",
    "date": "2025-08-27",
    "location_id": 3821,
    "location_osm_id": 11345111069,
    "location_osm_type": "NODE",
    "proof_id": 46214,
    "source": "Smoothie - OpenFoodFacts",
    "created": "2025-08-27T13:31:34.955765Z",
    "updated": "2025-09-09T11:02:41.871729Z"
  },
  {
    "id": 135733,
    "type": "PRODUCT",
    "product_code": "8690504011521",
    "product_name": null,
    "category_tag": null,
    "price": 15.75,
    "price_is_discounted": false,
    "price_without_discount": null,
    "discount_type": null,
    "currency": "TRY",
    "date": "2025-08-27",
    "location_id": 3821,
    "location_osm_id": 11345111069,
    "location_osm_type": "NODE",
    "proof_id": 46215,
    "source": "Smoothie - OpenFoodFacts",
    "created": "2025-08-27T13:48:43.804116Z",
    "updated": "2025-09-09T11:02:44.045561Z"
  }
]
```

### open_prices_prices_gtin_8690504410911
```json
[
  {
    "id": 182022,
    "type": "PRODUCT",
    "product_code": "8690504410911",
    "product_name": null,
    "category_tag": null,
    "price": 46,
    "price_is_discounted": false,
    "price_without_discount": null,
    "discount_type": null,
    "currency": "TRY",
    "date": "2026-01-03",
    "location_id": 4847,
    "location_osm_id": 867541605,
    "location_osm_type": "WAY",
    "proof_id": 62223,
    "source": "Smoothie - OpenFoodFacts",
    "created": "2026-01-03T14:45:55.703364Z",
    "updated": "2026-01-03T14:45:55.708542Z"
  }
]
```

