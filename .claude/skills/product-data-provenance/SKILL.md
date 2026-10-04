---
name: product-data-provenance
description: RafSkoru ürün verisinin kökeni — OFF, doğrulanmış RafSkoru DB, üretici, kullanıcı/OCR ve beta çıkarım kaynaklarının ayrılması; source/observedAt/isSynthetic/confidence/missingFields kuralları; kullanılabilir/eksik/tam durumları. ProductFacts, PriceResult veya sözleşme tiplerine dokunan işlerde kullan.
---

# Ürün Verisi Kökeni

## Kaynak sınıfları (`dataSource`, tek değer, zorunlu)
| Değer | Ne | Uyarı üretmede | Negatif/"uygun" kararında | Skorda |
|---|---|---|---|---|
| `off` | OFF yapılandırılmış veri (topluluk katkılı) | evet, beyan/iz varsa | **hayır** | evet |
| `rafskoru_verified` | İnsan doğrulamalı RafSkoru DB (henüz yok) | evet | yalnızca doğrulama kaydı tamsa | evet |
| `manufacturer` | Üretici/marka resmî verisi | evet | yalnızca doğrulama kaydı tamsa | evet |
| `user_ocr` | Kullanıcı fotoğrafı/OCR, doğrulanmamış | hayır | hayır | etiketli, düşük güven |
| `beta_inference` | Ad/kategori tahmini (`inferBeta*`) | hayır, asla | hayır | yalnızca "tahmin" etiketiyle |

OFF güven sınırı: OFF'ta alerjen veya iz beyanı varsa uyarı üretmek için kullanılabilir; OFF'ta
alerjenin bulunmaması ürünün onu içermediğini kanıtlamaz. OFF hiçbir zaman "uygun/güvenli"
sonucu üretmez. Güven düzeyi ürün değil **alan bazında** değerlendirilir (`fieldSources`).
"Doğrulama kaydı tam" = `observedAt` + ambalaj/etiket sürümü + doğrulayan kişi/kurum kaydı.
Bu üçü olmadan `manufacturer` ve `rafskoru_verified` otomatik olarak yüksek güven sayılmaz.
Karışık kaynak varsa alan düzeyinde `fieldSources` tutulur; ProductFacts tek `dataSource` iddiasıyla yalan söylemez.

## Zorunlu köken alanları (her katmanda korunur)
- `source` — kaynak sınıfı; null olamaz.
- `observedAt` — kaynağın gözlem zamanı (ISO); cache yazım zamanı değil.
- `isSynthetic` — uydurulmuş demo/seed/reference fiyat ve tahmini skor için `true`; UI etiketi zorunlu.
- `confidence` — `low|medium|high`; kaynak sınıfı tavanı: `beta_inference`→low, `user_ocr`→low, `off` eksikse→medium.
- `missingFields` — eksik alan listesi; boş liste = tam.
Kural: bu alanlardan biri backend→mobil yolunda düşüyorsa sözleşme kırıktır (bkz. `product-data-contract-reviewer`).

## Tamlık durumları (tek `isComplete` yerine katmanlı)
| Durum | Koşul | İzin |
|---|---|---|
| `usable_for_risk` | `ingredientsText` VEYA `allergenInfo.dataStatus='present'` | Risk motoru çalışır; alerjen kapısı değerlendirilir |
| `usable_for_health` | Nutri-Score VEYA NOVA VEYA ≥1 traffic-light değeri | Sağlık skoru `partial` üretilir |
| `complete` | tüm skor alanları + görsel + ad | Tam skor, yüksek güven |
| `insufficient` | hiçbiri | "Ürün verisi yetersiz"; tahmin yok |
Kural: `usable_for_risk` olan veri **asla atılmaz**; `imageUrl` veya `nutriScore` eksikliği ürünü düşürmez.
Mevcut ihlal: `priceProviderService.ts::tryFetchProductFacts` (`isComplete` filtresi).

## Fiyat kökeni
`source ∈ {manual_beta, beta_reference, online_test_seed, last_known, retailer_feed}`; `status` ile karışmaz.
| Kaynak | isSynthetic | Doğrulama düzeyi | Canlı sayılır mı |
|---|---|---|---|
| `beta_reference`, `online_test_seed` (uydurulmuş) | **true** | — | hayır |
| `manual_beta` + kaynak kanıtı + ürün eşleşmesi + `observedAt` | false | `verified_observation` (görünür) | hayır; "gözlem" |
| `manual_beta` kaynağı yok | false | `unverified` | hayır |
| `last_known` | miras | yalnızca `verified_observation` kökenli gözlemden türer | hayır |
| `retailer_feed` (izinli, ileride) | false | kaynak sözleşmesine göre | evet, `observedAt` ile |
Kural: `manual_beta` otomatik sentetik değildir; sentetik olan uydurulmuş fiyattır. Doğrulama düzeyi
kullanıcıya her zaman görünür. Sentetik veya `unverified` kayıttan `last_known` üretilmez
(mevcut `lastKnownPriceProvider.remember()` bu kurala uyarlanmalı). `priceConfidence` buna göre güncellenir.

## Cache ve kalıcılık
Cache girdisi kökeni değiştirmez: `observedAt` korunur, `cachedAt` ayrı alandır. Bellek içi cache
yeniden başlatmada silinir; kalıcı depoya geçiş insan onaylı ayrı görevdir.

## Kontrol listesi (değişiklik öncesi)
- [ ] Yeni alan hem backend hem mobil tipinde mi (ideali paylaşılan paket)?
- [ ] `dataSource` değeri koddan gerçekten üretiliyor mu, yoksa yalnızca tipte mi?
- [ ] Kullanıcıya gösterilen etiket `isSynthetic`/`dataSource`/doğrulama düzeyi ile tutarlı mı?
- [ ] Eksik alan → UI'da görünür mü, sessiz varsayılan mı?
