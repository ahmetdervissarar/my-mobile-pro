---
name: verification-gates
description: RafSkoru'nda her kod değişikliğinden önce ve sonra çalıştırılacak kontroller; paket ekleme, lockfile değişikliği ve dış servis kullanımı için insan onayı şartları. Kod yazmadan önce ve PR'dan önce kullan.
---

# Doğrulama Kapıları

## Değişiklik ÖNCESİ (plan aşaması)
- [ ] Etkilenen dosyalar ve satırlar listelendi; "korumalı bölge" (`riskEngine.ts`, alerjen kapısı,
      `price/types.ts`, sağlayıcı zinciri) içindeyse insan onayı alındı.
- [ ] Geri alma yolu tanımlı (tek commit, `git revert` ile geri dönülebilir).
- [ ] Test planı: hangi smoke/senaryo dosyası güncellenecek veya eklenecek.
- [ ] Sözleşme değişiyorsa mobil + backend tipleri aynı PR'da.
- [ ] Temiz başlangıç: `git status --porcelain` boş.

## Değişiklik SONRASI (sırayla; hepsi yeşil olmadan PR yok)
1. `apps/backend`: `npm run check`
2. `apps/backend`: `npm run smoke` → 34 `*_OK` (yeni smoke eklendiyse sayı güncellenir)
3. `apps/backend`: `npm run audit:encoding:strict` + BOM kontrolü
4. `apps/mobile`: `npx tsc --noEmit`
5. `apps/mobile`: `npm run smoke:beta-wording`
6. Risk senaryoları: 28/28 (alerjen akışına dokunulduysa yeni senaryolar eklenmiş olmalı)
7. `git diff --stat` okunabilir; ilgisiz dosya yok; BOM/CRLF eklenmemiş
8. Gizli anahtar taraması (regex) temiz; `.env*` izlenmiyor
9. Olumlu güvenlik iddiası kontrolü (bağlamsal; `release-gatekeeper` 11. kapı)
10. `release-gatekeeper` raporu: PASS/FAIL tablosu ana oturuma eklenir

## İnsan onayı ZORUNLU olan işlemler
| İşlem | Onaydan önce sunulacak |
|---|---|
| Yeni npm paketi | ad, sürüm, lisans, neden gerekli, alternatif, boyut |
| Lockfile değişikliği (`npm install`) | diff özeti; mobil lockfile şu an senkron değil — düzeltme ayrı görev |
| Dış servis / API çağrısı (OFF yazma, Google Places, herhangi bir fiyat kaynağı) | uç nokta, ToS/lisans notu, veri akışı, anahtar yönetimi |
| Ortam değişkeni ekleme | ad, varsayılan, üretimde davranış |
| Risk motoru / alerjen kapısı / sözleşme tipi değişikliği | `allergen-safety-reviewer` ve/veya `product-data-contract-reviewer` raporu |
| Veri dosyası (`seed-candidates.json`, `manual-prices.json`) değişikliği | kaynak, gözlem tarihi, `isSynthetic` / doğrulama düzeyi etiketi |
| `_archive` içinde herhangi bir işlem | gerekçe |
| Subagent başlatma | hangi ajan, kapsam, beklenen çıktı satırı |

## Kırmızı kapı davranışı
Kapı kırmızıysa: **düzeltme yapma**, hata satırlarını (ilk 5) ve dosya yolunu raporla, ana oturuma
"düzeltme planı istiyor musun?" sor. Otomatik `--fix`, test silme/atlama, `skipLibCheck`
benzeri gevşetme yasak.

## Raporlama şablonu
```
Değişiklik: <tek cümle>
Dosyalar: <n> (liste)
Kapılar: tsc-be ✅ smoke 34/34 ✅ enc ✅ tsc-mob ✅ wording ✅ risk 28/28 ✅ diff ✅ secrets ✅ claims ✅
Açık kalan: <varsa>
```
