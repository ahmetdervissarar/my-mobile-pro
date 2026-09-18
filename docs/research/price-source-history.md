# Fiyat kaynağı karar geçmişi (kompakt)

Güncelleme: 2026-09-18. Amaç: önceki oturumlarda kaybolan geçmişi tek yerde tutmak, kapanmış yolların yeni kanıt olmadan yeniden önerilmesini önlemek.

**Kanıt düzeyi tanımları**
- `ölçüldü`: bu depoda kanıt dosyası var (`docs/research/evidence/`).
- `proje sahibi beyanı`: proje sahibi tarafından bildirilen geçmiş karar; dayanak yazışmaları/sözleşme teklifleri **henüz repoda değil**. Yazışma repoya eklenince düzey yükseltilir.
- `belge`: kamuya açık birincil kaynak (URL + erişim tarihi).

## Sonuç (2026-09-18)
**Bugün RafSkoru'nun bütün sepeti kapsayan, otomatik, haftalık ve izinli çevrim içi fiyat kaynağı çözülememiştir.**
Open Prices yalnız şema/araştırma referansıdır (ölçüm: `turkey-weekly-price-source-spike.md` §2); üretim fiyat çözümü değildir.

## Kapanmış yollar — yeni kanıt olmadan tekrar önerme

| # | Yol | Durum | Kapanma gerekçesi | Yeniden açılma şartı | Kanıt düzeyi |
|---|---|---|---|---|---|
| 1 | TÜBİTAK BİLGEM / Market Fiyatı resmî erişim | **Kapalı** | Resmî erişim görüşmesi yapıldı; olumlu API/veri paylaşımı izni alınamadı. | Yalnız (a) yeni, belgelenmiş kamu erişimi (resmî API/açık veri duyurusu, URL ile) veya (b) TÜBİTAK'tan yeni yazılı davet. | proje sahibi beyanı; ek: belgelenmiş açık API bulunamadı (`belge`, spike §4.1) |
| 2 | Gizli Market Fiyatı endpointleri, resmî olmayan istemciler (arşiv `marketfiyati`), scraping, dolaylı MarketTamam/Cimri kullanımı | **Reddedildi (kalıcı)** | E1 / CLAUDE.md yasağı; ADR-001. | Yok. Kaynağın kendisi resmî, belgelenmiş ve yazılı izinli hale gelirse ayrı bir yol olarak (1) altında değerlendirilir. | proje sahibi beyanı + `rafskoru-invariants` E1 |
| 3 | Zincir marketlerle doğrudan veri ortaklığı (Migros, CarrefourSA, A101, BİM, ŞOK vb.) | **Kapalı (bu aşama için)** | Birkaç firma ile görüşüldü; erken aşamada gerçekçi bulunmadı. 30 günlük uygulanabilir çözüm olarak sunulmaz. | Bir zincirden yazılı feed/API teklifi veya imzalı pilot protokolü. | proje sahibi beyanı; ek: yalnız tedarikçi portalları bulundu (`belge`, spike §4.2) |
| 4 | REM People | **Kapalı** | İncelendi/görüşüldü: 100+ platformdan günlük veri topluyor, fakat API normalde dışarı açılmıyor; kategori bazlı yıllık sözleşmeler pahalı ve mevcut aşamaya uygun değil. | Yazılı API erişimi + aşamaya uygun fiyatlama + veri toplama yönteminin ve kullanım hakkının yazılı olması (ADR-002 şartı). | proje sahibi beyanı |
| 5 | JoJ / Camgöz | **Kapalı (ana kaynak olarak)** | Teknik olarak çalıştı; 500 kredi yaklaşık 19 istekte tükendi. Ana fiyat kaynağı olamaz. | Kredi/istek ekonomisi sepet ölçeğinde sürdürülebilir hale gelirse yalnız dar referans amaçlı yeniden değerlendirilebilir. | proje sahibi beyanı |
| 6 | CollectAPI | **Kapalı** | Paketli ürün ve zincir market fiyatı için uygun bulunmadı. | Paketli ürün + zincir market kapsamı belgelenirse. | proje sahibi beyanı |
| 7 | Haftalık fiziksel mağaza/raf fiyatı toplama (eski "yol A", saha turu) | **Kapalı** | Proje sahibi açısından operasyonel olarak mümkün ve sürdürülebilir değil. Önerilen çözüm veya MVP planı değildir. | Ücretli/ortak saha ekibi veya kullanıcı katkısı için ayrı, onaylı bir tasarım; yine de "otomatik haftalık çevrim içi kaynak" sayılmaz. | proje sahibi beyanı |
| 8 | Price2Spy benzeri çevrim içi fiyat izleme hizmetleri | **Sınırlı** (kapalı değil) | Yalnız seçili çevrim içi ürün URL'lerini izleyebilir; fiziksel raf fiyatı, şube fiyatı veya tüm sepet kapsamı sağlamaz. | Yalnız "çevrim içi referans fiyat" olarak, dar denemeyle ve hizmetin veri toplama yöntemi + kullanım hakkı yazılıysa (bkz. spike §7 seçenek 2). | proje sahibi beyanı |

## Açık kalan (henüz kapanmamış) seçenekler
Spike belgesi §7'de iki ürün seçeneği insan kararına bırakılmıştır:
1. MVP'yi otomatik market karşılaştırması olmadan yayımlamak; fiyat alanı `veri yok` / opsiyonel referans.
2. Seçili çevrim içi URL'lerde izinli bir hizmetle dar "çevrim içi referans fiyat" denemesi; fiziksel raf veya "en ucuz market" iddiası yok.

## Bakım kuralı
- Bu tabloya satır eklemek/kapatmak için: kaynak, tarih, kim görüştü, kanıt düzeyi yazılır; yazışma repoya eklenince düzey `proje sahibi beyanı` → `belge` olur.
- Bir ajan veya oturum kapalı bir yolu yeniden önerirse, önce bu tablodaki "yeniden açılma şartı"nın karşılandığını göstermelidir.
