# RafSkoru — Proje Talimatı

## Amaç
RafSkoru, Türkiye'deki paketli gıdaları fiyat, sağlık, içerik, kişisel uygunluk,
sürdürülebilirlik ve veri güveni boyutlarında değerlendiren mobil karar destek
sistemidir. Etiket ve doğrulanabilir veri kaynaklarına dayalı, kişiselleştirilmiş
alerjen uyarıları sunan bir tüketici karar destek sistemidir. Hiçbir yerde "otorite",
"garanti", "ürün güvenlidir" veya "alerjen içermez" iddiasında bulunmaz; tıbbi,
beslenme veya satın alma tavsiyesi vermez.

## Mevcut mimari (Eylül 2026 denetimi)
- Monorepo: `apps/mobile` (Expo + React Native + expo-router), `apps/backend` (Express + TS).
- Ana ekran: `apps/mobile/app/product-result.tsx` (parçalanacak; 2.2k satır).
- Backend akışı: `price/priceProviderService.ts::resolve` →
  OFF `productFacts/` → sağlayıcı zinciri (`onlineTestSeed[bayrak] → manual_beta → last_known → beta_reference`)
  → `enrich/` → skorlar (`priceScore/ healthScore/ contentScore/ sustainability/ rafScore/ confidence/`).
- Risk motoru **cihazda** çalışır: `apps/mobile/src/riskEngine/riskEngine.ts`; profil AsyncStorage'da.
- Alternatifler: `data/seed-candidates.json` + `price/alternatives/`; sepet: `basket/`.
- Bilinen borçlar: OFF verisi `isComplete` değilse tamamen atılıyor; isimden skor çıkarımı
  (`inferBeta*`) ikinci bir skor dünyası; sepet üçüncü bir dünya; tüm fiyatlar sentetik;
  mobil/backend tipleri elle kopya. Ayrıntı: denetim raporu (2026-09-18).
- `_archive/skanr-web` dondurulmuştur; içindeki veri kaynakları ana ürüne taşınmaz (ADR-001).

## Değiştirilemez güvenlik ilkeleri
1. **Alerjen bir güvenlik kapısıdır, puan değildir.** Kapı, bileşik skorun üstündedir ve
   skorla asla dengelenmez. Skill: `allergen-safety`.
2. **Eksik veri asla "güvenli", "uygun" veya "doğrulanmış" sayılmaz.** Bilinmeyen = bilinmeyen;
   UI ve API bunu açıkça söyler (fail-closed).
3. **Alerjen kararında tahmin yok.** LLM, ürün adı, kategori veya benzer ürün çıkarımı
   güvenlik kararına giremez; yalnızca yapılandırılmış beyan verisi girer.
4. **Sentetik (uydurulmuş) fiyat canlı fiyat gibi gösterilmez.** `isSynthetic=true` her katmanda
   korunur; demo/reference/seed etiketleri ve doğrulama düzeyi kullanıcıya görünür.
5. **Veri kökeni her zaman taşınır.** `source`, `observedAt`, `confidence`, `missingFields`
   uçtan uca kaybolmaz. Skill: `product-data-provenance`.
6. **Açıklama yapıcı salt projeksiyondur.** Skor gerekçeleri yeni mantık üretmez.
7. **Tıbbi tavsiye yok.** Uyarı metinleri "etiketi kontrol edin / uzmana danışın" çerçevesini korur.
8. **İddia sınırı.** Olumlu ürün iddiası olarak "otorite", "garanti eder", "ürün güvenlidir",
   "güvenli alternatif" ve "alerjen içermez" ifadeleri yasaktır. "Güvenli sayılmaz", "güvenli
   olduğu doğrulanmamıştır", "garanti değildir" gibi risk reddeden/uyaran olumsuz ifadeler
   kullanılabilir. Tercih edilen kullanıcı dili: "beyan ediyor", "içerebilir", "belirtilmemiş",
   "veri yok / doğrulanmamış".

## Yasaklar
- İzinsiz scraping, bot koruması / CAPTCHA aşma, rate-limit atlatma, tersine mühendislik,
  resmî olmayan API kullanımı (arşivdeki `marketfiyati` istemcisi dâhil) — **yasak**.
- API anahtarı istemek, üretmek, koda gömmek; `.env` içeriğini okuyup yazdırmak — yasak.
- Onaysız paket ekleme, lockfile değişikliği, dış servis çağrısı — yasak (skill: `verification-gates`).
- Risk motoru (`riskEngine.ts`) ve alerjen kapısında onaysız değişiklik — yasak.
- Mock/demo veriyi gerçek ürün verisi gibi sunan kod — yasak.
- Onaysız commit, push, branch, force-push, `_archive` silme — yasak.
- Kullanıcı sağlık profilini backend'e, log'a veya telemetriye göndermek — yasak.

## Çalışma sırası (her görev için)
1. **Araştır**: ilgili dosyaları oku, kanıtı (dosya:satır) topla, varsayım üretme.
2. **Planla**: değişiklik listesi, etkilenen sözleşmeler, geri alma yolu, test planı.
3. **İnsan onayı bekle.** Onaysız ilerleme yok.
4. **Küçük ve geri alınabilir değişiklik**: tek konu, tek PR, `git diff` okunabilir.
5. **Doğrula**: `verification-gates` skill'indeki kontroller; kırmızıysa dur, raporla.
6. **Raporla**: ne değişti, ne test edildi, ne açık kaldı — kısa.

## Ajanlar (`.claude/agents/`)
Koordinatör ana oturumdur; ayrı koordinatör ajan yoktur. Ajanlar salt-okunurdur ve
bulgu döndürür; kod değişikliği kararı insan + ana oturumdadır. Ajanlar subagent
başlatmaz; model ve effort ajan dosyasında sabittir.
- `allergen-safety-reviewer` — alerjen akışı red-team, kabul testleri.
- `product-data-contract-reviewer` — ProductFacts/sözleşme/köken denetimi.
- `legal-privacy-reviewer` — KVKK, sağlık verisi, beyanlar, veri lisansları.
- `release-gatekeeper` — kalite kapıları; düzeltmez, raporlar.

## Skill'ler (`.claude/skills/`)
- `rafskoru-invariants` — değişmez ürün/veri/güven/etik kuralları.
- `allergen-safety` — beyan / iz / belirtilmemiş / bilinmeyen / profil eşleşmesi ayrımı.
- `product-data-provenance` — kaynak sınıfları, tamlık durumları, alan kuralları.
- `verification-gates` — değişiklik öncesi/sonrası kontroller ve onay şartları.

## Komutlar (referans)
- Backend: `npm run check`, `npm run smoke`, `npm run audit:encoding:strict`
- Mobil: `npx tsc --noEmit`, `npm run smoke:beta-wording`
- Risk senaryoları: `npx tsx apps/mobile/src/riskEngine/runRiskEngineScenarios.ts`

## Durma koşulları
Şunlardan biri görülürse dur ve insana sor: alerjen kapısına dokunan değişiklik,
yeni dış veri kaynağı, gizli anahtar ihtiyacı, kırmızı kalite kapısı, sözleşme
kırılması (mobil↔backend), hukuki belirsizlik.
