---
name: rafskoru-invariants
description: RafSkoru'nun değişmez ürün, veri, güven ve etik kuralları. Her kod, metin veya sözleşme değişikliğinden önce oku; bir kuralı ihlal eden istek durdurulur ve insana sorulur.
---

# RafSkoru Değişmezleri

Bu kurallar tartışma konusu değildir; değiştirmek için ADR + insan onayı gerekir.

## Ürün
- P1 RafSkoru karar desteğidir; tıbbi, beslenme veya satın alma tavsiyesi değildir. Her skor disclaimer'ıyla gösterilir.
- P2 Alerjen güvenliği bileşik skorun ÜSTÜNDE bağımsız bir kapıdır; skorla dengelenmez, puanlanmaz.
- P3 Aynı ürün grubu alternatifleri ile "daha sağlıklı seçenek" ayrı kavramlardır; karıştırılmaz.
- P4 Sürdürülebilirlik modülü planlanan temel boyutlardan biridir; ancak Türkiye'ye özgü yöntem,
  veri kaynakları ve güven modeli doğrulanmadan genel RafSkoru ağırlığına aktif olarak katılmaz.
  O zamana kadar "araştırma / eksik veri" statüsünde gösterilir (ağırlık 0 veya skor null).
- P5 Olumlu güvenlik iddiası yok: "otorite", "garanti eder", "ürün güvenlidir", "güvenli alternatif",
  "alerjen içermez" yasak. Risk reddeden olumsuz ifadeler ("güvenli sayılmaz", "garanti değildir") serbest.

## Veri
- D1 Eksik veri asla "güvenli", "uygun", "temiz", "alerjen içermez" veya "doğrulanmış" sayılmaz. `unknown` ayrı bir durumdur.
- D2 OFF verisi kısmen eksik diye tamamen atılmaz; kullanılabilir alanlar `missingFields` ile taşınır.
- D3 Alan çıkarımı yok: LLM, ürün adı, kategori veya benzer üründen içindekiler/alerjen/besin değeri üretilmez.
  (İstisna: skor tahmini yalnızca `dataSource='beta_inference'` etiketiyle ve güvenlik kararının dışında.)
- D4 Mock/demo/seed veri yalnızca bayrak arkasında; `NODE_ENV=production`'da yüklenemez.
- D5 Excel yalnızca insan doğrulama/içe aktarma aracıdır; çalışma zamanı kaynağı değildir (ADR-003).

## Güven
- G1 Sentetik (uydurulmuş) fiyat (`isSynthetic=true`) hiçbir katmanda canlı fiyat gibi gösterilmez;
  insan girişli gözlem sentetik değildir ama doğrulama düzeyi kullanıcıya görünür.
- G2 `source`, `observedAt`, `confidence`, `missingFields` backend → mobil yolunda kaybolmaz.
- G3 Açıklama/gerekçe yapıcı salt projeksiyondur; skor mantığı barındırmaz.
- G4 Güven düzeyi asla kaynak türünden bağımsız yükseltilmez (demo fiyat "medium" olamaz).

## Etik ve hukuk
- E1 İzinsiz scraping, bot koruması aşma, tersine mühendislik, resmî olmayan API — yasak.
- E2 Kullanıcı sağlık profili cihazda kalır; backend, log, telemetri veya üçüncü tarafa gitmez.
- E3 Veri lisanslarına (OFF ODbL/DbCL, Google ToS) atıf ve kullanım sınırları korunur.
- E4 Uyarı metinleri ihtiyat dilindedir: "beyan ediyor", "içerebilir", "belirtilmemiş", "veri yok / doğrulanmamış".

## Süreç
- S1 Araştır → planla → insan onayı → küçük, geri alınabilir değişiklik → doğrula → raporla.
- S2 Risk motoru, alerjen kapısı, sözleşme tipleri ve sağlayıcı zinciri "korumalı bölge"dir; onaysız dokunulmaz.
- S3 Her bulgu dosya:satır kanıtıyla yazılır; kanıtsız iddia yazılmaz.

## Kullanım
Bir görev bu kurallardan biriyle çelişiyorsa: dur, kural numarasını belirt, insana sor.
