---
name: allergen-safety
description: RafSkoru alerjen kapısının kuralları — beyan edilen alerjen, iz/eser uyarısı, belirtilmemiş ve bilinmeyen veri ile profil eşleşmesinin ayrı ele alınması; "veri yok = güvenli" yasağı. Alerjen akışına dokunan her inceleme veya değişiklikte kullan.
---

# Alerjen Güvenliği

## Dört ayrı veri durumu (asla birleştirilmez; hiçbiri "güvenli" anlamına gelmez)
| Durum | Kaynak alanı | Anlamı | Kullanıcı metni |
|---|---|---|---|
| `declared_contains` | `allergenInfo.declaredAllergens` | Mevcut beyan içerdiğini söylüyor | "Beyana göre içerir: …" |
| `trace_may_contain` | `allergenInfo.traceAllergens` | Eser / çapraz bulaşma ihtimali beyan edilmiş | "İçerebilir: …" (kesinlik dili yok) |
| `not_listed_in_available_data` | beyan var, ilgili alerjen listede yok | Kayıtta görünmüyor; **güvenli sayılmaz** | "İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin." |
| `unknown_or_unverified` | `dataStatus='unknown'`, kayıt yok, doğrulanmamış kaynak | Yeterli veya doğrulanmış veri yok | "Alerjen verisi yok / doğrulanmamış. Etiketi kontrol edin." |

## Kesin yasaklar
- "Veri yok" veya "listede yok" → "güvenli / temiz / içermez / uygun" çıkarımı **yasak**. Durum her zaman görünür kalır.
- Ürün adı, kategori, marka, benzer ürün veya LLM çıktısından alerjen üretmek güvenlik kararında **yasak**.
  (`inferBetaContentInput`'ın `allergenDataStatus` üretmesi bu kuralın ihlalidir; skor dışına alınmalı.)
- Alerjen bilgisinin skor bileşeni olması **yasak** (`contentScore` `allergenTransparency` gözden geçirilecek).
- Çapraz bulaşma ihtimalini kesin gerçek gibi ("içerir") yazmak **yasak**.
- Tıbbi eşik, doz, tolerans, "size zarar vermez" ifadeleri **yasak**.

## Profil eşleşmesi kuralları
- Profildeki her `AllergenKey` için `declared_contains` VE `trace_may_contain` ayrı ayrı taranır; iki ayrı uyarı kodu.
- Eşleşme yapılamıyorsa (veri yok) → `PROFILE_ALLERGEN_INFO_MISSING` **her zaman** üretilir; ekran gizlenmez.
- Risk motoru çalışmadıysa (`isEvaluated=false` veya veri eksik) UI "değerlendirilemedi" der; boş liste göstermez.
- Alerjen profili olan kullanıcıya "alternatif" gösterilecekse aday yalnızca `declared_contains` ve
  `trace_may_contain` açısından profille çakışmıyor VE kaynağı doğrulanmışsa gösterilir.
  `unknown_or_unverified` veya yalnızca `not_listed_in_available_data` (örn. OFF'ta listelenmemiş) aday
  hiçbir zaman "güvenli alternatif" etiketiyle önerilmez; en fazla "veri eksik" notuyla listelenir.
- Sepet ve fotoğraf yolları aynı kapıdan geçer; `allergens=[]` olan aday `unknown_or_unverified` sayılır.

## OFF sözlük eşlemesi (AB 14 alerjen → profil anahtarı)
gluten→gluten_wheat · crustaceans, molluscs→shellfish · eggs→egg · fish→fish · peanuts→peanut ·
soybeans→soy · milk→milk (+lactose) · nuts→tree_nuts · sesame-seeds→sesame ·
celery, mustard, sulphur-dioxide-and-sulphites, lupin → **mevcut profilde modellenmemiş zorunlu
alerjenler**: ürün düzeyinde görünür uyarı üretilir ("Beyanda ayrıca: …"), profil eşleşmesi yapılamaz.
crustaceans + molluscs → tek `shellfish` anahtarında birleşik; bu birleştirme gıda uzmanı ve mevzuat
incelemesi gerektirir, kesinleşmiş sayılmaz.
Eşleme tablosu tek yerde tutulur; anahtar kelime listeleri bu tabloyu tamamlar, yerine geçmez.

## Kabul testi şablonu
GIVEN profil={X}, ürün allergenInfo={durum} · WHEN evaluate/alternatives/basket · THEN uyarı kodu +
görünürlük + olumlu güvenlik iddiası yok. Her `AllergenKey` × dört durum için en az bir senaryo.

## Metin kalıpları
Kullan: "beyana göre içerir", "içerebilir", "belirtilmemiş", "veri yok / doğrulanmamış", "etiketi kontrol
edin", "uzman görüşü alın", "güvenli sayılmaz", "garanti değildir".
Kullanma (olumlu iddia): "güvenli", "güvenli alternatif", "alerjen içermez", "sorun yok", "uygun", "temiz", "garanti eder".

## Durma koşulları
- Bir değişiklik `riskEngine.ts`, `CRITICAL_ALLERGEN_CODES` veya alternatif filtresine dokunuyorsa
  → `allergen-safety-reviewer` incelemesi + insan onayı olmadan ilerleme.
- Geniş çaplı alerji özelliği yayımlanmadan önce profil modülü Türkiye mevzuatındaki (Türk Gıda Kodeksi)
  zorunlu alerjen listesinin tamamını kapsamalıdır; kapsamıyorsa yayın kararı durur, insan onayı gerekir.
