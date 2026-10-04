# ADR-008: Fiyatsız RafSkoru (ağırlık yeniden normalize edilmesi)

Date: 2026-10-04
Status: Accepted

## Context

`calculateRafScore` (`apps/backend/src/price/rafScore/rafScoreCalculator.ts`)
dört bileşenden ağırlıklı ortalama alır: fiyat, sağlık, içerik/alerjen,
sürdürülebilirlik (`DEFAULT_RAF_SCORE_WEIGHTS`). Fiyat verisi RafSkoru
kapsamındaki ürünlerin önemli bir kısmında yok — canlı fiyat sağlayıcıları
(market API'leri) her ürünü/marketi kapsamıyor, katalogda da fiyat alanı
tutulmuyor. Önceki davranışta fiyat bileşeni eksikken genel skor
hesaplanamıyordu: kullanıcı, sağlık/içerik verisi tam olsa bile "Veri
yetersiz" görüyordu — oysa fiyatsız bir ürün için de anlamlı bir sağlık/
içerik değerlendirmesi üretilebilirdi.

## Decision

1. **Ağırlıklar yeniden normalize edilir**: Skor, yalnızca MEVCUT
   bileşenlerin ağırlıklı ortalaması olarak hesaplanır —
   `weightedScoreTotal / availableWeightTotal` (eksik bileşenlerin ağırlığı
   toplam ağırlıktan düşülür, kalanlar kendi aralarında yeniden oranlanır).
   Fiyat eksikse skor, sağlık+içerik+sürdürülebilirlik ağırlıklarının
   kendi aralarındaki oranıyla hesaplanır — fiyatsızlık skoru "cezalandırmaz"
   ama fiyatın katkısını da simüle etmez.
2. **Minimum kapsam şartı**: Sağlık VE içerik ikisi BİRDEN eksikse (yalnız
   fiyat ve/veya sürdürülebilirlik varsa) skor `null` kalır — "Veri
   yetersiz" durumu budur (`hasMinimumCoverage` kontrolü). Yalnızca fiyat
   bilgisiyle bir "sağlık/içerik" izlenimi veren bir sayı üretilmez.
3. **Güven tavanı**: `confidence` dört bileşenden en az dördü (`4`)
   mevcutsa `high`, üçü mevcutsa `medium`, ikiden azsa `low` olur
   (`getConfidence`). Fiyat eksik bir üründe confidence en fazla `medium`
   olabilir — asla `high` gösterilmez, çünkü bir bileşen (fiyat) hep eksik
   kalmıştır. `status` da aynı mantıkla: `ready` yalnız 4/4 bileşen varken,
   aksi halde `partial` (0 bileşen varsa `unavailable`).
4. **Etiketleme**: `buildRafScoreReasons` (`reasons.ts`) fiyat eksikken
   `price_missing` nedenini üretir; mobil tarafta
   (`src/price/rafScoreExplanation.ts`) bu "Fiyat verisi bulunamadı; fiyat
   bileşeni kısmi yorumlanır." metnine çevrilir. Düşük genel güvende
   (`data_low_confidence`) "Veri güveni düşük; skor yardımcı gösterge
   olarak değerlendirilmelidir." gösterilir. Kullanıcı hiçbir zaman
   "fiyat dahil tam skor" ile "fiyatsız kısmi skor"u ayırt edemeyecek
   şekilde aynı görünümle karşılaşmaz — fiyat eksikliği her zaman ayrı bir
   neden satırı olarak görünür.
5. **Puan üretilmediği durumlar** (`score: null`, UI "Veri yetersiz"
   gösterir):
   - Hiçbir bileşen mevcut değilse (`status: 'unavailable'`).
   - Sağlık VE içerik ikisi birden eksikse (madde 2) — fiyat ve/veya
     sürdürülebilirlik tek başına yeterli sayılmaz.

## Consequence

Fiyatsız bir ürün artık (sağlık veya içerik verisi varsa) bir RafSkoru
alabilir — ama bu skorun güveni (`confidence`) en fazla `medium`'dur ve
mobil arayüzde "fiyat verisi bulunamadı" nedeni her zaman ayrıca
gösterilir. Sağlık/içerik verisi de yoksa (yalnız fiyat/sürdürülebilirlik
varsa) hiç skor üretilmez — bu, az sayıda sinyalden yanıltıcı bir "genel
puan" göstermemek içindir.
