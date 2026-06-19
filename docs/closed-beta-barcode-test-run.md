# RafSkoru — Kapalı Beta Barkod Test Turu

> Amaç: Kapalı beta öncesi 20–30 gerçek/temsilî barkodla ana kullanıcı akışlarını manuel doğrulamak.
> Kaynak checklist: `docs/closed-beta-validation-checklist.md`

## Test Özeti

| Alan | Değer |
|------|-------|
| Test tarihi | |
| Test eden | Ahmet Derviş SARAR |
| Cihaz | |
| Backend ortamı | Local / Beta |
| Seed fiyat açık mı? | Evet / Hayır |
| Konum açık mı? | Evet / Hayır |
| Genel sonuç | Geçti / Kaldı / Kısmi |

---

## Barkod Hedef Dağılımı

| # | Eksen | Ürün örneği | Barkod | Beklenen davranış | Sonuç |
|---|-------|-------------|--------|-------------------|-------|
| 1 | Süt referans | UHT süt 1 L | | Süt grubuna düşmeli; kefir/ayran alternatifi çıkmamalı | |
| 2 | Süt referans | Günlük süt / laktozsuz süt | | Süt grubuna düşmeli | |
| 3 | Trap | Kefir | | Kefir süt alternatifi olmamalı | |
| 4 | Trap | Ayran | | Ayran süt/yoğurt alternatifi olmamalı | |
| 5 | Pirinç referans | Osmancık/baldo pirinç | | Pirinç grubuna düşmeli | |
| 6 | Trap | Bulgur | | Bulgur pirinç alternatifi olmamalı | |
| 7 | Yoğurt referans | Yoğurt | | Yoğurt grubuna düşmeli; ayran/kefir karışmamalı | |
| 8 | Cips | Patates cipsi | | Aynı ürün grubunda alternatif çıkabilir | |
| 9 | Cips | Farklı marka cips | | Aynı ürün grubunda alternatif çıkabilir | |
| 10 | Su | 0.5 L su | | Su grubuna düşmeli | |
| 11 | Su | 1.5 L su | | Paket boyutu mantıklı görünmeli | |
| 12 | Çikolata/bisküvi | Çikolata | | Şekerli ürün grubu, veri uyarıları doğru | |
| 13 | Çikolata/bisküvi | Bisküvi | | Alerjen/içerik görünmeli | |
| 14 | Hassas kategori | Bebek maması | | Alternatif kesinlikle çıkmamalı | |
| 15 | Hassas kategori | Bebek devam sütü/mama | | Fail-closed | |
| 16 | Alerjen | Fındık içeren ürün | | Alerjen uyarısı görünmeli | |
| 17 | Alerjen | Gluten içeren ürün | | Alerjen/veri uyarısı görünmeli | |
| 18 | Alerjen | Süt içeren ürün | | Alerjen/veri uyarısı görünmeli | |
| 19 | OFF zengin | Besin/içerik verisi dolu ürün | | Sağlık/içerik skoru anlamlı görünmeli | |
| 20 | OFF zayıf | Eksik facts ürün | | Veri eksik/kısmi sonuç dili görünmeli | |
| 21 | Seed fiyat var | Seed’de olan ürün | | Beta fiyat açıkça görünmeli | |
| 22 | Seed fiyat yok | Seed’de olmayan ürün | | Fiyat yok/kısmi veri doğru görünmeli | |
| 23 | Bilinmeyen barkod | Uydurma/geçersiz barkod | | Ürün bulunamadı; mock sızıntısı yok | |
| 24 | Bilinmeyen barkod | Uydurma/geçersiz barkod | | Ürün bulunamadı; mock sızıntısı yok | |
| 25 | Sepet | Pirinç + süt | | Tam coverage market varsa en ucuz tam sepet gösterilmeli | |
| 26 | Sepet | Pirinç + bilinmeyen ürün | | Eksik ürünlü market en ucuz seçilmemeli | |

---

## Manuel Kayıt Şablonu

Her ürün için bu bloğu kopyala.

| Alan | Değer |
|------|-------|
| Barkod | |
| Ürün adı | |
| Bulundu / bulunamadı | |
| Beklenen ürün grubu | |
| Gerçek ürün grubu / görünen sonuç | |
| Fiyat geldi mi? | |
| Fiyat kaynağı: beta/canlı/referans/yok | |
| RafSkoru hesaplandı mı? | |
| Sağlık/içerik verisi: tam/kısmi/yok | |
| Sürdürülebilirlik verisi: tam/kısmi/yok | |
| Alternatif çıktı mı? | |
| Alternatif doğru ürün grubunda mı? | |
| Alerjen uyarısı beklendi mi / gösterildi mi? | |
| Kullanıcıya gösterilen uyarı/metin yeterli mi? | |
| Yükleme süresi, sn | |
| Hard/Soft fail? | |
| Not | |

---

## Hard Fail Takibi

- [ ] Cross-group alternatif görüldü mü?
- [ ] Bebek mamasında alternatif çıktı mı?
- [ ] Barkod bulunamadığında mock/sentetik veri sızdı mı?
- [ ] Seed kapalıyken beta fiyat göründü mü?
- [ ] Eksik ürünlü market en ucuz/en iyi sepet seçildi mi?
- [ ] Eksik facts complete/high-confidence gibi göründü mü?
- [ ] Beta/referans fiyat uyarısı kayboldu mu?
- [ ] Alerjen uyarısı beklenen yerde görünmedi mi?

## Sonuç

| Alan | Değer |
|------|-------|
| Hard fail sayısı | |
| Soft fail sayısı | |
| Kapalı beta kararı | Çıkılabilir / Düzeltme gerekli |
| Not | |