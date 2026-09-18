# Türkiye haftalık fiyat kaynağı spike — ölçüm, seçenekler, karar

- Tarih: 2026-09-18 · Dal: `spike/turkey-weekly-price-source` (üst: `dec3ebf`) · Ortam: "RafSkoru Research" egress politikası
- Yöntem: yalnız **belgelenmiş, salt okunur, kimlik doğrulamasız** uç noktalara gerçek GET istekleri
  (`tools/market-source-spike/probe.mjs` v0.1.1 + 6 ek ölçüm isteği + 1 OFF örnek sorgusu). Scraping, resmî olmayan API,
  oturum açma, CAPTCHA/bot koruması aşma, sertifika doğrulamasını kapatma **yapılmadı** (E1). Kişisel alan saklanmadı.
- Kanıt: `docs/research/evidence/open-prices-probe-2026-09-18.{summary.live.json,report.live.md}`,
  `docs/research/evidence/open-prices-try-records-2026-09-18.md`. Fixture çıktısı bu belgede hiçbir yerde kullanılmadı.
- Bu belge karar desteğidir; hukuki görüş değildir (bkz. §6).

## 0. Sonuç (özet)

| Soru | Ölçülen / kanıtlanan cevap |
|---|---|
| Open Prices Türkiye'de haftalık fiyat kaynağı olabilir mi? | **Bugün hayır.** TRY para biriminde toplam **27** fiyat, **26** GTIN, **14** konum, son 30 günde **5**, son 365 günde **16** kayıt. Ölçülen kesişim: 26 GTIN'in 24'ü OFF'ta kayıtlı, **21**'i `en:turkey` etiketli → OFF'ta Türkiye etiketli 11.404 ürünün 21'inde (≈%0,18) Open Prices TRY fiyatı var (yöntem §2). |
| Open Prices şema/lisans olarak işe yarar mı? | **Evet, referans şema.** 27/27 kayıtta `proof_id`/kanıt kaydı bağlantısı mevcut (API `proof.type`: 18 PRICE_TAG, 9 RECEIPT; kanıt görsellerinin içeriği doğrulanmadı), GTIN anahtarlı (`product_code`), şube düzeyinde OSM konumu, `date`, indirim bayrağı, ODbL lisansı, belgelenmiş API + haftalık JSONL dump. |
| Market Fiyatı (TÜBİTAK BİLGEM) açık API sunuyor mu? | **Belgelenmiş açık API bulunamadı; yokluğu kesin olarak kanıtlanmadı.** Resmî TÜBİTAK duyurusu 7 zincirin verisinin BİLGEM'e aktarıldığını ve temizlenmiş verinin **CimriMarket ve MarketTamam** ile paylaşıldığını söylüyor → yazılı paylaşım **emsali var**, açık API/başvuru prosedürü **bulunamadı**. Site tek sayfa uygulaması; kullanım koşulları bu ortamda okunamadı (§4.1). |
| Perakendeci resmî API/feed var mı? | **Hayır.** Migros B2B, CarrefourSA/A101/BİM tedarikçi formları ve ŞOK B2B tedarik portalıdır, fiyat verisi erişimi değildir. Trendyol geliştirici API'si yalnız satıcının kendi listeleri içindir (doğrulandı); Hepsiburada aynı model (ikincil kaynak; portal 403). Zincir siteleri egress'te engelli. |
| `seed-candidates.json` GTIN taşıyor mu? | **Hayır.** 11 adayın hiçbirinde `gtin/barcode` alanı yok; depodaki 869… örnek kodların check-digit'i geçersiz (`8690000000001`, `8691004000050`). GTIN anahtarlı hiçbir kaynakla eşleşemez. **Her yolun 1. haftası GTIN atamasıdır.** |
| Önerilen yol | **A — "Kanıtlı gözlem hattı"**: kapalı beta sepeti için haftalık, kanıt kaydı bağlantılı (etiket/fiş fotoğrafı) fiyat gözlemi; kayıt Open Prices'a resmî API ile katkı + backend'e `open_prices` kaynağı olarak haftalık içe aktarım. **A otomatik çevrim içi haftalık fiyat çözümü değildir**; kısa vadeli, insan emeğine dayalı kanıt/ürün doğrulama köprüsüdür ve fiyat sorununu çözmez. Ölçeklenebilir üretim hedefi yazılı izinli BİLGEM (B) veya perakendeci feed'idir (C). Kod öncesi insan onayı gerekir (§7). |
| Yedek yol | **B — Market Fiyatı / TÜBİTAK BİLGEM yazılı veri paylaşımı başvurusu** (A ile paralel başlatılır; cevap gelene kadar kod yazılmaz). |

## 1. Erişim doğrulaması (kısa istekler, 2026-09-18)

| Alan | Sonuç | Not |
|---|---|---|
| prices.openfoodfacts.org, world.openfoodfacts.org | 200 | Ölçüm burada yapıldı |
| marketfiyati.org.tr, tubitak.gov.tr | 200 / 302 | Yalnız duyuru ve sitemap okundu; SPA içeriği JS gerektirir |
| developers.trendyol.com | 200 | Belge okundu (§4.3) |
| developers.hepsiburada.com | **403 (kaynak, AkamaiGHost)** | Aşılmadı; ikincil kaynakla sınırlı |
| www.migros.com.tr, b2b.migros.com.tr, kurumsal.carrefoursa.com, a101, bim, sokmarket, cimri, markettamam, getir | **egress 403 (CONNECT)** | Politika engeli; ToS/tedarikçi sayfaları okunamadı |
| data.gov.tr, resmigazete.gov.tr, mevzuat.gov.tr | **egress 403** | Birincil mevzuat okunamadı → §6 "kaynak bulunamadı" |
| www.gs1tr.org | TLS zinciri doğrulanamadı | Doğrulama kapatılmadı, atlandı |

Engel görülen alan yalnız "engelli" olarak raporlandı; yol aranmadı.

## 2. Open Prices — Türkiye kapsam ölçümü (canlı)

Probe: 10/10 istek `ok`, `coverageMeasured=true`, gecikme 150–830 ms. Küresel: 312.953 fiyat, 136.954 fiyatlı ürün, 7.247 konum, 123.051 kanıt (`/api/v1/stats`, güncelleme 2026-09-16).

| Ölçü | Değer | Uç nokta |
|---|---|---|
| TRY fiyat kaydı (toplam) | **27** | `prices?currency=TRY` |
| Farklı GTIN | **26** | türetildi |
| Konum (ülke adı "Türkiye") | **14** · price_count toplamı 27 | `locations?osm_address_country__like=Türkiye` |
| Konum ("Turkey") | 0 | aynı, `__like=Turkey` |
| Son 30 / 90 / 365 gün | **5 / 5 / 16** | `prices?currency=TRY&date__gte=…` |
| `proof_id` bağlantısı olan kayıt | 27/27; API `proof.type`: PRICE_TAG 18, RECEIPT 9 (kanıt görselleri açılmadı, içerik doğrulanmadı) | `prices` yanıtındaki iç içe `proof` nesnesi |
| İndirimli kayıt | 2 | türetildi |
| Tarih aralığı | 2024-07-06 … 2026-09-05 | türetildi |
| Mağaza adına göre | Migros (tüm formatlar) 11, BİM 3, A101 2, ŞOK 1, Pehlivanoğlu 5, okul kantini 6 | türetildi |
| Kayıt kaynağı | 27/27 OFF mobil uygulaması ("Smoothie") | `source` (kırpılmış) |
| OFF Türkiye etiketli ürün | **11.404** | `off /api/v2/search?countries_tags_en=turkey` |
| 26 GTIN'in OFF'ta bulunma / `en:turkey` etiketi | **24 / 21** (2 GTIN OFF'ta yok, Open Prices `product.source=opf`; 3 GTIN OFF'ta var ama NL/AU/FR etiketli) | `off /api/v2/product/{code}?fields=code,countries_tags` ×26, 1 s aralık |
| OFF-TR kümesinde Open Prices TRY fiyatı olan ürün | **21 / 11.404 ≈ %0,18** (ölçülen kesişim; `docs/research/evidence/off-intersection-2026-09-18.json`) | türetildi |
| Haftalık dump | prices.jsonl.gz **20,9 MB**, locations 1,06 MB, proofs 9,0 MB (last-modified 2026-09-15) | `HEAD /data/*.jsonl.gz` |

GTIN sorguları (üçü de check-digit geçerli; iki pozitif, bir negatif kontrol):

| GTIN | Ürün (OFF) | Open Prices | Seed eşleniği |
|---|---|---|---|
| 8690504011521 | Altınbaşak tahıl cipsi | **2** kayıt, BİM Lapseki, 2025-08-27, 15,75 TRY, PRICE_TAG | `seed-snacks-*` (cips) |
| 8690504410911 | İçim Rahat laktozsuz süt | **1** kayıt, Pehlivanoğlu Bornova, 2026-01-03, 46,00 TRY, RECEIPT | `seed-dairy-002` (laktozsuz süt) |
| 8691381000486 | Beypazarı maden suyu (OFF'ta 57 tarama) | **0** kayıt | `seed-beverages-001` (maden suyu) |

Not: probe raporundaki "kanıtlı" sütunu yalnız `proof_id` alanının dolu olduğunu sayar; kanıt görselinin fiyatla eşleştiği bu çalışmada doğrulanmadı.

OFF ürün verisi tamlığı (en çok taranan 100 Türkiye ürünü): içindekiler metni 81/100, Nutri-Score bilinen 79/100, 869-önekli 54/100.
Daha derin sayfalar OFF tarafından reddedildi (HTTP 503 ve 401); tekrar denenmedi. Bu oran yalnız popüler ürünler için geçerlidir.

Yorum: Türkiye'de Open Prices verisi **birkaç bireysel katkıcının** girişidir; zincir, şube ve ürün kapsamı rastlantısaldır, güncelleme ritmi haftalık değildir.
Ancak şema RafSkoru'nun köken kurallarıyla (G1, G2) birebir uyumludur: `product_code`, `date` (= `observedAt`), `proof` (= kanıt), `location` (= şube), `price_is_discounted`.

## 3. Karar tablosu

| Seçenek | Kapsam (kanıt) | Güncellik | GTIN anahtar | Şube düzeyi | İzin / lisans | Maliyet | İlk veri | Değişmez risk | Karar |
|---|---|---|---|---|---|---|---|---|---|
| **A. Kanıtlı gözlem hattı** — ekip/beta kullanıcısı haftalık etiket-fiş fotoğrafı; Open Prices'a resmî API ile katkı; backend'e haftalık `open_prices` içe aktarımı | Bugün 27 kayıt; MVP hedefi 30 GTIN × 3 mağaza × 4 hafta = ölçülecek | Bizim ritmimiz (haftalık) | Evet | Evet (OSM) | ODbL (atıf + paylaş-benzer; katkı hesabı gerekir) | İşgücü: **planlama varsayımı** ~2–3 saat/hafta (ölçülmedi; 1. saha turunda ölçülecek değişken); API ücretsiz | 1. hafta | Düşük: `isSynthetic=false`, doğrulama düzeyi görünür; alerjen kapısına dokunmaz | **Önerilen** — ODbL uzman görüşü (§8.4) olumlu dönene kadar kod yazılmaz |
| **B. Market Fiyatı / TÜBİTAK BİLGEM yazılı veri paylaşımı** | 7 zincir, ~50 bin ürün, şube bazlı (resmî duyuru; ölçülemedi) | "Anlık" (duyuru) | Bilinmiyor (belge yok) | Duyuruya göre evet | Yazılı protokol gerekir; emsal: CimriMarket, MarketTamam | Bilinmiyor | Belirsiz (haftalar–aylar) | Orta: şartlar okunamadı; KVKK/ticari sır maddeleri belirsiz | **Yedek** — başvuru hemen, kod sonra |
| C. Perakendeci doğrudan ortaklık (Migros, CarrefourSA, A101, BİM, ŞOK) | Zincir başına tam | Zincire bağlı | Muhtemelen | Zincire bağlı | Sözleşme; tedarikçi portalları veri paylaşımı için değil | İş geliştirme süresi | Aylar | Düşük teknik, yüksek zaman | Ertele; B olumsuz dönerse tek zincirle pilot |
| D. Ticari fiyat izleme sağlayıcısı (Price2Spy, REM People vb.) | Türkiye market kapsamı kanıtı bulunamadı | Sağlayıcıya bağlı | Belirsiz | Çoğu çevrim içi fiyat (şube değil) | Sağlayıcının veri toplama yöntemi ve kullanım hakkı **yazılı** olmalı (ADR-002 şartı); aksi E1 ihlali riski | Ücretli | Sözleşmeyle | Yüksek belirsizlik | Reddet (yazılı yöntem+hak kanıtı gelene kadar); ADR gerekir |
| E. Mevcut durum (manual_beta + sentetik referans) | 11 seed, GTIN'siz | Yok | Hayır | Hayır | — | 0 | — | Sentetik fiyat canlı gibi görünme riski sürüyor (G1) | Kabul edilemez son durum; yalnız A'ya köprü |
| F. Resmî olmayan API / scraping (arşiv `marketfiyati` istemcisi, Apify "aktüel scraper" vb.) | — | — | — | — | **Yasak** (CLAUDE.md, E1, ADR-001) | — | — | — | **Reddet** |

Tek önerilen yol: **A**. Tek yedek yol: **B**. C ve D, B'nin sonucuna göre 30 gün sonra yeniden değerlendirilir.
A, otomatik çevrim içi haftalık fiyat çözümü değildir: yalnız kısa vadeli, insan emeğine dayalı bir kanıt/ürün doğrulama köprüsüdür. Ölçeklenebilir üretim hedefi yazılı izinli BİLGEM (B) veya perakendeci feed'idir (C); bu belge fiyat sorununu çözülmüş saymaz.

## 4. Resmî kanal araştırması (yalnız resmî API / feed / yazılı ortaklık)

### 4.1 Market Fiyatı — TÜBİTAK BİLGEM
- Birincil kaynak: TÜBİTAK duyurusu "Zincir Market Fiyatlarına Anında Erişimin Önü Açıldı" (11 Şub 2025), https://tubitak.gov.tr/tr/haber/zincir-market-fiyatlarina-aninda-erisimin-onu-acildi (erişim 2026-09-18). Alıntılar:
  "Merkez Bankası ile birlikte yürütülen proje kapsamında 7 zincir marketin verileri TÜBİTAK BİLGEM sistemlerine aktarıldı. … A101, BİM, CarrefourSA, Hakmar Mağazacılık, MİGROS, Türkiye Tarım Kredi Kooperatifleri ve ŞOK" ·
  "temizlenen veriler, CimriMarkette ve MarketTamam uygulamaları ile paylaşılarak, bu uygulamalar marifetiyle anlık yayınlanıyor."
- marketfiyati.org.tr: `robots.txt` genel izinli; `sitemaps/static.xml` şu sayfaları listeler: `/uygulama-hakkinda`, `/kullanim-kosullari`,
  `/kisisel-verilerin-korunmasi-politikasi`, `/cerez-politikasi`, `/sikca-sorulan-sorular`, `/bize-ulasin`. Sayfalar istemci tarafında
  render edilen tek sayfa uygulamasıdır; `curl` yalnız kabuk döndürdü, headless Chromium ortam proxy sertifikasını tanımadı ve doğrulama
  kapatılmadı → **metin okunamadı**. İnsan görevi: bu altı sayfayı tarayıcıda okuyup API/veri paylaşımı ve yeniden kullanım maddelerini not etmek.
- Belgelenmiş API, geliştirici portalı veya başvuru formu **bulunamadı**. Arşivdeki resmî olmayan istemci (`_archive/skanr-web/src/server/products.functions.ts`)
  kullanılmadı ve kullanılmayacak (ADR-001).
- Yol: `/bize-ulasin` + TÜBİTAK İletişim Merkezi üzerinden yazılı "araştırma/tüketici bilgilendirme amaçlı veri paylaşımı" başvurusu; emsal olarak CimriMarket/MarketTamam paylaşımı referans gösterilir.

### 4.2 Zincir marketler
| Zincir | Bulunan resmî kanal | Fiyat verisi erişimi? | Kaynak (erişim 2026-09-18) |
|---|---|---|---|
| Migros | Migros B2B (tedarikçi/çözüm ortağı platformu) | Hayır; tedarik ve çözüm ortaklığı | https://b2b.migros.com.tr/Home/B2BHakkinda (egress engelli; arama sonucu başlığı) |
| CarrefourSA | Kurumsal tedarikçi formu | Hayır | https://kurumsal.carrefoursa.com/tr/tedarikci-formu (egress engelli) |
| A101 | "Tedarikçi olmak istiyorum" formu, kurumsal satış formu | Hayır | https://www.a101.com.tr/kurumsal-satis-formu (egress engelli) |
| BİM | Tedarikçi başvurusu + "Tedarikçi – İş Ortağı KVKK" metni | Hayır | https://www.bim.com.tr/Categories/696/tedarikci-isortagi-kvkk.aspx (egress engelli) |
| ŞOK | Şok Market B2B portalı | Hayır | https://b2b.sokmarket.com.tr/ (egress engelli) |
Sonuç: beş zincirin de yalnız tedarikçi/iş ortağı kanalı bulundu; tüketici veya üçüncü taraf fiyat feed'i belgesi bulunamadı (yokluğu kanıtlanmadı; siteler egress engelli). Bu zincirlerin verisi resmî olarak yalnız Market Fiyatı üzerinden (B) toplu erişilebilir görünüyor.

### 4.3 Pazaryeri / veri sağlayıcı
- Trendyol Geliştirici Portalı (https://developers.trendyol.com/docs, okundu): satıcı entegrasyonu; "ürün filtreleme servisleri" satıcının kendi ürünleri içindir; üçüncü tarafa pazar geneli fiyat okuma yok.
- Hepsiburada Developer Portal (https://developers.hepsiburada.com/hepsiburada/docs/getting-started → 403): ikincil kaynaklara göre aktif satıcı hesabı + onay gerektirir; yalnız kendi listeleri. Birincil metin okunamadı.
- Cimri / MarketTamam: TÜBİTAK duyurusuna göre Market Fiyatı verisini alan iki uygulama; kendi API'leri hakkında resmî belge bulunamadı (cimri.com 403).
- Price2Spy, REM People, NielsenIQ: Türkiye market/şube kapsamına dair birincil kanıt bulunamadı; ADR-002 "yalnızca sözleşme ve kullanım hakkı açıksa" şartı geçerli.
- Third-party "aktüel scraper"/MCP sunucuları (Apify vb.): resmî olmayan → **reddedildi** (E1).

## 5. Sözleşme etkisi (kod değişmedi; onay gerektiren noktalar)
- `apps/backend/src/price/types.ts:12-17` `PriceSource` bugün `manual_beta | beta_reference | last_known | retailer_scraper | online_test_seed`.
  `retailer_scraper` değeri E1 ile çelişen bir ad taşır ve kullanılmamalıdır; `open_prices` (A) ve `market_fiyati_feed` (B) değerleri **yoktur** → eklenmesi korumalı bölge değişikliğidir (S2), mobil tip aynı PR'da güncellenir (G2).
- `product-data-provenance` skill'i `retailer_feed` (izinli, ileride) sınıfını tanımlar; B bu sınıfa, A ise yeni `open_prices` sınıfına (isSynthetic=false, doğrulama düzeyi `community_proof` veya RafSkoru ekibi girdiyse `verified_observation`) girer.
- Open Prices kaydı → `PriceOffer` (ADR-002) eşlemesi: `product_code→barcode`, `price/currency`, `date→observedAt`, `location.osm_name→marketName`, `location.osm_id→store`, `price_is_discounted→note`, `proof.type→verification`, `matchType=barcode`. `freshnessLabel`: ≤7 gün `recent`, >7 gün `stale`; hiçbir Open Prices kaydı `live` sayılmaz.
- Sentetik/`unverified` kayıttan `last_known` türetilmez kuralı A için de geçerlidir.
- `product-data-contract-reviewer` denetimi (2026-09-18, doğrulanmış satırlar):
  - `retailer_scraper` hiçbir sağlayıcı tarafından üretilmiyor; yalnız tip (`backend types.ts:16`, `mobile types.ts:5`), `attachPriceConfidence` eşlemesi (`priceProviderService.ts:425`, `retailer_scraper→live_api`) ve `confidence.smoke.ts:12` fixture'ında var → ölü kod yolu; ADR-002 "aktif kaynak" listesiyle çelişiyor.
  - `PriceStatus` (`live|manual_beta|beta_reference|last_known|internal_test|unavailable`) "topluluk kanıtlı, canlı değil" durumunu taşıyamıyor; `attachPriceConfidence` (`priceProviderService.ts:414-423`) bilinmeyen durumu `beta_reference`'a (sentetik ima) sıkıştırır → gerçek ama bayat gözlem sentetik gibi etiketlenir (G4 riski). `PriceConfidenceStatus`'ta `stale` yok; `PriceFreshnessLabel` (`live|recent|stale|reference`) ayrı bir enum.
  - `PriceConfidence` doğrulama düzeyi (`verified_observation|community_proof|unverified`) alanı taşımıyor; bu, Open Prices'tan bağımsız **mevcut** bir boşluk (provenance skill'i görünürlüğü zorunlu tutuyor).
  - `lastKnownPriceProvider.ts:36` `remember()` yalnız `status`'a bakıyor (`live|manual_beta`); doğrulama düzeyine bakmıyor → kanıtsız `manual_beta` bugün de `last_known` olabiliyor; `community_proof` kökenli Open Prices kaydı `last_known` üretmemeli.
  - GTIN atanana kadar `open_prices` sağlayıcısı yalnız kullanıcının taradığı gerçek barkod için devreye girebilir; ad/kategori bazlı alternatif ve sepet akışı (`productGroupKey`) ile eşleşemez.
  - Alerjen kapısına etki yok; `allergen-safety-reviewer` devri gerekmiyor.

## 6. Hukuk / gizlilik notları (uzman görüşü gerekir; hüküm değildir)
- Open Prices verisi ODbL: kaynak atfı, paylaş-benzer ve "özgür olmayan veriyle birleştirmeme" şartı (`docs/guides/data.md`, erişim 2026-09-18). RafSkoru'nun manual_beta/seed fiyatlarıyla aynı tabloda birleştirilmesi ODbL "türev veritabanı" sorusunu doğurur → **uzman görüşü**.
- Konum verisi OSM kaynaklıdır (ODbL, atıf zorunlu). Kanıt görselleri (fiş) kişisel veri içerebilir; RafSkoru fiş görselini **saklamaz**, yalnız fiyat satırını alır; `owner` alanı hiçbir katmanda tutulmaz (probe beyaz listesi).
- Open Prices'a katkı (A) katkıcı hesabı ve kullanıcı sözleşmesi gerektirir; hesap açma ve yazma insan onaylıdır (verification-gates). Open Prices'ın kendi ToS/gizlilik metni bu turda **okunmadı**; fiş görselinin Open Prices tarafında saklanması RafSkoru'nun kontrolü dışındadır ve "saklamama" kararı yalnız RafSkoru deposunu kapsar (`legal-privacy-reviewer`, 2026-09-18).
- Gelecekteki `open_prices` içe aktarıcısı probe'daki beyaz liste disiplinini (`tools/market-source-spike/probe.mjs:36-44`; `owner`, `owner_comment`, kanıt görseli, cihaz kimliği hariç) aynen taşımalı ve `product-data-contract-reviewer` tarafından ayrıca doğrulanmalıdır.
- Okul gibi çocukla ilişkilendirilebilir OSM konumları (ör. "Mithatpaşa Ortaokulu", 6 kayıt) içe aktarımda ve saha turunda **hariç** tutulur; yalnız `shop=supermarket|convenience` etiketli konumlar alınır.
- Market Fiyatı kullanım koşulları ve KVKK metni okunamadı (§4.1); B başvurusu öncesi insan tarafından okunmalı.
- Mevzuat sayfaları (mevzuat.gov.tr, Resmî Gazete) egress'te engelli → "kaynak bulunamadı": Tüketicinin Korunması / fiyat etiketi mevzuatı ile fiyat gösteriminin ilişkisi bu belgede dayanaksızdır.

## 7. 30 günlük MVP planı (yol A, ölçülmüş bulgulara dayalı)
Kapsam: kapalı beta sepeti (`seed-candidates.json` 11 ürün → GTIN atanmış 30 ürün), 3 mağaza (şehir **insan kararı**; erişilebilirlik gerekçesiyle Mersin pilot adayıdır — bir Migros, bir BİM, bir A101: Open Prices'ta zaten kaydı olan zincirler; okul/kantin gibi konumlar hariç), 4 haftalık gözlem. A bu planda köprüdür; B başvurusu 1. haftada paralel gönderilir.

| Hafta | İş | Çıktı / ölçüt | Onay kapısı |
|---|---|---|---|
| 1 | Sepete GTIN atama (gerçek ambalajdan; check-digit doğrulama); Open Prices katkı hesabı ve ODbL/ToS okuması; Market Fiyatı sayfalarını (§4.1) insan okur ve B başvuru taslağı yazılır | 30 GTIN'in ≥28'i OFF'ta bulunuyor; başvuru mektubu | Hesap açma + B başvurusu gönderimi: **insan** |
| 2 | 1. saha turu: 3 mağaza × 30 GTIN etiket fotoğrafı; Open Prices resmî API ile yazma (küçük pilot, ≤90 kayıt); `open_prices` içe aktarım tasarımı (ADR-004 taslağı: `PriceSource`/`PriceStatus`/`PriceConfidenceStatus` genişletme + doğrulama düzeyi alanı + `remember()` kapısı, backend ve mobil tip aynı PR'da, UI etiketi "topluluk kanıtlı gözlem — canlı değil") | Yazılan/toplam oran, hata kaydı, **ölçülen saat/hafta** (varsayım 2–3 saat yerine); ADR-004 taslağı | Yazma pilotu ve ADR: **insan**; `product-data-contract-reviewer` raporu |
| 3 | 2. saha turu; içe aktarıcı (yalnız `product_code in (...)` sorgusu veya dump filtresi; haftalık; idempotent; `observedAt=date`, `isSynthetic=false`, doğrulama düzeyi görünür); smoke: 3 GTIN'lik gerçek yanıt fixture'ı | Kapsama: sepetin %≥80'inde ≤7 gün taze fiyat; eşleşme %100 GTIN | Kod PR'ı: verification-gates (tsc, smoke 34+, wording) |
| 4 | 3.–4. saha turu; ölçüm raporu: kapsama, tazelik, saat/hafta maliyeti, indirim oranı, mağaza farkı; B cevabı varsa değerlendirme; C/D için karar | Karar notu: A devam / B geçiş / durdur | İnsan |

Durma koşulları: yazma pilotu %20+ hata verirse; ODbL uzman görüşü "birleştirme yasak" derse; saha maliyeti >4 saat/hafta ise; B protokolü gelirse (A'nın gözlem hattı kanıt olarak sürer, kaynak önceliği B'ye geçer).
Kod hiçbir aşamada `riskEngine.ts`, alerjen kapısı veya skor mantığına dokunmaz; fiyat yalnız fiyat skoru ve sepet toplamına girer, alerjen kararına girmez.

## 8. Açık kararlar (insan)
1. A'yı onaylıyor musun: Open Prices'a katkı hesabı + haftalık saha gözlemi (kim, hangi 3 mağaza)?
2. B başvurusunu hangi kimlikle (kişi/şirket) ve hangi gerekçeyle göndereceğiz?
3. `PriceSource`'a `open_prices` ekleme ve `retailer_scraper` değerini kaldırma/yeniden adlandırma için ADR-004 açılsın mı?
4. ODbL paylaş-benzer sorusu için hukuk görüşü alınacak mı (A'nın ön şartı)?
5. `PriceConfidence`'a doğrulama düzeyi alanı ve `PriceConfidenceStatus`'a `stale` eklenmesi Open Prices'tan **önce** ayrı PR mı, ADR-004 ile birlikte mi? `PriceConfidenceStatus` ile `PriceFreshnessLabel` birleştirilecek mi (migrasyon planı gerekir)?
6. `lastKnownPriceProvider.remember()`'ın kanıtsız `manual_beta`'yı da `last_known` yapması bugünkü bir provenance ihlali olarak ayrı görev açılsın mı?

## 9. Ajan denetimleri (birer tur, salt okunur)
- `legal-privacy-reviewer`: 6 konu; olumlu iddia dili bulunmadı; "kaynak bulunamadı": ODbL tam metni (egress), KVKK m.3 (egress), Open Prices ToS (okunmadı), marketfiyati.org.tr koşulları (SPA). Öneriler §3, §6, §7'ye işlendi.
- `product-data-contract-reviewer`: 7 sapma/ekleme, 3 akış senaryosu; bulgular §5 ve §8'e işlendi. Sözleşme değişikliği mobil+backend'i aynı anda etkilediği için öneri değil sapma listesi verdi (durma koşulu).

## 10. İstek günlüğü
- Probe canlı çalıştırma ×2 (v0.1.0 17:07 UTC ve v0.1.1 17:10 UTC; ikincisi `source` kırpması sonrası; sayılar aynı) = 20 GET.
- Ek ölçüm: 6 GET (Open Prices sayfalama, konum, 30/90/365 gün). OFF: 3 GET (8, 100, derin sayfa → 401/503) + 26 GET ürün kesişimi (`/api/v2/product/{code}`, 2026-09-18 ikinci tur). Dump HEAD ×3. Open Prices şema/kaynak: 4 GET (docs, filters.py, data.md).
- Erişim doğrulaması: ~30 HEAD/GET (tek istek/alan). TÜBİTAK duyurusu 1 GET; marketfiyati 8 GET (kabuk + sitemap + robots); Trendyol 2 GET.
- Yazma isteği: **0**. Kimlik bilgisi: **0**.
