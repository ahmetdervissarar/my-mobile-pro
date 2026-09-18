# Türkiye haftalık fiyat kaynağı spike — ölçüm, seçenekler, karar

- Tarih: 2026-09-18 · Dal: `spike/turkey-weekly-price-source` (üst: `dec3ebf`) · Ortam: "RafSkoru Research" egress politikası
- Yöntem: yalnız **belgelenmiş, salt okunur, kimlik doğrulamasız** uç noktalara gerçek GET istekleri
  (`tools/market-source-spike/probe.mjs` v0.1.1 + 6 ek ölçüm isteği + 1 OFF örnek sorgusu). Scraping, resmî olmayan API,
  oturum açma, CAPTCHA/bot koruması aşma, sertifika doğrulamasını kapatma **yapılmadı** (E1). Kişisel alan saklanmadı.
- Kanıt: `docs/research/evidence/open-prices-probe-2026-09-18.{summary.live.json,report.live.md}`,
  `docs/research/evidence/open-prices-try-records-2026-09-18.md`. Fixture çıktısı bu belgede hiçbir yerde kullanılmadı.
- Bu belge karar desteğidir; hukuki görüş değildir (bkz. §6).
- Revizyon 2026-09-18 (ikinci tur): proje sahibinin önceki oturumlarda kapattığı yollar `docs/research/price-source-history.md` içine kaydedildi; bu belgedeki "önerilen/yedek yol" ve 30 günlük saha planı kaldırıldı. Ölçümler (§1–§2, §4) değişmedi.

## 0. Sonuç (özet)

| Soru | Ölçülen / kanıtlanan cevap |
|---|---|
| Open Prices Türkiye'de haftalık fiyat kaynağı olabilir mi? | **Bugün hayır.** TRY para biriminde toplam **27** fiyat, **26** GTIN, **14** konum, son 30 günde **5**, son 365 günde **16** kayıt. Ölçülen kesişim: 26 GTIN'in 24'ü OFF'ta kayıtlı, **21**'i `en:turkey` etiketli → OFF'ta Türkiye etiketli 11.404 ürünün 21'inde (≈%0,18) Open Prices TRY fiyatı var (yöntem §2). |
| Open Prices şema/lisans olarak işe yarar mı? | **Evet, referans şema.** 27/27 kayıtta `proof_id`/kanıt kaydı bağlantısı mevcut (API `proof.type`: 18 PRICE_TAG, 9 RECEIPT; kanıt görsellerinin içeriği doğrulanmadı), GTIN anahtarlı (`product_code`), şube düzeyinde OSM konumu, `date`, indirim bayrağı, ODbL lisansı, belgelenmiş API + haftalık JSONL dump. |
| Market Fiyatı (TÜBİTAK BİLGEM) açık API sunuyor mu? | **Belgelenmiş açık API bulunamadı; yokluğu kesin olarak kanıtlanmadı.** Resmî TÜBİTAK duyurusu 7 zincirin verisinin BİLGEM'e aktarıldığını ve temizlenmiş verinin **CimriMarket ve MarketTamam** ile paylaşıldığını söylüyor → yazılı paylaşım **emsali var**, açık API/başvuru prosedürü **bulunamadı**. Site tek sayfa uygulaması; kullanım koşulları bu ortamda okunamadı (§4.1). |
| Perakendeci resmî API/feed var mı? | **Hayır.** Migros B2B, CarrefourSA/A101/BİM tedarikçi formları ve ŞOK B2B tedarik portalıdır, fiyat verisi erişimi değildir. Trendyol geliştirici API'si yalnız satıcının kendi listeleri içindir (doğrulandı); Hepsiburada aynı model (ikincil kaynak; portal 403). Zincir siteleri egress'te engelli. |
| `seed-candidates.json` GTIN taşıyor mu? | **Hayır.** 11 adayın hiçbirinde `gtin/barcode` alanı yok; depodaki 869… örnek kodların check-digit'i geçersiz (`8690000000001`, `8691004000050`). GTIN anahtarlı hiçbir kaynakla eşleşemez. **Her yolun 1. haftası GTIN atamasıdır.** |
| Sonuç | **Bugün RafSkoru'nun bütün sepeti kapsayan, otomatik, haftalık ve izinli çevrim içi fiyat kaynağı çözülememiştir.** Open Prices yalnız şema/araştırma referansıdır; üretim fiyat çözümü olarak önerilmez. TÜBİTAK BİLGEM erişimi, zincir ortaklığı, REM People, JoJ/Camgöz, CollectAPI ve haftalık fiziksel raf toplama daha önce kapanmıştır (`price-source-history.md`, proje sahibi beyanı; yazışmalar henüz repoda değil). |
| Bundan sonrası | İnsan kararı gerektiren iki ürün seçeneği (§7): (1) MVP'yi otomatik market karşılaştırması olmadan yayımlamak, fiyat alanı `veri yok`/opsiyonel referans; (2) seçili çevrim içi URL'lerde izinli bir hizmetle dar "çevrim içi referans fiyat" denemesi. Bu belge seçim yapmaz. |

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

## 3. Karar tablosu (durum özeti; önerilen/yedek yol yok)

Kanıt düzeyi: `ölçüldü` = bu depoda kanıt dosyası; `beyan` = proje sahibi tarafından bildirilen geçmiş karar, dayanak yazışmaları henüz repoda değil; `belge` = kamuya açık birincil kaynak. Kapanmış yolların gerekçesi ve yeniden açılma şartı: `docs/research/price-source-history.md`.

| Seçenek | Kapsam | Güncellik | GTIN | Şube | İzin / lisans | Durum | Kanıt düzeyi |
|---|---|---|---|---|---|---|---|
| Open Prices (ODbL; API + haftalık dump) | TR: 27 fiyat / 26 GTIN / 14 konum; OFF-TR kesişimi 21 / 11.404 | Son 30 günde 5 kayıt; haftalık değil | Evet | Evet (OSM) | ODbL; paylaş-benzer sorusu uzman görüşü ister | **Yalnız şema/araştırma referansı**; üretim fiyat kaynağı değil | ölçüldü |
| TÜBİTAK BİLGEM / Market Fiyatı resmî erişim | 7 zincir, ~50 bin ürün (duyuru) | "Anlık" (duyuru) | Bilinmiyor | Duyuruya göre evet | Yazılı protokol gerekir; belgelenmiş açık API bulunamadı | **Kapalı**: görüşme yapıldı, izin alınamadı; yalnız yeni belgelenmiş kamu erişimi veya yeni yazılı davetle açılır | beyan + belge |
| Gizli endpoint / resmî olmayan istemci / scraping / dolaylı MarketTamam-Cimri | — | — | — | — | Yasak (E1, ADR-001) | **Reddedildi (kalıcı)** | beyan + kural |
| Zincir marketlerle doğrudan veri ortaklığı | Zincir başına | Zincire bağlı | Muhtemelen | Zincire bağlı | Sözleşme | **Kapalı (bu aşama)**: birkaç firma ile görüşüldü, erken aşamada gerçekçi değil; 30 günlük çözüm değil | beyan + belge (yalnız tedarikçi portalları bulundu) |
| REM People | 100+ platform, günlük (beyan) | Günlük (beyan) | Belirsiz | Çevrim içi ağırlıklı | API dışarı açılmıyor; kategori bazlı yıllık sözleşme | **Kapalı**: pahalı, aşamaya uygun değil | beyan |
| JoJ / Camgöz | Çalıştı | — | — | — | Kredi modeli | **Kapalı (ana kaynak olarak)**: 500 kredi ≈ 19 istek | beyan |
| CollectAPI | — | — | — | — | — | **Kapalı**: paketli ürün ve zincir market fiyatına uygun değil | beyan |
| Haftalık fiziksel raf/mağaza toplama (eski "yol A") | Ekip emeğiyle sınırlı | Haftalık (emekle) | Evet | Evet | ODbL (Open Prices'a yazılırsa) | **Kapalı**: proje sahibi için operasyonel olarak mümkün ve sürdürülebilir değil; önerilmez | beyan |
| Price2Spy benzeri çevrim içi izleme (seçili URL) | Yalnız seçili çevrim içi ürün URL'leri; raf/şube/tüm sepet yok | Hizmete bağlı | URL eşlemesiyle | Hayır | Hizmetin toplama yöntemi ve kullanım hakkı yazılı olmalı (ADR-002) | **Sınırlı**: en fazla "çevrim içi referans fiyat" (§7 seçenek 2) | beyan |
| Mevcut durum (manual_beta + sentetik referans) | 11 seed, GTIN'siz | Yok | Hayır | Hayır | — | Köprü değil, son durum da değil; sentetik etiket görünür kalmalı (G1) | ölçüldü (kod) |

Sonuç: **Bugün RafSkoru'nun bütün sepeti kapsayan, otomatik, haftalık ve izinli çevrim içi fiyat kaynağı çözülememiştir.** Bu belge önerilen veya yedek yol tanımlamaz; §7'deki iki ürün seçeneği insan kararına bırakılmıştır.

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
- Geçmiş: proje sahibi beyanına göre TÜBİTAK BİLGEM ile resmî erişim görüşmesi daha önce yapıldı ve olumlu izin alınamadı (`price-source-history.md` #1; yazışmalar henüz repoda değil). Yeniden başvuru **önerilmez**; yalnız yeni belgelenmiş kamu erişimi veya TÜBİTAK'tan yeni yazılı davet çıkarsa açılır.

### 4.2 Zincir marketler
| Zincir | Bulunan resmî kanal | Fiyat verisi erişimi? | Kaynak (erişim 2026-09-18) |
|---|---|---|---|
| Migros | Migros B2B (tedarikçi/çözüm ortağı platformu) | Hayır; tedarik ve çözüm ortaklığı | https://b2b.migros.com.tr/Home/B2BHakkinda (egress engelli; arama sonucu başlığı) |
| CarrefourSA | Kurumsal tedarikçi formu | Hayır | https://kurumsal.carrefoursa.com/tr/tedarikci-formu (egress engelli) |
| A101 | "Tedarikçi olmak istiyorum" formu, kurumsal satış formu | Hayır | https://www.a101.com.tr/kurumsal-satis-formu (egress engelli) |
| BİM | Tedarikçi başvurusu + "Tedarikçi – İş Ortağı KVKK" metni | Hayır | https://www.bim.com.tr/Categories/696/tedarikci-isortagi-kvkk.aspx (egress engelli) |
| ŞOK | Şok Market B2B portalı | Hayır | https://b2b.sokmarket.com.tr/ (egress engelli) |
Sonuç: beş zincirin de yalnız tedarikçi/iş ortağı kanalı bulundu; tüketici veya üçüncü taraf fiyat feed'i belgesi bulunamadı (yokluğu kanıtlanmadı; siteler egress engelli). Doğrudan ortaklık proje sahibi beyanına göre daha önce birkaç firma ile görüşüldü ve bu aşamada gerçekçi bulunmadı (`price-source-history.md` #3).

### 4.3 Pazaryeri / veri sağlayıcı
- Trendyol Geliştirici Portalı (https://developers.trendyol.com/docs, okundu): satıcı entegrasyonu; "ürün filtreleme servisleri" satıcının kendi ürünleri içindir; üçüncü tarafa pazar geneli fiyat okuma yok.
- Hepsiburada Developer Portal (https://developers.hepsiburada.com/hepsiburada/docs/getting-started → 403): ikincil kaynaklara göre aktif satıcı hesabı + onay gerektirir; yalnız kendi listeleri. Birincil metin okunamadı.
- Cimri / MarketTamam: TÜBİTAK duyurusuna göre Market Fiyatı verisini alan iki uygulama; kendi API'leri hakkında resmî belge bulunamadı (cimri.com 403).
- Price2Spy, REM People, NielsenIQ: Türkiye market/şube kapsamına dair birincil kanıt bulunamadı; ADR-002 "yalnızca sözleşme ve kullanım hakkı açıksa" şartı geçerli.
- Third-party "aktüel scraper"/MCP sunucuları (Apify vb.): resmî olmayan → **reddedildi** (E1).

## 5. Sözleşme etkisi (kod değişmedi; onay gerektiren noktalar)
- `apps/backend/src/price/types.ts:12-17` `PriceSource` bugün `manual_beta | beta_reference | last_known | retailer_scraper | online_test_seed`.
  `retailer_scraper` değeri E1 ile çelişen bir ad taşır ve kullanılmamalıdır; `open_prices` ve `market_fiyati_feed` değerleri **yoktur** (ikisi de bugün planlanmıyor; kayıt amaçlı) → eklenmesi korumalı bölge değişikliğidir (S2), mobil tip aynı PR'da güncellenir (G2).
- `product-data-provenance` skill'i `retailer_feed` (izinli, ileride) sınıfını tanımlar; B bu sınıfa, A ise yeni `open_prices` sınıfına (isSynthetic=false, doğrulama düzeyi `community_proof` veya RafSkoru ekibi girdiyse `verified_observation`) girer.
- Open Prices kaydı → `PriceOffer` (ADR-002) eşlemesi: `product_code→barcode`, `price/currency`, `date→observedAt`, `location.osm_name→marketName`, `location.osm_id→store`, `price_is_discounted→note`, `proof.type→verification`, `matchType=barcode`. `freshnessLabel`: ≤7 gün `recent`, >7 gün `stale`; hiçbir Open Prices kaydı `live` sayılmaz.
- Sentetik/`unverified` kayıttan `last_known` türetilmez kuralı olası her yeni kaynak için geçerlidir.
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
- Open Prices'a katkı (bugün planlanmıyor) katkıcı hesabı ve kullanıcı sözleşmesi gerektirir; hesap açma ve yazma insan onaylıdır (verification-gates). Open Prices'ın kendi ToS/gizlilik metni bu turda **okunmadı**; fiş görselinin Open Prices tarafında saklanması RafSkoru'nun kontrolü dışındadır ve "saklamama" kararı yalnız RafSkoru deposunu kapsar (`legal-privacy-reviewer`, 2026-09-18).
- Olası bir `open_prices` içe aktarıcısı (bugün planlanmıyor) probe'daki beyaz liste disiplinini (`tools/market-source-spike/probe.mjs:36-44`; `owner`, `owner_comment`, kanıt görseli, cihaz kimliği hariç) aynen taşımalı ve `product-data-contract-reviewer` tarafından ayrıca doğrulanmalıdır.
- Okul gibi çocukla ilişkilendirilebilir OSM konumları (ör. "Mithatpaşa Ortaokulu", 6 kayıt) olası her içe aktarımda **hariç** tutulur; yalnız `shop=supermarket|convenience` etiketli konumlar alınır.
- Market Fiyatı kullanım koşulları ve KVKK metni okunamadı (§4.1); yeniden açılma şartı oluşursa insan tarafından okunmalı.
- Mevzuat sayfaları (mevzuat.gov.tr, Resmî Gazete) egress'te engelli → "kaynak bulunamadı": Tüketicinin Korunması / fiyat etiketi mevzuatı ile fiyat gösteriminin ilişkisi bu belgede dayanaksızdır.

## 7. İnsan kararı gerektiren iki ürün seçeneği (30 günlük saha planı kaldırıldı)

Bu belge seçim yapmaz. Her iki seçenek de "otomatik, haftalık, izinli çevrim içi fiyat kaynağı" sorununu **çözmez**; bunu çözülmüş gibi gösteren metin üretilmez.

### Seçenek 1 — MVP'yi otomatik market karşılaştırması olmadan yayımlamak
Fiyat alanı `veri yok` veya opsiyonel, etiketli referans (`isSynthetic=true` / `beta_reference`, kullanıcıya görünür) olarak kalır; "en ucuz market", "market karşılaştırması" ve sepet toplamı iddiası üretilmez.

| Artı | Eksi |
|---|---|
| Dış kaynak, hesap, sözleşme, anahtar gerekmez; E1/G1 riski yok | Fiyat ve sepet boyutu ürün değerinin bir parçasıdır (`closed-beta-readiness.md` §1); MVP bu boyut olmadan değerlendirilir |
| Sağlık, içerik, alerjen kapısı ve köken alanları bugünkü kodla yayınlanabilir | `priceScore` ağırlığı ve `rafScore` bileşimi "fiyat yok" durumu için gözden geçirilmeli (ADR / insan kararı) |
| Sentetik fiyatın canlı gibi görünme riski ortadan kalkar (seed/reference tamamen gizlenir veya açıkça etiketlenir) | Sepet ekranının değer önerisi daralır; UX yeniden yazılır |
| Mevcut `manual_beta`/`last_known` yolları korunur ama üretimde bayrak arkasında kalır (D4) | Kullanıcı beklentisi yönetimi: "fiyat gelecek" vaadi verilmez |

Durma koşulları: skor bileşiminde fiyatın 0 ağırlığı olumlu iddia dilini bozuyorsa; sentetik referans herhangi bir ekranda etiketsiz görünüyorsa; sepet toplamı hesaplanmaya devam ediyorsa.

### Seçenek 2 — Seçili çevrim içi URL'lerde dar "çevrim içi referans fiyat" denemesi
Yalnız izinli, yazılı sözleşmeli bir çevrim içi fiyat izleme hizmetiyle (Price2Spy benzeri; `price-source-history.md` #8), az sayıda (örn. ≤30) seçili çevrim içi ürün URL'si için. Çıktı "çevrim içi referans fiyat"tır: fiziksel raf fiyatı, şube fiyatı, "en ucuz market" veya tüm sepet kapsamı iddiası üretilmez.

| Artı | Eksi |
|---|---|
| Gerçek, tarihli, kaynaklı bir fiyat gözlemi elde edilir (`isSynthetic=false`, `observedAt`, kaynak URL) | Kapsam seçili URL'lerle sınırlı; sepetin çoğu `veri yok` kalır; haftalık tüm sepet çözümü değildir |
| Fiyat sözleşmesi (`PriceSource`, doğrulama düzeyi, `stale`) gerçek veriyle test edilir | Ücretli hizmet; hizmetin veri toplama yöntemi ve kullanım hakkı **yazılı** değilse E1 ihlali riski; ADR-002 şartı |
| Otomatik ve tekrarlanabilir (hizmet ritmine bağlı) | Çevrim içi fiyat ≠ mağaza fiyatı; UI etiketi ("çevrim içi referans, mağaza fiyatı değil") zorunlu |
| Küçük, geri alınabilir pilot | Hizmet seçimi, hesap, anahtar yönetimi ve sözleşme insan onayı gerektirir (verification-gates) |

Durma koşulları: hizmet veri toplama yöntemini ve kullanım hakkını yazılı veremezse; URL eşlemesi GTIN ile doğrulanamıyorsa; UI'da "mağaza fiyatı" veya "en ucuz" izlenimi oluşuyorsa; maliyet pilot bütçesini aşarsa; hizmet CAPTCHA/bot koruması aşma gerektiriyorsa.

Her iki seçenekte de kod `riskEngine.ts`, alerjen kapısı ve skor mantığına dokunmaz; sözleşme değişikliği (§5) ayrı ADR ve insan onayı ister.

## 8. Açık kararlar (insan)
1. Seçenek 1 mi, Seçenek 2 mi (ya da ikisi sırayla)? Bu belge karar vermez.
2. Seçenek 1 seçilirse: fiyat boyutu skor bileşiminden çıkarılacak mı, yoksa "veri yok" etiketiyle 0 ağırlık mı (ADR)?
3. Seçenek 2 seçilirse: hangi hizmet, hangi URL listesi, bütçe, sözleşmede veri toplama yöntemi ve kullanım hakkı maddesi kim tarafından doğrulanacak?
4. `PriceSource`'taki `retailer_scraper` ölü değerinin kaldırılması/yeniden adlandırılması için ADR-004 açılsın mı (her iki seçenekte de geçerli)?
5. `PriceConfidence`'a doğrulama düzeyi alanı ve `PriceConfidenceStatus`'a `stale` eklenmesi ayrı PR mı, ADR-004 ile birlikte mi?
6. `lastKnownPriceProvider.remember()`'ın kanıtsız `manual_beta`'yı da `last_known` yapması bugünkü bir provenance ihlali olarak ayrı görev açılsın mı?
7. Kapanmış yolların dayanak yazışmaları (`price-source-history.md`, kanıt düzeyi "beyan") repoya eklenecek mi, eklenecekse nereye?

## 9. Ajan denetimleri (birer tur, salt okunur)
- `legal-privacy-reviewer`: 6 konu; olumlu iddia dili bulunmadı; "kaynak bulunamadı": ODbL tam metni (egress), KVKK m.3 (egress), Open Prices ToS (okunmadı), marketfiyati.org.tr koşulları (SPA). Öneriler §3, §6, §7'ye işlendi.
- `product-data-contract-reviewer`: 7 sapma/ekleme, 3 akış senaryosu; bulgular §5 ve §8'e işlendi. (Her iki denetim, saha planı kaldırılmadan önceki sürüm üzerinde yapıldı; ölçüm ve sözleşme bulguları geçerliliğini korur.) Sözleşme değişikliği mobil+backend'i aynı anda etkilediği için öneri değil sapma listesi verdi (durma koşulu).

## 10. İstek günlüğü
- Probe canlı çalıştırma ×2 (v0.1.0 17:07 UTC ve v0.1.1 17:10 UTC; ikincisi `source` kırpması sonrası; sayılar aynı) = 20 GET.
- Ek ölçüm: 6 GET (Open Prices sayfalama, konum, 30/90/365 gün). OFF: 3 GET (8, 100, derin sayfa → 401/503) + 26 GET ürün kesişimi (`/api/v2/product/{code}`, 2026-09-18 ikinci tur). Dump HEAD ×3. Open Prices şema/kaynak: 4 GET (docs, filters.py, data.md).
- Erişim doğrulaması: ~30 HEAD/GET (tek istek/alan). TÜBİTAK duyurusu 1 GET; marketfiyati 8 GET (kabuk + sitemap + robots); Trendyol 2 GET.
- Yazma isteği: **0**. Kimlik bilgisi: **0**.
