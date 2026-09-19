# ADR-006 — Cihaz içi OCR aday katmanı (Aşama 7)

Durum: Kabul edildi (kapsamlı sınır ile) · Tarih: 2026-09-19

## Bağlam

Aşama 6, kullanıcının çektiği ambalaj fotoğraflarından aday metni yalnız **elle yazım** veya
geliştirme fixture'ı ile üretiyordu (`src/localProduct/types.ts` eski docstring: "OCR sınırı: bu
sürümde OCR entegrasyonu YOK"). Bu görev, fotoğrafı hiçbir zaman cihaz dışına çıkarmadan ham metin
adayı üretecek bir OCR motoru seçmeyi ve — yalnızca kapı koşulları sağlanırsa — entegre etmeyi
amaçlar. OCR çıktısı hiçbir zaman alerjen eşleşmesine, risk motoruna, RafSkoru'na, alternatif
filtresine veya `locally_reviewed`/`rafskoru_verified` durumuna doğrudan aktarılmaz; yalnızca
mevcut insan inceleme akışına (ADR-005) bir *aday* olarak girer.

## Karşılaştırılan dört yol

| # | Yol | Sürüm (npm, doğrulandı) | Lisans | SDK 54 / RN 0.81 kanıtı | Android metin tanıma kanıtı | Model | Ağ | Bakım |
|---|---|---|---|---|---|---|---|---|
| 1 | `@infinitered/react-native-mlkit-text-recognition` v5 | 5.0.1 (yayın: 2025-11-25) | MIT | **Reddedildi** — bkz. aşağı | Gerçek Kotlin kaynağı, gerçek `com.google.mlkit:text-recognition:16.0.1` | Gömülü (Google ML Kit) | Yok (OCR için) | Aktif monorepo (444 ⭐), ama bu modül npm'de eski kalmış |
| 2 | `rn-mlkit-ocr` | 0.3.1 (yayın: 2026-01-22) | MIT | **Kabul edildi** — bkz. aşağı | Gerçek Kotlin kaynağı, gerçek Google ML Kit (bundled/unbundled seçilebilir) | Yapılandırılabilir (bundled seçildi) | Yalnız `ocrUseBundled:false` ise (biz `true` kullanıyoruz → yok) | En yeni yayın tarihi, 0 açık issue, `create-react-native-library` iskeleti |
| 3 | `expo-mlkit-ocr` | 0.2.7 (yayın: 2026-05-06) | MIT | **Reddedildi** — bkz. aşağı | Gerçek Kotlin kaynağı (Expo Modules DSL), gerçek `com.google.mlkit:text-recognition:16.0.1` | Gömülü | Yok | Genç paket (23 commit), tek dil (Latin) |
| 4 | Yerel Expo native module (ML Kit sarmalayıcı) | — | — | Değerlendirilmedi (gerek kalmadı) | — | — | — | Gereksiz ek bakım yükü; hazır seçenek 2 kapıyı geçti |

## Doğrulama yöntemi

Her paket için **npm registry** (`npm view`, sürüm geçmişi, `dependencies`/`devDependencies`)
ve **yayınlanan tarball'ın gerçek dosya ağacı** (`npm pack` + `tar xzf`, Android `build.gradle` ve
Kotlin kaynağı dâhil) doğrudan indirilip okundu. Bu, yalnız README iddiasına değil, gerçekte
kurulacak paket koduna dayanan bir doğrulamadır (bkz. görev madde 4, "yalnız README iddiası değil").
GitHub API'sine bu oturumdan erişim kapsam dışı olduğu için (`add_repo` gerektirir), kaynak kod
doğrulaması `raw.githubusercontent.com` ve `npm pack` üzerinden yapıldı; API gerektiren dosya
ağacı sorguları atlandı.

## 1) Infinite Red `react-native-mlkit-text-recognition` v5 — RED

**Ret gerekçesi (SDK 54 kapı koşulu, birincil kaynak + paket koduyla doğrulanmış):**

Kütüphanenin kendi README'sindeki resmî uyumluluk tablosu (`github.com/infinitered/react-native-mlkit`, `main` dalı):

| Expo SDK | MLKit (core) |
|---|---|
| ^53.0.0 | ^4.0.0 |
| **^54.0.0** | **^5.0.0** |
| ^56.0.0 | ^6.0.0 |

npm registry sorgusu: `@infinitered/react-native-mlkit-text-recognition@5.0.1` (npm'deki `latest`
etiketi) paketinin **kendi `dependencies` alanı** `@infinitered/react-native-mlkit-core: "3.1.0"`
sabitliyor. `3.1.0` sürümü yukarıdaki tabloya göre **Expo SDK ^52.0.0** satırına denk gelir — SDK
54'ün gerektirdiği `core ^5.0.0` değil. Bu sabitleme paketin **hem 1.1.0 hem 5.0.1** sürümünde
aynı (`npm view ...@1.1.0 dependencies` ve `...@5.0.1 dependencies` birebir `core: 3.1.0`) —
yani "5.0.1" sürüm numarası, monorepo'nun ortak sürüm treni ile birlikte artmış ama modülün kendi
`core` bağımlılığı hiç güncellenmemiş. GitHub `main` dalındaki `package.json` (henüz npm'e
yayınlanmamış) `6.0.0` sürümünde `core: 6.0.0` bağımlılığına atlıyor (SDK ^56.0.0 satırı) —
yani npm'de **SDK 54'ün `core ^5.0.0` satırına denk gelen hiçbir yayınlanmış `text-recognition`
sürümü yok**: ya SDK 52-uyumlu eski core (3.1.0, npm `latest`), ya da SDK 56'yı hedefleyen
yayınlanmamış `main` dalı.

Android tarafı kendi başına incelendiğinde kod gerçek ve çalışır durumda
(`android/src/main/java/.../RNMLKitTextRecognitionModule.kt`, gerçek
`com.google.mlkit:text-recognition:16.0.1`, gerçek `TextRecognition.getClient(...)` çağrısı) —
yani genel README uyarısı ("Android support is currently under active development, some modules
may not function as intended") text-recognition'ı otomatik diskalifiye etmiyor. Ret nedeni bu genel
uyarı değil, **SDK 54 sürüm hizası kanıtının paket kodunda bulunmamasıdır** (görevin kapı koşulu #1).

## 2) `rn-mlkit-ocr` — KABUL (seçilen yol)

**SDK 54 / RN 0.81 kanıtı (paket koduyla doğrulanmış):** Yayınlanan `package.json`
`devDependencies`: `"react-native": "0.81.1"` (projemiz: `0.81.5`, aynı minör hat),
`"@expo/config-plugins": "^54.0.3"` (Expo SDK 54 araç zincirine hizalı),
`"@react-native/babel-preset": "0.81.1"`. Bu, incelenen üç paket arasında bizim tam sürüm
hattımıza (SDK 54 / RN 0.81) en yakın, doğrudan kanıtlanmış eşleşme.

**Android metin tanıma kanıtı:** `npm pack` ile indirilen gerçek tarball içinde
`android/src/main/java/com/rnmlkitocr/RnMlkitOcrModule.kt` — gerçek
`com.google.mlkit:text-recognition:16.0.1` (bundled) / `com.google.android.gms:play-services-mlkit-text-recognition:19.0.1`
(unbundled) bağımlılığı, gerçek `TextRecognition.getClient(...)`, girdi görüntüsünü `file://`,
`content://` ve `http(s)://` yollarından okuyan çalışan kod (stub/TODO değil). Not: modül
`react-native-builder-bob`'un ürettiği **eski köprü** (`ReactContextBaseJavaModule`,
`NativeModules.RnMlkitOcr`) ile çalışıyor; `package.json`'daki `"type": "turbo-module"` etiketine
rağmen JS tarafı codegen TurboModule spesifikasyonu KULLANMIYOR. React Native 0.81'in Yeni
Mimari'si eski köprü modüllerini uyumluluk katmanı üzerinden desteklediği için bu, çalışmayı
engellemez ama "gerçek TurboModule" değil, "Yeni Mimari altında uyumluluk katmanıyla çalışan eski
modül" olarak kaydedilir.

**Fotoğraf/metin cihaz dışına çıkmıyor:** `com.google.mlkit:text-recognition` (bundled model)
kullanıldığında model APK içine gömülür, ilk kullanımda indirme YOKTUR. README'nin belirttiği
varsayılan (`ocrUseBundled: false`, yani modeli ilk kullanımda Google sunucusundan indir) BU
PROJEDE KULLANILMAZ — `app.json` config-plugin girdisinde açıkça `ocrUseBundled: true` ve
`ocrModels: ['latin']` (yalnız Latin/Türkçe karakter desteği; Çince/Japonca/Korece/Devanagari
gömülmez, gereksiz boyut ve kapsam) ayarlandı. Bu ayar olmadan paket varsayılanı bir dış ağ
çağrısı (model indirme) tetikler ki bu, `verification-gates`'teki "Dış servis / API çağrısı" onay
şartına girer; `ocrUseBundled:true` ile bu tamamen ortadan kalkar ve OCR **hiçbir zaman ağa
çıkmaz**.

**Lisans:** Sarmalayıcı MIT. Alttaki `com.google.mlkit:text-recognition` Google'ın ML Kit SDK
şartlarına (ücretsiz, cihaz üzerinde, API anahtarı gerektirmez) tabidir — ödeme veya kota yok.
Hukuki inceleme bu turun kapsamı dışında (`legal-privacy-reviewer` bu turda çalıştırılmadı);
insana not: Google ML Kit SDK Şartları'nın kabulü gerekiyor, proje lisansıyla çakışma tespit
edilmedi.

**Bakım:** npm'de en son güncellenen aday (2026-01-22), 0 açık issue (arama sonucu), standart
`create-react-native-library` iskelesi (tanınır, denetlenebilir yapı). Genç paket (0.1.0→0.3.1,
4 sürüm) — tek geliştiricili risk not edildi.

**Expo Go fallback:** Bare native modül; Expo Go'da `NativeModules.RnMlkitOcr` `undefined`
olacağından `getOcrCapability()` bunu çalışma zamanında algılar (native modül var mı kontrolü),
JS import'u hiçbir zaman hata FIRLATMAZ (yalnız gecikmeli property erişiminde fırlatan bir Proxy
döner; biz o erişime hiç girmiyoruz).

## 3) `expo-mlkit-ocr` — RED

**Ret gerekçesi:** Yayınlanan `package.json` `devDependencies`: `"expo": "^55.0.18"`,
`"react-native": "0.82.1"` — yani paket, **Expo SDK 55 / RN 0.82** ile geliştirilip test edilmiş
(bizim hattımızın BİR SÜRÜM İLERİSİ), SDK 54/RN 0.81 için paket koduyla doğrulanmış bir kanıt yok.
Kod kalitesi iyi (gerçek Expo Modules Kotlin DSL'i, `Module()`/`ModuleDefinition`/`AsyncFunction`,
gerçek `com.google.mlkit:text-recognition:16.0.1`), ama SDK 54 kapı koşulu #1'i geçemiyor. Ayrıca
yalnız Latin script (Çince/Japonca/Korece/Devanagari yok — bizim için sorun değil ama esneklik
farkı), genç paket (23 commit), tek dilli maintainer. `rn-mlkit-ocr` SDK 54 kanıtında kesin üstün
olduğu için karşılaştırma burada durur (madde 3 "kanıtlar eşitse" tercih sırasına gerek kalmadı).

## 4) Yerel Expo native module — değerlendirilmedi

Seçenek 2 kapıyı geçtiği için üçüncü taraf bakım yükü taşımayan ama sıfırdan yazılıp test edilmesi
gereken bu seçenek bu turda araştırılmadı. Gelecekte `rn-mlkit-ocr` terk edilirse ilk sırada
değerlendirilecek yedek.

## Uygulama kapısı sonucu

| Koşul | Sonuç |
|---|---|
| SDK 54 uyumu paket koduyla doğrulandı | ✅ (`rn-mlkit-ocr` devDependencies) |
| Android metin tanıma native kaynakla doğrulandı | ✅ (gerçek Kotlin + ML Kit) |
| Lisans proje ile uyumlu | ✅ MIT + Google ML Kit ücretsiz SDK şartları |
| Fotoğraf/metin harici sunucuya gitmiyor | ✅ yalnız `ocrUseBundled:true` ile — bu proje bunu zorunlu kılıyor |
| API anahtarı / ücretli servis gerekmiyor | ✅ |
| Paket bakımlı / kod denetlenebilir | ✅ (kanıtlı ama genç) |
| Expo Go'da kontrollü fallback mümkün | ✅ `getOcrCapability()` + `UnavailableOcrEngine` |
| Mevcut manuel akış korunuyor | ✅ dokunulmadı; OCR yalnız ek/opsiyonel adım |

Tüm koşullar sağlandığı için **tek bağımlılık** (`rn-mlkit-ocr@0.3.1`) eklendi.

## Eklenen bağımlılık ve config farkı

- `apps/mobile/package.json`: `"rn-mlkit-ocr": "^0.3.1"` eklendi.
- `apps/mobile/package-lock.json`: yeni paket girişleri eklendi (54 satır fark). Bu işlem sırasında
  `npm install`, projede **önceden var olan** (bu göreve ait olmayan, CLAUDE.md'de "mobil lockfile
  şu an senkron değil" diye kayıtlı) `react-dom@19.3.0`/`scheduler@0.28.0` eksikliğini de yan etki
  olarak çözdü — bu, OCR eklemesinin bir parçası değil, `npm install`'ın doğal davranışıdır; ayrı
  olarak not edilir, gizlenmez.
- `apps/mobile/app.json`: `expo.plugins` dizisine
  `["rn-mlkit-ocr", { "ocrModels": ["latin"], "ocrUseBundled": true }]` eklendi. Bu yalnız native
  build yapılandırmasıdır; bu turda `expo prebuild`/EAS build ÇALIŞTIRILMADI, dolayısıyla bu
  ayarın gerçek cihazda etkisi doğrulanmadı (bkz. "Çalıştırılmayan kontroller").
- Yeni ortam bayrağı `EXPO_PUBLIC_LOCAL_OCR` (`apps/mobile/.env.example`'a dokümante edildi,
  varsayılan boş/kapalı) — `isLocalProductRecoveryEnabled()` VE bu bayrak ikisi de açık olmadan
  OCR arayüzü hiç render edilmez.

## OCR verisinin uçtan uca akışı

1. Kullanıcı `package-review.tsx` ekranında, alerjen/içindekiler/ön yüz/besin/miktar alanlarından
   biri için fotoğraf varsa **"Metni cihazda oku"** düğmesine basar (otomatik çalışmaz).
2. `getOcrCapability()` bayrak + native modül varlığını kontrol eder; kapasite yoksa düğme zaten
   pasif/yönlendirici metinle gösterilir, buraya kadar gelinmez.
3. `MlKitOcrEngine.recognize({ photo, field })` yalnız `photo.localUri` (cihaz dosya yolu) ile
   `rn-mlkit-ocr`'ın `recognizeText(uri, 'latin')`'ini çağırır — hiçbir ağ isteği yapılmaz
   (bundled model). Sonuç `OcrRunResult`'a eşlenir: `rawText`, `blocks`, `engine:'mlkit_latin'`,
   `engineVersion`, `photoEvidenceId` (fotoğraf tür+çekim zamanından türetilen kararlı kimlik),
   `capturedAt`, `recognizedAt`, `source:'user_ocr'`, `verificationLevel:'unverified'`,
   `confidence:'low'`, `status`.
4. Ham metin `ReviewFieldCard` içinde salt-okunur "Ham OCR metni" olarak gösterilir VE aynı anda
   mevcut "Düzelt" akışının düzenlenebilir metin kutusuna ön dolgu olarak aktarılır
   (`onDecision({decision:'corrected', correctedText: rawText})`) — kullanıcı bu kutuyu
   değiştirirse ham metin (ayrı state'te tutulur) ASLA üzerine yazılmaz, ikisi ekranda yan yana
   kalır.
5. Kullanıcı Doğrula/Düzelt/Okunamıyor kararını verip "Yerel aday olarak kaydet"e bastığında,
   **değişmemiş** `applyHumanFieldChecks` (review.ts) mevcut mantığıyla `source:'user_ocr'`,
   `confidence:'low'`, `verified:false` bir `FieldEvidence` üretir ve kayıt durumu
   `locally_reviewed_candidate` olur — `rafskoru_verified` DEĞİL. Alerjen alanı bu akışta da hiçbir
   zaman `readable` olmaz (mevcut kural, dokunulmadı).
6. OCR çıktısı hiçbir noktada `riskEngine.ts`, RafSkoru, alternatif filtresi veya OFF/backend'e
   gönderilmez; yalnız cihazdaki taslağa (adım 5 sonrası) girer.

## Expo Go / native modül yok davranışı

`getOcrCapability()` üç durum döndürür: `flag_disabled` (bayrak kapalı → OCR arayüzü hiç
render edilmez, mevcut ekran birebir eskisi gibi çalışır), `native_module_missing` (bayrak açık
ama `NativeModules.RnMlkitOcr` yok — Expo Go veya native modülsüz derleme → düğme pasif,
"OCR bu cihazda kullanılamıyor — elle yazabilirsiniz" metni, elle giriş tamamen açık kalır),
`ready` (native modül var → düğme aktif). İçe aktarma (`import`) hiçbir dalda hata fırlatmaz;
yalnız `recognize()` çağrısı (yalnız `ready` durumunda tetiklenir) başarısız olursa `status:'failed'`
+ "Okuma başarısız — yeniden deneyin veya elle yazın" döner, uygulama çökmez.

## Kesin kapsam dışı (bu turda yapılmadı)

`expo prebuild`, EAS build, geliştirme sertifikası/kimlik bilgisi, fiziksel cihaz/emülatör testi,
backend değişikliği, OFF'a yazma, riskEngine/skor/alternatif filtresi değişikliği, OCR metninden
otomatik alerjen sınıflandırma, `EXPO_PUBLIC_LOCAL_OCR` bayrağının açılması, `main` dalına dokunma,
PR merge. `app.json` config-plugin girdisi eklendi (statik dosya değişikliği) ama hiçbir build
komutu çalıştırılmadı; bu ayarın gerçek Android/iOS derlemesinde çalıştığı bu turda DOĞRULANMADI.
