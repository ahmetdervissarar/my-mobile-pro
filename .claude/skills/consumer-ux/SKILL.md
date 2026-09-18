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
`declared_contains` ("içerir") ve `trace_may_contain` ("içerebilir") ayrı motor kodu ve mesaj gerektirir; biri diğerine indirgenmez. Motor değişikliği (yeni `PROFILE_*_TRACE_MATCH` gibi) proje sahibi onayı + ayrı commit + ADR + `allergen-safety-reviewer` ister (bkz. ADR-004). Kritik uyarı listesine (`CRITICAL_ALLERGEN_CODES`) yeni kod eklenirse, o kodu üretebilen her girdi yolu (ana ürün, alternatif aday) kontrol edilir; bir yol veri taşımıyorsa (ör. fiyat modülündeki aday sinyalleri) bu açıkça "kapsam dışı" olarak belgelenir, sessizce eksik bırakılmaz.

## Erişilebilirlik
Renk tek anlam taşıyıcısı olmaz (ikon + metin). Dokunma alanı ≥48 pt. Her buton `accessibilityRole` + `accessibilityLabel`; durum değişimi `accessibilityLiveRegion`; devre dışı `accessibilityState`. Dinamik yazı açık; satır yüksekliği ölçeklenir. Teknik alan adı yerine Türkçe etiket.

## Bayrak ve doğrulama
Yeni akış `EXPO_PUBLIC_*` bayrağı arkasında; kapalıyken eski davranış birebir. Değişiklik sonrası: `npx tsc --noEmit`, `npm run smoke:beta-wording` (yeni metinler guard'a eklenir), `runLocalProductScenarios` ve risk senaryoları — güncel sayı için ilgili çalıştırıcının çıktısına bak (bkz. `docs/ux/local-product-recovery.md` "Doğrulama kapıları"), sabit sayı ezberlenmez. Alerjen akışına dokunan değişiklikte `allergen-safety-reviewer` raporu şarttır.

## Yeni ürün/ad araması gibi ikinci bir veri yolu eklerken
Kod yazmadan önce mevcut fallback'in GERÇEKTEN neyi döndürdüğünü doğrula (`grep` ile hangi fonksiyonun
çağrıldığını bul). "Mock veri" varsayımıyla buton gizleme veya yeniden yazma yapma; koddaki ölü/kullanılmayan
mock fonksiyonları (varsa) ayrı, düşük riskli bir temizlik olarak not et, bu görevin kapsamına zorla dahil etme.
