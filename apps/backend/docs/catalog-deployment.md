# Katalog verisini sunucuya taşıma

`apps/backend/data/off-tr/products.jsonl` repoya commit edilmez
(`.gitignore`'da) — ODbL'den türetilmiş bir veritabanını herkese açık bir
depoya koymak atıf + aynı lisansla paylaşım yükümlülüğü doğurur ve bu karar
henüz verilmedi. Bu yüzden dosya sunucuya **elle** taşınır.

Katalog boşken ne olur: uygulama sessizce çökmez, canlı OpenFoodFacts
sorgusuna düşer; açılış günlüğünde yüksek görünürlükte bir uyarı basılır,
`/health` yanıtında `catalogProductCount: 0` görünür ve
`/api/price/resolve` yanıtında `catalogStatus.empty: true` döner — bkz.
`src/index.ts` ve `src/routes/priceRoutes.ts`.

## İlk kurulum / tam güncelleme

Geliştirme makinenden üretim sunucusuna doğrudan kopyala:

```bash
scp apps/backend/data/off-tr/products.jsonl \
  <kullanıcı>@<sunucu>:/path/to/apps/backend/data/off-tr/products.jsonl
```

Veya sunucuda doğrudan üretirsen (bkz. `npm run import:off-tr`), dosyayı
oluşturduktan sonra backend'i yeniden başlat — `loadCatalog` yalnız
açılışta çalışır, dosya değişikliğini kendiliğinden izlemez:

```bash
cd apps/backend
npm run import:off-tr   # data/off-tr/products.jsonl'ı (yeniden) üretir
npm run dev              # veya prod süreç yöneticini yeniden başlat (pm2 restart, systemctl restart ...)
```

## Doğrulama

Kopyalama/yeniden başlatma sonrası:

```bash
curl -s http://localhost:3001/health | grep catalogProductCount
```

`catalogProductCount` sıfırdan büyükse katalog yüklenmiştir. Sıfırsa
dosya yolu/izinlerini kontrol et — açılış günlüğündeki uyarı tam dosya
yolunu gösterir.
