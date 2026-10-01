# ADR-006: Konum isteğe bağlı, kaba, saklanmıyor

Date: 2026-09-30
Status: Accepted

## Context

`app/(tabs)/product-result.tsx`'te her ürün ekranı açılışında (barkod veya isim ile) tetiklenen bir `useEffect`, fiyatı "iyileştirmek" için `getUserLocationForPricing()`'i OTOMATİK çağırıyordu. Bu fonksiyon `Location.requestForegroundPermissionsAsync()`'i çağırdığından, kullanıcı hiçbir konum/mesafe özelliği istemeden, yalnızca bir ürün sayfasını açarak, cihazın konum izni istemiyle karşılaşıyordu — ve izin verilirse KESİN (yuvarlanmamış) enlem/boylam backend'e gönderiliyordu.

Backend tarafında bu konum yalnızca `enrichOffers()` içinde mağaza mesafesi hesaplamak için kullanılıyor, ama `apps/backend/src/price/stores/data/seedStores.ts` kasıtlı olarak boş tutuluyor ("Keep this list empty until coordinates are verified from reliable sources"). Yani konum isteniyor ve gönderiliyordu ama şu an hiçbir gerçek işlevi yoktu — kullanıcı gizliliği karşılığında hiçbir fayda sağlamıyordu. Backend, konumun kendisini hiçbir yerde diskte saklamıyor; beta telemetri olayı (`queryEvent.ts`) da yalnızca `hasLocation: boolean` bayrağını (koordinatların kendisini değil) ve yalnızca `ENABLE_BETA_QUERY_LOGS=1` iken log'luyor — bu davranış zaten doğruydu, değiştirilmedi.

## Decision

1. **İsteğe bağlı**: `product-result.tsx`'teki otomatik `getUserLocationForPricing()` çağrısı tamamen kaldırıldı. Konum artık yalnızca kullanıcı ileride eklenecek açık bir "yakın mağaza/mesafe" eylemini tetiklediğinde istenecek (bugün böyle bir UI yok — bu yüzden bugün konum izni hiç istenmiyor).
2. **Kaba**: `getUserLocationForPricing()` konumu göndermeden önce `roundToCoarseGrid()` (yeni: `src/services/locationPrecision.ts`) ile ~1 km'lik bir kareye yuvarlıyor (0,01 derece ≈ 1,1 km). Kesin konum hiçbir zaman ağ üzerinden gönderilmiyor.
3. **Saklanmıyor**: Backend tarafında değişiklik yapılmadı çünkü zaten doğruydu — konum hiçbir depoya yazılmıyor, ham koordinat hiçbir log satırına girmiyor (yalnızca `hasLocation` boole bayrağı, yalnızca beta telemetri açıkken).
4. **Mesafe özelliği ertelendi**: `seedStores` boş bırakıldı (zaten öyleydi) — gerçek, doğrulanmış mağaza koordinatları olmadan mesafe hesaplaması geri eklenmeyecek.

## Consequence

Bugün hiçbir ekran konum izni istemiyor. `getUserLocationForPricing()` fonksiyonu (artık yuvarlanmış çıktıyla) `src/services/locationService.ts`'te durmaya devam ediyor — ileride gerçek bir "yakın mağaza" eylemi eklendiğinde, o eylemin kendi açık kullanıcı tetiklemesinden çağrılacak.
