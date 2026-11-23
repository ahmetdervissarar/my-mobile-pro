# RafSkoru — Codex için hakem okuması talimatı (ek iş)

Bu iş, iki okuması birbirini tutmayan ürünler için **üçüncü, bağımsız bir okuma**dır.
Sonucun onay kararı vermez; yalnız onaylayana yardımcı bilgi olur.

## Okuma kuralları

Okurken `apps/backend/scripts/label-pipeline/OKUMA-TALIMATI.md` dosyasındaki
**"Kesin kurallar"**, **"Alanlar"** ve **"Çıktı biçimi"** bölümlerine aynen uy
(tahmin yok, okunamayan alan `null`, kısmi içindekiler yok, düzeltme yok, Türkçe bölüm,
100 g / 100 ml sütunu). O dosyadaki "Adım 1", "Adım 3" ve komut çalıştırma kısımları
bu iş için **geçerli değildir**.

## İş listesi

`apps/backend/data/label-store/codex-hakem-is.json`

Her ürün için:
1. Yalnız o ürünün `photos` listesindeki fotoğrafları aç ve oku.
2. Sonucu `<outputDir>/<barcode>-3.json` dosyasına yaz (biçim OKUMA-TALIMATI.md ile
   aynı; `"_reader": "codex"`).

## Bu işe özel kurallar

1. **Hiçbir komut çalıştırma.** Bu işte indirme, betik, paket veya git yok.
2. **Bağımsız oku.** Önceki okumaları, `reads` / `reads-codex` klasörlerini, onay
   deposunu veya başka bir JSON dosyasını AÇMA. Yalnız fotoğraflara bak.
3. Elle yazdığın tek dosyalar `<outputDir>/<barcode>-3.json` dosyalarıdır. Var olan
   bir dosyanın üzerine yazma.
4. Fotoğrafı açamıyorsan o ürün için dosya yazma; sonunda raporla.

## Bitirince

Kısa rapor: kaç ürün okundu, hangilerinin dosyası yazılmadı ve neden.
Sonuna şunu ekle: **"Claude'a 'hakem bitti' diyebilirsin."**
