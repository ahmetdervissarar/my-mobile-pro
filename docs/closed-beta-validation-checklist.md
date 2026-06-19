# RafSkoru — Kapalı Beta Validasyon Checklist'i

> **Amaç:** 50 kişilik kapalı betaya çıkmadan önce 20–30 barkodluk kontrollü test listesiyle ana akışları gözden geçirmek ve riskli noktaları yakalamak.
> **Kapsam:** `/api/price/resolve` akışı, alternatif önerisi, sepet/coverage, veri etiketleme, KVKK/gizlilik.
> **Durum:** Faz 3 — kontrollü validasyon hazırlığı.

Bu dosya manuel test turunun tek doğruluk kaynağıdır. Her test turu için "Kayıt tablosu" bölümünü kopyalayıp doldur, sonuçları PR/commit sonrası gözden geçir.

---

## 0. Bloklayıcı özet

Kapalı betaya çıkış için hepsi yeşil olmalı:

- [ ] Hiçbir trap çiftinde cross-group alternatif çıkmadı: süt ↔ kefir/ayran, pirinç ↔ bulgur, yoğurt ↔ ayran.
- [ ] Hassas kategoriler, özellikle bebek maması, fail-closed çalıştı; alternatif çıkmadı.
- [ ] Seed kapalıyken sentetik fiyat görünmedi.
- [ ] Production benzeri modda test seed yanlışlıkla gerçek veri gibi görünmedi.
- [ ] Eksik kalemli market "en ucuz market" olarak seçilmedi.
- [ ] Fiyatın beta/referans olduğu kullanıcıya açıkça anlaşılıyor.
- [ ] Eksik sağlık/içerik verisi "hata/bozuk" değil, "kısmi sonuç/veri eksik" olarak gösteriliyor.
- [ ] KVKK/gizlilik mini-checklist tamamlandı.

---

## 1. En riskli 5 alan

| # | Risk | Neden kritik? | Birincil savunma |
|---|------|---------------|------------------|
| 1 | Yanlış alternatif, cross-group öneri | Registry kapısı yapısal koruma sağlar ama catalog etiketi yanlışsa yanlış öneri hâlâ mümkün olur | Trap çiftleriyle catalog doğruluğu testi |
| 2 | Mock/seed veri sızıntısı | Sentetik fiyat veya ürün verisi gerçek sanılırsa güven kaybı oluşur | Flag kapalıyken sentetik veri yok; production benzeri modda seed gerçek gibi davranmaz |
| 3 | Fiyat yokluğu / coverage yanılgısı | Fiyat çekirdek değer; fiyat yoksa RafSkoru zayıflar | Coverage testi ve "fiyat geldi mi" metriği |
| 4 | Kullanıcı güveni / veri etiketleme | Beta fiyat/kısmi veri anlaşılmazsa kullanıcı yanlış güven duyabilir | Kullanıcı metinlerinin kontrolü |
| 5 | KVKK / gizlilik | Kapalı beta 50 gerçek kullanıcı demektir; konum, fotoğraf, fiş/OCR, katkı verisi risk doğurabilir | Veri notu, rıza akışı, saklama amacı/süresi kontrolü |

Mobil UX bu risklerin tamamını keser. Her senaryoda "kullanıcı ne gördü?" ayrıca not edilmelidir.

---

## 2. Test matrisi

| Senaryo | Beklenen davranış | Fail tipi |
|---------|-------------------|-----------|
| Barkodla bulunan ürün | Ürün adı/görsel/fiyat/RafSkoru net döner | Hard, fiyat yoksa |
| Barkodla bulunamayan ürün | "Ürün bulunamadı" net görünür; mock/sentetik veri sızmaz | Hard |
| Ürün adıyla bulunan ürün | Doğru veya makul aday döner; grup yanlış değildir | Soft |
| Görsel/fotoğraf akışı varsa | Tanıma sonucu net; başarısızsa temiz mesaj | Soft |
| Sağlık verisi tam ürün | Sağlık/içerik skoru ve güven etiketi görünür | Soft |
| Sağlık/içerik eksik ürün | "Veri eksik/kısmi sonuç" dili görünür; "hata" hissi oluşmaz | Hard, yanlış dil varsa |
| Alerjen riski olan ürün | Alerjen uyarısı skor/alternatif kararlarının üstünde görünür | Hard |
| Alternatif çıkan ürün | Alternatiflerin tamamı aynı resolvedProductGroupKey içinde kalır | Hard |
| Alternatif çıkmaması gereken ürün | Alternatif kartı çıkmaz veya güvenli açıklama gösterilir | Hard |
| Hassas kategori, bebek maması | Fail-closed; alternatif önerisi kesinlikle çıkmaz | Hard |
| Sepet — tam coverage | En ucuz tam sepet ve en iyi sepet skoru mantıklı görünür | Hard |
| Sepet — bazı marketlerde eksik ürün | Eksik market en ucuz seçilmez; kısmi coverage görünür | Hard |
| Sepet — hiçbir market tam değil | Yetersiz veri mesajı görünür | Soft |

---

## 3. Barkod test listesi hedef dağılımı

Rastgele 30 ürün toplama yapılmayacak. Her barkod bir test eksenini kapsamalı.

| Eksen | Ürün örneği | Adet | Not |
|-------|-------------|------|-----|
| Süt grubu | UHT süt, günlük süt | 2 | Trap referansı |
| Yakın grup trap | Kefir, ayran | 2 | Süt alternatifi olmamalı |
| Pirinç grubu | Baldo/osmancık pirinç | 2 | Trap referansı |
| Yakın grup trap | Bulgur | 1 | Pirinç alternatifi olmamalı |
| Yoğurt grubu | Yoğurt | 1 | Ayran/kefir ile karışmamalı |
| Cips | 2 farklı marka | 2 | Aynı grup alternatif testi |
| Su | 0.5 L / 1.5 L | 2 | Paket boyutu farkı |
| Çikolata/bisküvi | 2 ürün | 2 | Şekerli ürün grubu |
| Hassas kategori | Bebek maması | 2 | Fail-closed |
| Alerjen içeren ürün | Fındık/süt/gluten içeren | 3 | Uyarı testi |
| OFF verisi zengin ürün | Besin/facts dolu ürün | 2 | Complete/strong veri yolu |
| OFF verisi zayıf ürün | Eksik facts ürün | 2 | Partial/kısmi veri yolu |
| Seed'de olan ürün | Fiyat beklenen ürün | 2 | Fiyat gelir |
| Seed'de olmayan ürün | Fiyat beklenmeyen ürün | 2 | Fiyat yok/kısmi sonuç |
| Bilinçli bulunamayan barkod | Uydurma/geçersiz barkod | 2 | Mock sızıntısı kontrolü |

Trap çiftleri listenin çekirdeğidir. Bunlar geçmeden kapalı beta çıkışı yapılmayacak.

---

## 4. Barkod kayıt tablosu

| # | Barkod | Ürün adı | Beklenen grup | Eksen | Trap mı? |
|---|--------|----------|---------------|-------|----------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |
| 11 | | | | | |
| 12 | | | | | |
| 13 | | | | | |
| 14 | | | | | |
| 15 | | | | | |
| 16 | | | | | |
| 17 | | | | | |
| 18 | | | | | |
| 19 | | | | | |
| 20 | | | | | |
| 21 | | | | | |
| 22 | | | | | |
| 23 | | | | | |
| 24 | | | | | |
| 25 | | | | | |
| 26 | | | | | |
| 27 | | | | | |
| 28 | | | | | |
| 29 | | | | | |
| 30 | | | | | |

---

## 5. Geçti/kaldı kriterleri

### Hard fail — beta çıkışını durdurur

- Yanlış/cross-group alternatif önerisi gösterildi.
- Eksik ürünü olan market "en ucuz market" seçildi.
- Barkod bulunamadığında mock/sentetik veri sızdı.
- Hassas kategoride, özellikle bebek mamasında, alternatif çıktı.
- Seed flag kapalıyken sentetik fiyat göründü.
- Sentetik/eksik facts "complete" gibi görünerek kullanıcıya yanlış güven verdi.
- Alerjen uyarısı riskli üründe gösterilmedi.
- Fiyatın beta/referans olduğu anlaşılmıyor.

### Soft fail — betadan önce düzeltilmeli ama tek başına bloklamayabilir

- Eksik sağlık verisi hâlâ "hata" gibi görünüyor.
- Ürün adıyla arama yanlış aday sıralıyor ama grup doğru.
- Yükleme süresi kabul edilebilir eşiğin üstünde.
- Görsel akış başarısızlığında mesaj belirsiz.
- UI metni doğru ama çok uzun/karmaşık.

---

## 6. Manuel test kayıt tablosu

Her test turu için bu tabloyu kopyala.

| Alan | Değer |
|------|-------|
| Barkod | |
| Ürün adı | |
| Bulundu / bulunamadı | |
| Fiyat geldi mi? | |
| Fiyat kaynağı: beta/canlı/referans/yok | |
| RafSkoru hesaplandı mı? | |
| Sağlık/içerik verisi: tam/kısmi/yok | |
| Sürdürülebilirlik verisi: tam/kısmi/yok | |
| Alternatif çıktı mı? | |
| Alternatif doğru ürün grubunda mı? | |
| Alerjen uyarısı beklendi mi / gösterildi mi? | |
| Sepet market sonucu mantıklı mı? | |
| Gösterilen veri/güven etiketi yeterli mi? | |
| Yükleme süresi, sn | |
| Kullanıcıya gösterilen uyarı/metin yeterli mi? | |
| Hard/Soft fail? | |
| Not | |

---

## 7. KVKK / gizlilik mini-checklist

Kapalı beta öncesi tamamlanmalı:

- [ ] Toplanan veri kalemleri listelendi: konum, ürün fotoğrafı, barkod, fiş/OCR varsa, kullanıcı katkısı, cihaz bilgisi.
- [ ] Her veri kalemi için kullanım amacı belirlendi.
- [ ] Her veri kalemi için saklama yeri ve saklama süresi belirlendi.
- [ ] Profil tercihleri cihazda tutuluyorsa bu kullanıcıya açıkça anlatıldı.
- [ ] Konumun yalnızca yakın market/fiyat sorgusu için kullanıldığı kullanıcıya anlatıldı.
- [ ] Fotoğraf/OCR verisi gereğinden fazla saklanmıyor.
- [ ] Kullanıcı katkılı verinin nasıl kullanılacağı açık.
- [ ] Kapalı beta veri/gizlilik notu ürün ve sepet sonucunda görünür.
- [ ] Gerekirse hukuk/KVKK uzmanı kontrolü için ayrı not oluşturuldu.

---

## 8. Önerilen Faz 3 commit sırası

Büyük refactor yok. Küçük, geri alınabilir, test edilebilir adımlar:

1. Bu checklist dosyası — sadece docs, sıfır risk.
2. Test fixtures dosyası — 20–30 barkod için yapısal veri: barcode, expectedGroup, axis, trap flag.
3. Kontrollü liste smoke testi:
   - Trap çiftleri ayrı grupta kalıyor mu?
   - Hassas kategori fail-closed mi?
   - Seed flag kapalıyken sentetik fiyat yok mu?
4. Ucuz guard testleri:
   - Production benzeri modda seed gerçek veri gibi davranmıyor.
   - Sentetik/eksik facts "complete" kabul edilmiyor.
5. Kullanıcı metni kontrolü:
   - "Beta fiyat", "veri eksik", "kısmi sonuç" dili gerilemiyor.
6. Manuel 20–30 barkod turu:
   - Bu dosyadaki kayıt tablosuyla sonuçlar doldurulur.

Kapalı beta için olmazsa olmaz: 1, 3, 4, manuel tur, KVKK mini-checklist.
Sonraya kalabilir: tüm 30 barkod için tam otomatik E2E, zengin sentetik facts, gelişmiş analytics, yükleme süresi optimizasyonu kabul edilebilir eşik tutuyorsa.

---

## 9. Çıkış onayı

- [ ] Bölüm 0 bloklayıcıların hepsi yeşil.
- [ ] Hard fail listesinde açık madde yok.
- [ ] KVKK mini-checklist tamam.
- [ ] Manuel test turu kaydı dolduruldu ve gözden geçirildi.

Onaylayan: __________

Tarih: __________