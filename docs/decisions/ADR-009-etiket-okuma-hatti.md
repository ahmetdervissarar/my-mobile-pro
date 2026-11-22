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

## Alınan ek kararlar

### 11. Alkollü içecekler betada puanlanmaz (2026-11-18)

Proje sahibi kararı. Pilotta gönüllünün "içecek" diye işaretlediği ürün bir bira çıktı
(Tuborg Gold, alkol %5). Nutri-Score alkollü içeceklere uygulanmaz ve RafSkoru'nun bu
ürünler için anlamlı bir sağlık değerlendirmesi yoktur.

- Alkollü içeceklere RafSkoru puanı verilmez; ekranda ürün türünün puan kapsamında
  olmadığı açıkça söylenir. Puan "veri yok" gibi gösterilmez.
- Alerjen uyarıları (ör. arpa maltından gluten) yine üretilir ve gösterilir.
- Alkollü olduğu yalnız yapılandırılmış veriden anlaşılır: OFF kategori etiketi veya
  onaylayanın seçtiği ürün türü. Ürün adından ("bira", "rakı") çıkarım yapılmaz.
- Gönüllü aracındaki kaba "içecek" kategorisi ürün türü olarak otomatik taşınmaz.
- Uygulama ayrı bir iştir (sözleşme ve skor zincirine dokunur; plan + onay gerekir).

### 12. İçindekiler metinleri farklıysa alerjen kontrolü ikisine bakar (2026-11-19)

Proje sahibi kararı; `allergen-safety-reviewer` bulgusu üzerine (İş 1.5). §7a'ya göre
ekranda daha yeni tarihli metin gösterilir, ama alerjen kontrolü yalnız o metne
bakarsa onaylı metin eksik okunduğunda veya kısaltıldığında OFF metnindeki bir alerjen
uyarısı kaybolabilir (onay, sonucu daha az temkinli yapmamalıdır).

- OFF ile insan onaylı etiket kaydının içindekiler metinleri farklıysa, hangisi
  ekranda gösterilirse gösterilsin alerjen kontrolü **ikisine birden** bakar: alerjen
  iki metinden birinde geçiyorsa uyarı verilir.
- Uygulama: `ProductFacts.allergenCheckIngredientsText` (ürün sayfası risk motoru
  girdisi) ve `ingredientsEvidence.source = 'off_and_rafskoru_verified'` (liste
  çipleri) iki metni birlikte taşır. Ekranda gösterilen `ingredientsText` değişmez.
  Risk motoru ve alerjen kapısı değişmedi. Kabul senaryosu: risk senaryosu 32.

### 13. Etiketteki alerjen ve eser ifadelerinin kuralları (2026-11-19, henüz uygulanmadı)

Etiketten okunan `allergenStatementText` ("… içerir") ve `traceStatementText` ("eser
miktarda … içerebilir") alanları bugün kaydediliyor ama hiçbir değerlendirmeye
girmiyor. Bunları kullanacak iş başlamadan önce kurallar şunlardır (proje sahibi:
"eser miktarda bile olsa alerjen için sıkıntı olabilir"):

1. **İçindekiler yoksa alerjen bilgisi yok.** Onaylı kayıtta içindekiler metni yoksa
   bu ifadelerden alerjen bilgisi üretilmez; kullanıcıya "Alerjen değerlendirmesi
   yapılamadı, ambalaj etiketini kontrol edin" denir (§5 ile aynı). OFF'ta içindekiler
   olsa bile, onaylı kaydın kendi içindekiler metni yoksa onaylı kaydın ifadeleri
   kullanılmaz (ifade ile içindekiler aynı etiketten, aynı onaydan gelmelidir); OFF
   verisi kendi kurallarıyla değerlendirilmeye devam eder.
2. **Eser miktar ciddi bir uyarıdır.** Eser/çapraz bulaşma ifadesi ("içerebilir", "eser
   miktarda", "aynı tesiste üretilmektedir") profildeki bir alerjenle eşleşirse
   kullanıcıya açıkça uyarı verilir. "Düşük risk" diye küçültülmez, puanla
   dengelenmez, "uygun" sonucuyla birlikte gösterilmez (alerjen bir kapıdır).
3. **İfadeler yalnız daha temkinli yönde etki eder.** Beyan veya iz listesine alerjen
   EKLEYEBİLİR, hiçbir zaman ÇIKARAMAZ. "… içermez", "glutensiz", "laktozsuz" gibi
   üretici beyanları hiçbir uyarıyı kaldırmaz ve RafSkoru'nun iddiası olarak
   gösterilmez; gösterilecekse "üretici beyanı" diye etiketlenir. İfadeler alerjen
   **veri durumunu** (`dataStatus`) değiştirmez: "bilinmiyor" durumundaki bir ürün,
   ifade yüzünden "veri var" durumuna geçmez; aksi hâlde listede adı geçmeyen diğer
   alerjenler yanlışlıkla "belirtilmemiş" görünürdü.
4. **İfadenin yokluğu güvenli demek değildir.** Etikette eser ifadesi bulunmaması
   "eser yok" anlamına gelmez; hiçbir ekranda öyle yorumlanmaz.
5. **Belirsizlik temkinli tarafa yazılır.** İfadedeki alerjen tanınamıyor veya
   profildeki bir anahtara güvenle eşlenemiyorsa "etiketi kontrol edin" uyarısı
   verilir; tahminle eşleştirme veya eşleşmeme kararı verilmez.
6. **Modellenmemiş alerjenler.** İfadede geçen ama profilde henüz olmayan alerjenler
   (kereviz, hardal, sülfit, acı bakla — açık karar 1) bilgi olarak gösterilir; profil
   eşleşmesi açık karar 1 çözülünce yapılır.
7. **Onayda ayrı karşılaştırma.** İfadeler kullanılmaya başlamadan önce onay ekranında
   alerjen ve eser ifadeleri için de içindekilerdeki gibi ayrı bir "fotoğrafla
   karşılaştırdım" işareti zorunlu olur ve bu işaret (içindekiler işaretiyle birlikte)
   onaylı kayıtta saklanır; onay anındaki uyarılar onaylanan alanlar üzerinden yeniden
   hesaplanır. (Bugün işaret yalnız içindekiler için var ve saklanmıyor — açık iş.)
8. **Uygulama koşulu.** Risk motoruna veya alerjen kapısına dokunacağı için ayrı plan,
   `allergen-safety-reviewer` incelemesi, yeni risk senaryoları (eser eşleşmesi;
   içindekiler yokken ifade; "içermez" beyanının uyarı kaldırmaması; ifade yokken
   "eser yok" denmemesi) ve proje sahibi onayı gerekir.

### 14. Gıda dışı ürünler kabul edilir ama puanlanmaz (2026-11-19)

Proje sahibi kararı: OFF fotoğraflarından gelen kozmetik, temizlik ve hijyen ürünleri
(ör. yüz jeli, ıslak havlu) reddedilmez; tanınır ama gıda puanı almaz.

- Onaylayan ürün türü olarak "Gıda dışı ürün" (`non_food`) seçer. Tür yalnız bu
  seçimden gelir; OFF kategorisinden veya ürün adından çıkarılmaz. Fotoğrafı gönderenin
  onaylanmamış tür beyanı ürünü puan kapsamı dışına çıkaramaz (aynı kural §11'deki
  alkollü içecek için de geçerlidir).
- Bu ürünlere RafSkoru ve Nutri-Score verilmez; ekranda §11'deki gibi "Puan kapsamında
  değil" yazar ve açıklama gıda dışı ürüne özgüdür. Durum "veri yok" gibi gösterilmez.
- Alerjen kuralları değişmez: alerjen bilgisi yoksa "değerlendirilemedi, etiketi
  kontrol edin" denir; hiçbir gıda dışı ürün "alerjen içermez" veya "güvenli" diye
  gösterilmez.
- Kapsam nedeni olarak onaylayanın seçimi OFF'tan gelen nedenin önüne geçer; kapsam
  içi bir tür seçimi OFF'un kapsam dışı bırakmasını kaldırmaz (yalnız daraltır).
- **Beta sonrası, ayrı iş:** kozmetik/temizlik ürünleri için içerik skoru. Lisansı
  uygun bir içerik maddesi kaynağı (ör. AB CosIng), ayrı ADR ve `legal-privacy-reviewer`
  incelemesi gerektirir; bir içerik maddesine "zararlı" demek ayrıca hassas bir iddiadır.

### 15. İki okuma iki farklı modelle yapılır (2026-11-22)

Proje sahibi kararı (maliyet): Okuma 1 daha hafif bir modelle (Sonnet), Okuma 2
okuyucu dosyasındaki modelle (Opus) yapılır.

- Gerekçe: 8 ürünlük denemede hafif model 7 üründe içindekiler ve besin değerlerini
  Opus okumalarıyla aynı okudu; 1 üründe uzun bir listede iki harf hatası yaptı
  ("tokeferil"). İki okuma farklı modellerden gelince aynı hatayı yapma olasılıkları
  düşer ve karşılaştırma böyle bir hatayı "ayrışan alan" olarak onaylayana gösterir.
- Her okumanın hangi modelle yapıldığı alt ajan dökümünden okunur ve adaya
  `model` alanında kaydedilir; okunamazsa "bilinmiyor" yazılır.
- Okuyucu talimatı ve kuralları iki model için de aynıdır. İki okumayı da hafif
  modele indirmek ayrı karar gerektirir.

**Güncelleme (2026-11-22, proje sahibi kararı): Okuma 2 Codex'e geçti.**

- Codex (OpenAI), proje sahibinin kendi aboneliğiyle, bilgisayarında çalışır. Önce
  partideki bütün ürünleri okur; Claude (Sonnet) yalnız Codex'in içerik bulduğu
  ürünleri okur. İki okuma iki ayrı şirketin modelinden gelir.
- Gerekçe: 8 ürünlük denemede Codex besin değerlerini ve alerjen/eser cümlelerini
  önceki iki okumayla aynı okudu; Sonnet'in hata yaptığı uzun listeyi doğru okudu;
  emin olmadığı içindekiler listesini boş bıraktı.
- Codex'e verilen talimat Claude okuyucusunun kurallarının aynısıdır
  (`apps/backend/scripts/label-pipeline/OKUMA-TALIMATI.md`). Codex yalnız
  `<parti>/reads-codex/<barkod>-2.json` dosyalarını yazar; biçimi bozuk dosya içe
  aktarılmaz. Kayıtta model `codex (<model>)` olarak geçer.
- Veri akışı: OpenAI'ye yalnız Open Food Facts'in herkese açık (CC BY-SA) etiket
  fotoğrafları gider; kişisel veya sağlık verisi gitmez. Kullanıcıların kendi
  çektiği fotoğraflar (intake) bu yoldan okunmaz; o ayrı karar gerektirir.
- Araçlar: `apps/backend/scripts/label-pipeline/` (iş listesi, toplama, karşılaştırma).

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
