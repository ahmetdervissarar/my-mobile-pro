# RafSkoru Backend

Express/TypeScript API — fiyat çözümleme, arama, sepet, katalog ve Intake
(gönüllü ürün toplama) modüllerini barındırır.

## Gereksinimler

- **Node.js >= 22.5.0.** Intake modülü Node'un yerleşik `node:sqlite`
  modülünü kullanır; bu modül Node 22.5.0'dan önce yoktur. Daha eski bir
  Node sürümüyle başlatılırsa backend'in geri kalanı (fiyat/arama/sepet)
  normal çalışmaya devam eder, yalnızca `/api/intake/*` 503 döner ve
  konsola açık bir hata yazılır (`[intake] devre dışı: ...`).
  Sürümünü kontrol et: `node --version`
- npm (Node ile birlikte gelir).

## Kurulum

```bash
cd apps/backend
npm install
cp .env.example .env
```

**Windows PowerShell:**

```powershell
cd apps\backend
npm install
Copy-Item .env.example .env
```

`.env` dosyasını aç, en azından Intake kullanacaksan `INTAKE_ADMIN_KEY` ve
`INTAKE_VOLUNTEERS_JSON`'ı doldur (bkz. aşağıdaki "Intake modülü" bölümü).

## Çalıştırma

```bash
npm run dev
```

**Windows PowerShell (aynı komut):**

```powershell
npm run dev
```

Başarılı açılışta şuna benzer satırlar görürsün:

```
[catalog] 11292 ürün yüklendi (...). Bozuk satır: 0. Çelişen mükerrer GTIN: 0.
[intake] veritabanı hazır.
RafSkoru backend running on http://localhost:3001
```

Sunucu varsayılan olarak `3001` portunda, tüm ağ arayüzlerinde dinler —
aynı Wi-Fi'deki bir telefondan `http://<bilgisayarının-yerel-IP'si>:3001`
ile erişilebilir (bkz. "Telefondan test" bölümü).

## Doğrulama kapıları

```bash
npm run check   # tsc --noEmit
npm run smoke   # tüm .smoke.ts testleri (Intake dahil)
```

PowerShell'de aynı komutlar (`npm run check`, `npm run smoke`) değişmeden
çalışır.

## Intake modülü (gönüllü ürün toplama)

Gönüllülerin marketlerde ürün fotoğrafı toplaması için basit bir web
sayfası (`apps/intake/`, backend tarafından `/intake` altında statik
sunulur) + API (`/api/intake/*`, kod: `src/intake/`).

### Çalıştırma gereksinimleri

- Node >= 22.5.0 (yukarıya bkz.).
- `INTAKE_ADMIN_KEY`: panel (yönetici) uç noktaları için tek anahtar.
  Boşsa panel kapalı kalır, gönüllü akışı etkilenmez.
- Gönüllü kod+anahtar çiftleri — **ortak bir anahtar değil, gönüllü
  başına ayrı anahtar** (tek kişinin erişimi diğerlerini etkilemeden
  kapatılabilsin diye). İki yoldan biri:
  1. `.env`'de `INTAKE_VOLUNTEERS_JSON={"MRS-01":"anahtar1","MRS-02":"anahtar2"}`
  2. `apps/backend/data/intake/volunteers.json` dosyasını aynı formatta
     elle oluştur (repoya girmez). Bu dosya **her istekte yeniden
     okunur** — bir satırı silip kaydetmek, süreci yeniden başlatmadan
     o kişinin erişimini hemen kapatır.

Veri (fotoğraflar + SQLite veritabanı) `apps/backend/data/intake/`
altında tutulur; bu dizin `.gitignore`'dadır, repoya asla girmez.

### Telefondan test

1. Bilgisayarınla telefonun **aynı Wi-Fi ağında** olduğundan emin ol.
2. Bilgisayarının yerel IP'sini bul:
   - Windows (PowerShell): `ipconfig` → "IPv4 Address" satırı (ör. `192.168.1.23`)
   - Mac/Linux: `ifconfig` veya `ip addr` → `inet` satırı
3. Backend'i başlat (`npm run dev`).
4. Telefonun tarayıcısında `http://<o-IP>:3001/intake/` adresine git
   (ör. `http://192.168.1.23:3001/intake/`).
5. Gönüllü kodu + anahtarla giriş yap, market/şehir seç.
6. Kamerayla veya elle bir barkod gir; kamera izni istenirse ver.
7. Gerekli fotoğrafları çek (native kamera açılır — "Fotoğraf çek"e
   dokun), kategori seç, "Gönder"e bas.
8. Uçak modunu aç/kapat: "Beklemede: N" göstergesinin çalıştığını,
   bağlantı gelince kuyruğun kendiliğinden boşaldığını doğrula.
9. Yöneticiyseniz: `http://<o-IP>:3001/api/intake/admin/stats` gibi bir
   uç noktayı `x-intake-admin-key` başlığıyla (ör. bir REST istemcisinden)
   kontrol edebilirsin — panel için ayrı bir sayfa bu görevde yapılmadı.

### Gönüllü kullanım kılavuzu

Gönüllülere verilecek tek sayfalık talimat: [`docs/intake-volunteer-guide.md`](../../docs/intake-volunteer-guide.md).
