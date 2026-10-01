# ADR-007: SKT (son tüketim tarihi) kamerayla okuma

Date: 2026-10-01
Status: Proposed

## Context

Markette rafta tarihi geçmiş veya tarihe yakın paketler bulunabiliyor; tüketici barkod/puan akışında bunu fark etmiyor. SKT **pakete** özgüdür (üretim partisine bağlı), **ürüne** özgü değildir — bu yüzden katalogda saklanacak bir alan değildir, yalnızca o anki görüntülemede kullanılan geçici bir girdidir. Elle tarih girişi kapsam dışıdır: kullanıcı tarihi zaten okuyabiliyorsa bu özellik değer katmıyor; değer yalnızca OCR'ın kullanıcının bakmayı atladığı tarihi yakalamasından gelir.

## Decision

1. **Akış**: kamera → barkod ile ürün + mevcut skor gösterilir → kullanıcı isterse "Tarihi de oku" → OCR çalışır → okunan tarih **kullanıcı onayına** sunulur (düzenlenebilir/reddedilebilir) → yalnızca onaylanırsa tarih uyarısı gösterilir. Onaylanmamış OCR çıktısı hiçbir güvenlik kararına girmez.
2. **Saklama yok**: okunan tarih, GTIN'e veya kataloğa yazılmaz; yalnızca o oturumdaki görüntülemede tutulur.
3. **Eşikler**: geçmiş tarih → kırmızı "almayın"; bugünden <3 gün → kırmızı; hassas üründe (ör. süt ürünü, çiğ et) <7 gün → turuncu "rafta daha uzun tarihli paket arayın"; diğer durumlarda gri "tarihe göre uygun". Gri etiket ürünün fiziksel olarak sağlam olduğunu ima ETMEZ — soğuk zincir/depolama bilinmiyor.
4. **Okunamazsa**: ilk denemede "Tarih okunamadı — arka yüzü veya kapağı deneyin"; ikinci başarısız denemede "paket üzerinden kontrol edin". Hiçbir koşulda "tarih uygun" gibi bir sonuç OCR başarısızlığında ÜRETİLMEZ.
5. **Önkoşullar**: cihaz üstü metin tanıma (fotoğraf cihazdan çıkmaz, sunucuya yüklenmez); Expo Go'da yerel OCR modülü çalışmadığından geliştirme ve test için Apple Developer üyeliği + EAS (custom dev client) derlemesi gerekir — bu bir önceki karar değil, bu özelliğin ön koşuludur.

## Open questions / zorluklar

- TR tarih biçimleri: TETT/SKT/ÜT etiketleri, "12.2026", "15 ARA 26" gibi kısaltmalar; lot/parti numarasıyla karışma riski.
- Pakette birden fazla tarih olabilir (üretim vs. son tüketim) — hangisinin okunduğu ayırt edilmeli, karışırsa OCR "okunamadı" sayılmalı.
- İki haneli yıl belirsizliği (ör. "26" → 2026 mı?) — sezgisel varsayım yapılmayacak, belirsizse kullanıcı onay ekranında düzeltme istenecek.

## Scope dışı

Fotoğraftan ürün tanıma (barkod zaten daha güvenilir bir kimlik kaynağı); rafta bekleme süresi / satış hızı tahmini.
