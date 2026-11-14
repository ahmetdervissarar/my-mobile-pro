# Vendor edilen dosyalar — barkod okuyucu yedek yolu

Bu dizin, native `BarcodeDetector` API'si olmayan tarayıcılar (örn. iPhone'daki
tüm tarayıcılar — Safari ve Chrome dahil, hepsi WebKit kullanır) için **yalnız
o tarayıcıda, tembel yüklenen** bir yedek barkod okuyucu içerir. Hiçbir dosya
CDN'den çekilmez — ikisi de bu klasörde, repoya vendor edilmiştir (bkz. görev
onayı: "CDN YOK").

## Dosyalar

| Dosya | Kaynak paket | Sürüm | İndirme tarihi | SHA-256 |
|---|---|---|---|---|
| `barcode-detector.polyfill.js` | [`barcode-detector`](https://www.npmjs.com/package/barcode-detector) (`dist/iife/polyfill.js`) | 3.2.2 | 2026-10-02 | `743c85cddd93b6497f3045c89afddaab66c92f7c52ed969ba561e7fb9e92f68e` |
| `zxing_reader.wasm` | [`zxing-wasm`](https://www.npmjs.com/package/zxing-wasm) (`dist/reader/zxing_reader.wasm`) | 3.1.3 | 2026-10-02 | `2ebda08a93eea3efcd8399cda6b276e6a0b1de4fec60b4d8988a047de4c6d1ba` |

İkisi de resmi npm registry'sinden `npm pack <paket>@<sürüm>` ile **tek seferlik,
tek istek** olarak indirildi (CDN üzerinden değil). `barcode-detector`,
`zxing-wasm@3.1.3`'ü kendi `package.json`'ında bağımlılık olarak belirttiği için
aynı sürüm eşlenerek indirildi (uyumluluk garantisi).

## Lisans

Her iki paket de **MIT** (© 2023 Ze-Zheng Wu, "Sec-ant") — bkz. `./LICENSE`
(ikisinin metni birebir aynı, tek dosya yeterli).

## Neden bu ikisi, neden böyle

- `barcode-detector`, native `window.BarcodeDetector` ile **birebir aynı
  arayüzü** sağlayan bir polyfill'dir — eksikse kendini `window.BarcodeDetector`'a
  atar (dosyanın kendi iç kontrolü), zaten varsa dokunmaz. Bu sayede
  `apps/intake/app.js`'teki `detectBarcodeFromFile()` kodu native/polyfill
  ayrımı yapmadan aynen çalışır.
- `dist/iife/polyfill.js` seçildi (CJS/ESM değil) çünkü bu sayfa framework/derleyici
  kullanmıyor — düz bir `<script>` etiketiyle yüklenir.
  (`BarcodeDetectionAPI` global adıyla erişilir; `setZXingModuleOverrides()`
  bu üzerinden çağrılır.)
- Yalnız `dist/reader/zxing_reader.wasm` (okuma-amaçlı, yazma/encode
  içermeyen, daha küçük derleme) vendor edildi — "full" derleme değil.
- Format kısıtlaması (EAN-13/EAN-8) **çalışma zamanı** bir seçenektir
  (`new BarcodeDetector({ formats: [...] })`) — bu .wasm dosyasının boyutunu
  etkilemez (tüm formatlar zaten derlenmiş haldedir), yalnız yanlış-pozitif
  okuma riskini azaltır.

## Nasıl çalışır (CDN'e gitmeyi engelleme)

Kütüphanenin varsayılan davranışı, `.wasm` dosyasını jsDelivr CDN'den çekmektir.
`apps/intake/app.js`, script yüklendikten sonra
`BarcodeDetectionAPI.setZXingModuleOverrides({ locateFile: ... })` çağrısıyla bu
varsayılanı **bu klasördeki yerel `zxing_reader.wasm`'a** yönlendirir — hiçbir
koşulda CDN'e istek gitmez.

## Güncelleme

Yeni bir sürüm vendor edilecekse: `npm pack barcode-detector@<sürüm>` ve
`npm pack zxing-wasm@<barcode-detector'ın bağımlılık sürümü>` ile indirip bu
tabloyu (sürüm, tarih, SHA-256) güncelleyin; `barcode-detector.polyfill.js`'in
başındaki yorum bloğunu da aynı şekilde güncelleyin.
