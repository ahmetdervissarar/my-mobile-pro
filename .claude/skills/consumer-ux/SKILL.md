---
name: consumer-ux
description: RafSkoru mobil ürün sonuç, paket bilgisi ekleme, sepet ve profil ekranları için tüketici odaklı, erişilebilir ve ihtiyatlı arayüz kuralları; üç ürün veri durumu, alerjen kapısı yerleşimi, aday/fixture etiketleri. Ekran, metin veya akış değişikliklerinde kullan.
---

# Consumer UX (kompakt)

Uygulanan örnek: `docs/ux/local-product-recovery.md`, `src/localProduct/ProductDataStateCard.tsx`, `app/package-capture.tsx`.

## Yerleşim sırası (ürün sonucu)
1. Ürün adı / görsel / barkod. 2. Kritik profil alerjen uyarısı. 3. Veri durumu kartı (✔ kullanılabilir · ◐ kısmi · ✕ bulunamadı) + alerjen beyanı bloğu. 4. RAF skoru. 5. Fiyat (mevcut modül, dokunulmaz). 6. Sağlık, içerik, sürdürülebilirlik, veri güveni ayrı paneller.
Alerjen kapısı her zaman skordan öncedir ve puanla dengelenmez.

## Üç veri durumu
- Kullanılabilir: mevcut alanları göster. Kısmi: "Mevcut / Eksik" iki satır; eksik alan tahminle doldurulmaz. Bulunamadı: "Ürün verisi bulunamadı" + "Paket bilgisini ekle" + ad arama + fotoğraf. Mock ürün veya ad/kategori tahmini gösterilmez; `beta_inference` ürün verisi değildir.
- Kısmi kayıt atılmaz; eksik alanlar motorun kendi uyarılarıyla görünür kalır.

## Metin kuralları (E4, P5)
Kullan: "beyana göre içerir", "içerebilir", "belirtilmemiş", "veri yok / doğrulanmamış", "garanti değildir", "etiketi kontrol edin", "aday kayıt, doğrulanmadı".
Kullanma: "güvenli", "güvenli alternatif", "alerjen içermez", "uygun", "temiz", "garanti eder", "sorun yok", "resmî fiyat".
Her aday/fixture/sentetik veri görünür etiket taşır: "GELİŞTİRME FIXTURE — gerçek veri değil", "aday, gönderilmez".

## Paket bilgisi ekleme akışı
Adım = başlık + neden + atlarsan ne olur; "Tekrar çek", "Önceki adım" (gerçek fotoğraf önizlemesiyle) ve "Atla" her adımda (barkod atlanamaz). OCR yoksa sahte sonuç üretme; elle giriş `user_ocr`/`verified=false`. Alerjen alanı boş veya okunamıyorsa durum `unknown_or_unverified`; kullanıcı beyanı asla `readable` olmaz. Taslak cihazda kalır; gönderim sınırı ve sonraki doğrulama görevi ekranda yazılır.
- **Yerel kayıt hatası görünür olmalı.** AsyncStorage/dosya yazımı başarısız olursa "kaydedildi" gösterilmez; kullanıcıya kısa Türkçe hata + tekrar deneme yolu sunulur. Sessiz `catch` ile başarı taklidi yapılmaz.
- **Barkod/GTIN yapısal olarak doğrulanır** (uzunluk 8/12/13/14 + GS1 kontrol basamağı) kayıttan önce; geçersizse görünür hata, kayıt engellenir.
- **Geçici veriyi kalıcıymış gibi sunma.** Kamera/cache URI'si kalıcı değilse ("Fotoğraf çekildi" tek başına yetmez) ekran ve özet bunu açıkça yazar. Kalıcı depolama yeni bağımlılık gerektiriyorsa kurmadan dur, onay iste; geçicilik uyarısıyla devam et.
- **Kamera izni gerekçe-önce.** Ekran açılır açılmaz OS izin isteği tetiklenmez; önce neden gerektiği yazılır, izin yalnız kullanıcının bastığı butonla istenir.

## Alerjen kapısı genişletme (declared vs. trace)
`declared_contains` ("içerir") ve `trace_may_contain` ("içerebilir") ayrı motor kodu ve mesaj gerektirir; biri diğerine indirgenmez. Motor değişikliği (yeni `PROFILE_*_TRACE_MATCH` gibi) proje sahibi onayı + ayrı commit + ADR + `allergen-safety-reviewer` ister (bkz. ADR-004). Kritik uyarı listesi (`CRITICAL_ALLERGEN_CODES`, `src/localProduct/criticalAllergenCodes.ts`) TEK kaynaktır — ana ürünün kritik kartı ve alternatif aday filtresi (`alternativeAllergenFilter.ts`) aynı listeyi ve aynı `evaluateProductRisks` çağrısını kullanır. Yeni kritik kod eklenirse, o kodu üretebilen HER girdi yolu (ana ürün + alternatif aday) veri taşıyacak şekilde güncellenir; bir yol veri taşımıyorsa "kapsam dışı" **geçici** bir not değildir, kapatılana kadar açık madde olarak izlenir (bkz. ADR-004 revizyon geçmişi — bir önceki tur tam da bunu unutup çelişkili belge bıraktı).

**"Kanıt eksik" ≠ "beyan yok" (fail-closed uçtan uca kural, ADR-004 revizyon 4).** Bir tip alanı (`traceAllergens` gibi) mobilde eklenmiş olması, gerçek backend/seed verisinin onu doldurduğu anlamına GELMEZ — önce gerçek yanıt biçimini/dosyasını oku, doğrula. `signals` yokluğu veya bir alanın `undefined` olması "bu alan değerlendirildi, negatif" değil, "bu alan hiç değerlendirilmedi" demektir; ikisini karıştırıp `?? []` gibi bir varsayılanla sessizce "güvenli" saymak yanlıştır. Kullanıcının alerji profili varsa ve adayın kanıtı (declared + trace, HER İKİSİ) eksiksiz değilse, aday gösterilecek "uygun alternatif" listesinden tamamen çıkarılır — kritik eşleşme kontrolüne bile geçilmez. Bu, uydurulmuş bir `verified=true` bayrağıyla DEĞİL, yalnız mevcut veri şeklinin (`Array.isArray` gibi) okunmasıyla yapılır; yeni bir alan/kaynak icat edilmez. En az bir kabul testi GERÇEK veri dosyasını/yanıt biçimini kullanmalıdır — yalnız elle kurulmuş test nesneleri boşluğu gizleyebilir (bkz. `runAlternativeAllergenFilterScenarios.ts` senaryo 14, gerçek `seed-candidates.json`).

## Anahtar kelime eşleştirme riski (kısa/genel kelimeler)
`riskEngine.ts`'teki serbest metin eşleştirmesi (`productContainsAny`) alt dize arar; kısa veya genel
bir kelime (`"nuts"` gibi) ilgisiz kelimelerle ("coconuts", "doughnuts") veya yapılandırılmış dizide başka
bir alerjenle ("peanuts") yanlışlıkla eşleşir. OFF'un TÜR belirtmeyen genel etiketleri (`nuts`,
`crustaceans`, `molluscs`) bu yüzden serbest metinde değil, yalnız yapılandırılmış `allergens`/
`traceAllergens` dizisinde TAM etiket eşleşmesiyle (`arrayHasExactTag`) değerlendirilir. Yeni bir genel
OFF etiketi eklerken: önce "bu kelime başka, ilgisiz veya daha dar bir alerjenin içinde geçer mi?" diye
sor; geçiyorsa serbest metne eklenmez, negatif test yazılır.

## İnsan alan incelemesi (ADR-005)
`app/package-review.tsx` + `src/localProduct/review/*`: fotoğraf ve aday metin yan yana; her alan için
Doğrula / Düzelt / Okunamıyor (≥48 pt, `accessibilityState.selected`). Alerjen bloğu her zaman en üstte ve ilk
öğedir; kullanıcı kararı beyanı `readable` yapmaz, sonuç `locally_reviewed_candidate`tır ("doğrulanmış değil"
etiketi görünür). On ekran durumu `RESOLUTION_UI_COPY`'den gelir; yeni durum eklenirken wording guard'a
başlığı eklenir. Kaynak çatışması gizlenmez: kayıtlı değer ve ambalaj kanıtı yan yana, "kayıt korunuyor"
notuyla. `product-result.tsx` büyütülmez; yeni akış ayrı ekran ve bileşenlerde yaşar.

## Erişilebilirlik
Renk tek anlam taşıyıcısı olmaz (ikon + metin). Dokunma alanı ≥48 pt. Her buton `accessibilityRole` + `accessibilityLabel`; durum değişimi `accessibilityLiveRegion`; devre dışı `accessibilityState`. Dinamik yazı açık; satır yüksekliği ölçeklenir. Teknik alan adı yerine Türkçe etiket.

## Bayrak ve doğrulama
Yeni akış `EXPO_PUBLIC_*` bayrağı arkasında; kapalıyken eski davranış birebir. Değişiklik sonrası: `npx tsc --noEmit`, `npm run smoke:beta-wording` (yeni metinler guard'a eklenir), `runLocalProductScenarios` ve risk senaryoları — güncel sayı için ilgili çalıştırıcının çıktısına bak (bkz. `docs/ux/local-product-recovery.md` "Doğrulama kapıları"), sabit sayı ezberlenmez. Alerjen akışına dokunan değişiklikte `allergen-safety-reviewer` raporu şarttır.

## Yeni ürün/ad araması gibi ikinci bir veri yolu eklerken
Kod yazmadan önce mevcut fallback'in GERÇEKTEN neyi döndürdüğünü doğrula (`grep` ile hangi fonksiyonun
çağrıldığını bul). "Mock veri" varsayımıyla buton gizleme veya yeniden yazma yapma; koddaki ölü/kullanılmayan
mock fonksiyonları (varsa) ayrı, düşük riskli bir temizlik olarak not et, bu görevin kapsamına zorla dahil etme.
