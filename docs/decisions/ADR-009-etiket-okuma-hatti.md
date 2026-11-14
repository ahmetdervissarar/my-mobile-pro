# ADR-009: Yapay zekâ destekli etiket okuma hattı ve "boş ekran yok" çözümleme sırası

Date: 2026-11-14
Status: Accepted (proje sahibi onayı, 2026-11-14 planlama oturumu). "Açık kararlar"
bölümündeki maddeler henüz karara bağlanmamıştır.

## Context

- OFF-TR kataloğu 11.293 ürün içeriyor (`apps/backend/data/off-tr/report.json`):
  1.824 `complete`, 1.790 `usable_for_health`, 1.043 `usable_for_risk`, 6.636 `insufficient`.
  8.498 üründe içindekiler metni yok; hiçbir üründe görsel adresi yok (`withImage: 0`).
- ADR-003'te tanımlı "RafSkoru verified product facts database" kodda hiç üretilmiyor
  (`rafskoru_verified` / `verified_db` backend kaynağında geçmiyor).
- Mobil katkı ekranı (`apps/mobile/app/(tabs)/product-contribution.tsx`) üç fotoğraf çekiyor
  ama yalnız geri bildirim kaydı gönderiyor; fotoğraflar sunucuya gitmiyor.
- Proje sahibi kapalı betayı hızla çıkarmak istiyor ve beta kapsamının bir ürün listesiyle
  sınırlanmasını reddetti: tüketiciye hangi ürünü okutacağı söylenemez; raf önünde boş dönen
  uygulama kullanıcıyı kaybettirir.
- Yerel ürün verisi için ekip/gönüllü yolu (`feat/intake-web`) yedek; ana yol yapay zekâ
  destekli etiket okuma.

## Decision

### 1. Çözümleme sırası ("boş ekran yok")

Barkod okutulduğunda sırayla:

1. RafSkoru doğrulanmış veritabanı (insan onaylı etiket kaydı).
2. Yerel OFF-TR kataloğu.
3. Canlı OFF sorgusu (mevcut yol).
4. Hiçbiri yoksa veya puan için gereken alan eksikse: kullanıcıdan etiket fotoğrafı istenir
   ve hat fotoğrafı okur.

Ürün tanınıyor ama alanı eksikse (ör. ad var, içindekiler yok) eldeki veri gösterilir ve
yalnız eksik parçanın fotoğrafı istenir. Kullanıcı fotoğraf çekmek zorunda değildir.

### 2. Giriş barkoddur

Ürün kimliği GTIN/EAN barkodudur. Ön yüz fotoğrafından ürün tanıma beta kapsamında değildir.
Barkod okunamadığında elle numara girişi sunulur (bugün yok; Faz 3 işi).

### 3. Okuma hattı

| Adım | Yapan | Kural |
|---|---|---|
| Çıkarım | Model (görsel okuma) | Yalnız fotoğrafta görünen metni aktarır. Tamamlama, düzeltme tahmini, ürün adından/kategoriden çıkarım yok. Okunamayan alan `unknown` kalır. |
| Doğrulama | Model (bağımsız ikinci okuma) | Aynı görseli sıfırdan okur; alan alan karşılaştırılır. Uyuşmazlık işaretlenir. |
| Eşleme ve puan | Kod | Barkod araması ve mevcut deterministik skor motoru. Model puan üretmez. |
| Koordinasyon | Kod (kuyruk) | bekliyor → okundu → uyuştu / uyuşmadı → insan onayı → yayında. |
| Onay | İnsan | Görsel ve çıkarılan metin yan yana; onaylayan ve tarih kaydedilir. |

Okunamayan fotoğraf için tahmin üretilmez; kullanıcıdan yeniden çekmesi istenir.

### 4. Veri kökeni ve izinler

- Hattın çıkardığı, henüz onaylanmamış kayıt **aday**dır ve `user_ocr` ile aynı izinlere
  sahiptir: alerjen uyarısı üretmez, "uygun/olumsuz" kararına girmez, skorda yalnız etiketli
  ve düşük güvenle kullanılır. Kesin enum adı Faz 1'de sözleşme incelemesiyle belirlenir.
- İnsan onayından sonra kayıt `rafskoru_verified` olur. "Doğrulama kaydı tam" sayılması için
  `observedAt` + etiket fotoğrafı (ambalaj sürümü kanıtı) + onaylayan kişi kaydı gerekir.
- Köken alanları (`source`, `observedAt`, `confidence`, `missingFields`, alan bazında
  `fieldSources`) uçtan uca korunur.

### 5. Alerjen kuralı (gevşetilmedi)

- Doğrulanmış içindekiler/alerjen beyanı yoksa alerjen değerlendirmesi yapılmaz: ne uyarı
  ne de "listede yok" sonucu üretilir.
- Bu durumda alan boş bırakılmaz; kullanıcıya açıkça "Alerjen değerlendirmesi yapılamadı,
  ambalaj etiketini kontrol edin" denir. Profili olan kullanıcı için
  `PROFILE_ALLERGEN_INFO_MISSING` her zaman üretilir.
- Aday kayıt için alerjen bölümü insan onayına kadar kapalıdır.
- Risk motoru (`riskEngine.ts`) ve alerjen kapısı bu ADR ile değişmez.

### 6. Aday kaydın görünürlüğü

- Fotoğrafı çeken kullanıcı sonucu hemen görür; sonuç "Etiketten okundu, doğrulanmadı"
  ibaresi taşır.
- Diğer kullanıcılar aday kaydı yalnız iki bağımsız okuma uyuştuysa ve aynı ibareyle görür.
- İnsan onayı kaydı doğrulanmış veritabanına taşır.

### 7. Barkod ve sürüm

- Birincil anahtar GTIN'dir. Yeni barkod yeni kayıttır.
- "Aynı ürün" bağlantısı otomatik kurulmaz; yalnız insan onayına sunulan bir öneridir.
- Aynı barkod için farklı içerikli yeni fotoğraf yeni sürüm oluşturur; eski sürüm silinmez
  ve değişiklik insan onayına düşer.

### 7a. Kaynak çelişkisi (2026-11-14 kararı)

OFF verisi ile insan onaylı etiket kaydı aynı alanda farklı değer taşıyorsa, daha yeni
tarihli (`observedAt`) insan onaylı etiket kaydı geçerlidir. Çelişki sessizce çözülmez:
kayıt altına alınır ve proje sahibine ayrıca gösterilir. Onaylanmamış aday kayıt hiçbir
zaman OFF verisinin önüne geçmez.

### 8. İzinli fotoğraf kaynakları

| Kaynak | Durum |
|---|---|
| OFF'taki ürün fotoğrafları (CC-BY-SA, atıfla) | İzinli; toplu ön doldurmanın ilk girdisi |
| Proje sahibinin ve gönüllülerin çektiği fotoğraflar (`feat/intake-web`) | İzinli |
| Kullanıcının uygulamadan gönderdiği fotoğraflar | İzinli; açık bilgilendirme metniyle |
| Market/perakendeci sitelerinden görsel veya metin toplama | **Yasak** (izinsiz scraping; yazılı izin gelirse ayrı ADR) |

### 9. Çalıştırma biçimi ve bütçe

- **Raf başı okuma:** backend'de, Anthropic API ile. İlk okuma anında; doğrulama okuması
  gece toplu işlemde.
- **Toplu ön doldurma** (OFF fotoğrafları, gönüllü fotoğrafları): masaüstü Claude oturumunda,
  mevcut abonelikle; API ücreti doğurmaz.
- API harcaması için sert sınır: beta için toplam 50 ABD doları. Sınır dolunca yeni okumalar
  "sıraya alındı" durumuna geçer.
- Model seçimi, gerçek Türkçe etiket fotoğraflarıyla yapılacak ve maliyeti 1 ABD dolarını
  aşmayacak bir denemeden sonra yapılır.
- API anahtarını proje sahibi oluşturur ve sunucu ortamına koyar; anahtar depoya, mobil koda
  veya sohbet çıktısına girmez.

### 10. Gizlilik

Etiket okuma kaydına yalnız barkod ve etiket fotoğrafları girer. Kullanıcının sağlık/alerji
profili ve kesin konumu bu kayıtlara, backend'e, log'a veya üçüncü tarafa gönderilmez.

## Ayrıca onay gerektiren adımlar (bu ADR onay vermez)

- Yeni npm paketi (Anthropic SDK) ve lockfile değişikliği.
- Sözleşme tipi değişikliği (yeni kaynak sınıfı, doğrulanmış kayıt şeması) —
  `product-data-contract-reviewer` raporuyla.
- Anthropic API'ye ilk çağrı ve 1 dolarlık deneme.
- OFF'a herhangi bir dış çağrı (fotoğraf sayımı dâhil) ve OFF'a geri yazma.
- Commit, push, dal birleştirme.

## Açık kararlar

1. Profile dört zorunlu alerjenin (kereviz, hardal, sülfit, acı bakla) eklenmesi. Risk
   motoruna dokunur; ayrı onay ve `allergen-safety-reviewer` incelemesi ister.
2. (Karara bağlandı, bkz. 7a.)
3. Kullanıcı fotoğraflarının saklama süresi, bilgilendirme/rıza metni ve fotoğrafın Anthropic
   API'ye iletilmesi — `legal-privacy-reviewer` incelemesi ister.
4. OFF fotoğraflarından çıkarılan metnin kendi veritabanımızda saklanmasının lisans ve atıf
   koşulları — aynı inceleme.
5. Fiyat: bu ADR'nin kapsamı dışında; ADR-008 geçerli, konu proje sahibince ertelendi.

## Durma koşulları

- Çıkarım, görselde olmayan bir alan üretiyorsa (tamamlama/tahmin) hat durdurulur.
- İki okuma uyuşma oranı denemede kabul edilebilir düzeyin altındaysa model seçimi ve bütçe
  yeniden görüşülür.
- API harcaması sınıra ulaştığında sınır otomatik yükseltilmez.

## Consequences

- Hiçbir tarama "ürün bulunamadı" çıkmazıyla bitmez; kullanıcı fotoğraf çekerek etiketli bir
  değerlendirme alabilir ve veritabanı her katkıyla büyür.
- Onay tek kişide toplandığı için kuyruk birikebilir; alerjen değerlendirmesi onaya kadar
  kapalı kalır.
- Yeni bir sürekli maliyet kalemi (API) ve yeni bir üçüncü taraf veri akışı (etiket fotoğrafı)
  doğar; ikisi de sınır ve inceleme koşuluna bağlanmıştır.
