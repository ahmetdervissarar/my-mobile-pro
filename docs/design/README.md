# RafSkoru tasarım referansı

`prototip-v3.html` — 21 Eylül 2026'da claude.ai'de hazırlanan tıklanabilir mobil prototip
(canlı sürüm: https://claude.ai/artifact/KSexozhxX62y778aiiQtMy). Tarayıcıda açılır; kurulum gerekmez.

**Bu dosya uygulama kodu değildir.** React Native ekranları için görsel ve akış referansıdır.
İçindeki marka, market, şube, fiyat, puan, Nutri-Score ve NOVA değerleri **örnektir**; gerçek veri gibi
kullanılmaz ve üretim koduna kopyalanmaz.

## Kapsanan ekranlar
- **Ana ekran:** Barkod okut (ana eylem), Fotoğrafla tanı, İsimle ara, Sepet, Alerji profilim
- **Arama:** yazdıkça liste; görsel, puan, "…₺'den · N markette", sepete ekle; puan / fiyat / birim fiyat sıralaması
- **Ürün sonucu:** en üstte alerji bandı (puandan bağımsız), puan halkası, Nutri-Score + NOVA,
  dikkat edilecekler / olumlu yönler, market fiyatları ve en yakın şube, daha yüksek puanlı seçenekler
- **Sepet — Puana göre:** toplam RafSkoru, "Daha iyi RafSkoru'lu sepet" (tümünü uygula),
  ürün bazında öneri, grubunda en yüksek puanlı markalar
- **Sepet — Fiyata göre:** en uygun market (yalnız tüm ürünleri bulunduran), en yakın tam sepet,
  eksik ürün sayısı, ucuz / yakın sıralaması
- **Alerji profili**, **kayıtlı olmayan ürün ekleme** (3 fotoğraf)

## Uyulan kurallar
- Alerji uyarısı puana ve sepet ortalamasına karışmaz; çakışan ürün öneri olarak sunulmaz.
- "Veri yok" hiçbir zaman "içermez / güvenli" olarak gösterilmez.
- Konum yalnız cihazda kullanılır; mesafe kuş uçuşu hesaplanır.
