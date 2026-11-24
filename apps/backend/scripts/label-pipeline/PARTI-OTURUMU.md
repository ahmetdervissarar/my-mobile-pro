# RafSkoru — Claude parti oturumu talimatı (ADR-009 §16)

Bu talimat, Codex bir partiyi okuduktan sonra **kısa ömürlü ayrı bir Claude oturumunda** uygulanır.
Amaç token tasarrufu: uzun ana oturum her okuma bildiriminde yeniden uyanmasın.
CLAUDE.md'deki bütün kurallar geçerlidir. Bu oturum **onay vermez, commit/push yapmaz**,
kod değiştirmez; yalnız aşağıdaki adımları uygular ve kısa rapor verir.

Komutlar `apps/backend` klasöründen çalışır. `<B>` = açık parti klasörünün tam yolu
(`data/label-store/off/ilerleme.json` → `acikParti`).

## 1. Kontrol
- `<B>/reads-codex/` dosya sayısını ve `<B>/codex-ozet.md`yi oku (Codex'in sınıflandırması).
- `node scripts/label-pipeline/make-jobs.mjs claude "<B>"` → `data/label-store/claude-is.json`.

## 2. Okuma 1 (Claude Sonnet)
- `claude-is.json`daki her ürün için **ayrı** `label-reader` alt-ajanı, `model: "sonnet"`,
  arka planda. Aynı anda en fazla 20; biri bitince sıradakini başlat.
- İstem birebir şu biçimde (toplama aracı bu başlığı arar):
  `[OKUMA 1 <barkod>] Aşağıdaki fotoğraf dosyalarını Read aracıyla aç ve talimatındaki JSON biçiminde yanıt ver. Yalnız bu dosyaları oku.`
  ardından her fotoğraf için `- <tam yol>` satırı (claude-is.json'daki asıl fotoğraflar).
- Bildirimlere tek tek uzun yanıt yazma; hepsi bitince devam et.

## 3. Topla, yedekle, aktar
- `node scripts/label-pipeline/collect-reads.mjs "C:/Users/Derviş/.claude/projects/C--Users-Dervi--Desktop-my-mobile-pro" "<B>"`
  → "iki okuması tamam" sayısı claude-is.json ürün sayısına eşit olmalı; değilse eksikleri yeniden okut.
- Köken kontrolü: `imports/*.json` içinde `extractRead.model` = `label-reader (claude-sonnet-…)`,
  `verifyRead.model` = `codex (…)`.
- `node scripts/label-pipeline/backup.mjs` (önce), sonra `npm run -s label:import -- <B>/imports/*.json`.

## 4. Teyit listesi
`data/label-store/teyit-listesi.md` sonuna, mevcut biçimde bir "kuyruk partisi N" bölümü ekle
(`_Son güncelleme_` satırını güncelle):
- **Okunan değerden emin değilim:** içindekiler/alerjen/eser alanı iki okumada farklı **ve** okuyucu
  notu belirsizlik bildiriyor; besin tablosu kaymış; iki fotoğraf farklı ürün.
- **İçindekiler okunamadı:** gıda ürünü, iki okumadan en az birinde içindekiler yok.
- **Aday oluşmadı:** `codex-ozet.md`de `icerik-yok`, `barkod-farkli`, `dosya-yok` olanlar
  (sade su hariç; "listeye almadıklarım" satırına yaz).
- Gıda dışı ürünleri (kozmetik, temizlik, hayvan maması) "gıda dışı seçilmeli" notuyla yaz ve
  `scripts/label-pipeline/onay-listesi.mts` içindeki `NON_FOOD` kümesine barkodlarını ekle.
- Takviye edici gıda, bebek maması ve keten tohumu yağı **gıdadır** (proje sahibi kararı, 2026-11-24).

## 5. Sonraki parti
- `node scripts/label-pipeline/next-batch.mjs --yalniz-indir`. Codex'in dosya yazmadığı ürün
  yüzünden "önce Codex bitirmeli" derse: `<B>/durum.json`da `codexDeneme: 2`,
  `codexOkunanSon: <okunan sayı>` yap ve bayraksız `node scripts/label-pipeline/next-batch.mjs`
  çalıştır; sonra yeni partinin `durum.json`unda `codexDeneme: 0` yap.
- Küçük kopyalar (proje sahibinin izin verdiği tek komut):
  `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/label-pipeline/shrink-photos.ps1 -BatchDir "<yeni parti tam yolu>"`
- `node scripts/label-pipeline/make-jobs.mjs codex "<yeni parti tam yolu>"` → 50 ürünün hepsi
  `codex` kopyalarına bakmalı.

## 6. Rapor (en fazla 10 satır, Türkçe, sade)
Partide aday sayısı (aynı / farklı), depodaki toplam bekleyen, teyit listesine eklenen sayı,
gıda dışı sayısı, varsa karar gerektiren konu, sonraki partinin hazır olduğu. Son satır:
"Codex'e yeni konuşmada talimatı verebilirsin."
