# RafSkoru — Codex için OFF döküm indirme talimatı

Görevin, Open Food Facts'in resmî toplu veri dosyasını (yaklaşık 13,8 GB) proje
klasörünün DIŞINDAKİ bir klasöre indirmek ve tam indiğini doğrulamak. Dosyayı açma,
işleme veya projeye aktarma; aktarımı Claude yapacak.

Komutları **PowerShell**'de çalıştır. Aşağıda yazmayan hiçbir komutu çalıştırma.

- Adres: `https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz`
- Klasör: `$env:USERPROFILE\RafSkoru-veri\off-dokum`
- Dosya: `$env:USERPROFILE\RafSkoru-veri\off-dokum\openfoodfacts-products.jsonl.gz`
- Not dosyası: `$env:USERPROFILE\RafSkoru-veri\off-dokum\indirme-notu.txt`

## Adım 1 — Klasör

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\RafSkoru-veri\off-dokum" | Out-Null
```

## Adım 2 — Sunucudaki dosyanın boyutu ve tarihi

```powershell
curl.exe -sIL -A "RafSkoru/0.2 (rafskoru.iletisim@gmail.com)" "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"
```

Çıktıdaki **son** `Content-Length` (bayt) ve `Last-Modified` değerlerini al.
Yanıt `200 OK` ile bitmiyorsa **dur**, "OFF şu an yanıt vermiyor" diye raporla.

## Adım 3 — Yarım dosya kontrolü

- `indirme-notu.txt` yoksa: yeni indirme. Not dosyasını şu iki satırla yaz:
  `Last-Modified: <değer>` ve `Content-Length: <değer>`.
- `indirme-notu.txt` varsa ve içindeki `Last-Modified`, Adım 2'deki değerle **aynıysa**:
  yarım kalan indirme kaldığı yerden sürer; hiçbir şey silme.
- `indirme-notu.txt` varsa ama `Last-Modified` **farklıysa**: OFF dosyayı yenilemiş;
  eski yarım dosya işe yaramaz. Yalnız şu iki dosyayı sil, not dosyasını yeni
  değerlerle yeniden yaz ve yeni indirme olarak devam et:

```powershell
Remove-Item "$env:USERPROFILE\RafSkoru-veri\off-dokum\openfoodfacts-products.jsonl.gz" -ErrorAction SilentlyContinue
Remove-Item "$env:USERPROFILE\RafSkoru-veri\off-dokum\indirme-notu.txt"
```

## Adım 4 — İndir (bu çalıştırmada bir kez)

```powershell
curl.exe -L --fail -C - -A "RafSkoru/0.2 (rafskoru.iletisim@gmail.com)" -o "$env:USERPROFILE\RafSkoru-veri\off-dokum\openfoodfacts-products.jsonl.gz" "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"
```

İndirme uzun sürebilir; bitmesini bekle. Komut hata verirse veya bağlantı koparsa
bu çalıştırmada **tekrar deneme**; raporla. Proje sahibi izin verdiyse en erken
**1 saat sonra** bu talimatı baştan uygulayabilirsin (Adım 3 kaldığı yerden sürdürür).

## Adım 5 — Doğrula

```powershell
(Get-Item "$env:USERPROFILE\RafSkoru-veri\off-dokum\openfoodfacts-products.jsonl.gz").Length
```

Bu sayı, not dosyasındaki `Content-Length` ile **birebir aynı** olmalı.

## Kesin kurallar

1. Yalnız bu talimattaki komutları çalıştır. Proje klasöründe hiçbir dosyayı
   oluşturma, değiştirme veya silme. Git, paket kurma, betik çalıştırma yok.
2. Sileceğin tek dosyalar Adım 3'teki iki dosyadır; başka hiçbir şeyi silme.
3. İndirilen dosyayı açma, çözme veya içine bakma.
4. Kimlik bilgisi olarak yalnız talimattaki User-Agent'ı kullan; başka e-posta
   veya kişisel bilgi ekleme.

## Bitirince

Kısa rapor:
- `Last-Modified` ve `Content-Length` (sunucu),
- indirilen dosyanın boyutu ve ikisinin aynı olup olmadığı,
- indirme yarıda kaldıysa nedeni.

Boyutlar aynıysa raporun sonuna şunu ekle: **"Claude'a 'döküm indi' diyebilirsin."**
