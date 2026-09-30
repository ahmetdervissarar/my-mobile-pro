# ADR-005: Arama sonuçlarında sıralama sekmeleri kaldırıldı

Date: 2026-09-30
Status: Accepted

## Context

`app/(tabs)/search.tsx` bir `SegmentedControl` ile üç sıralama sekmesi gösteriyordu ("En yüksek puan", "En düşük fiyat", "Litre/kg fiyatı"), ancak `sortKey` state'i hiçbir yerde listeyi yeniden sıralamak için kullanılmıyordu — `sortedSuggestions` her zaman `suggestions` ile birebir aynıydı. Sekmelere dokunmak `sortKey`'i değiştiriyor ama ekranda hiçbir şey değişmiyordu.

Kök neden: `/api/search/suggest` puan veya fiyat alanı döndürmüyor (RafSkoru'nun henüz gerçek fiyat verisi kaynağı yok — bkz. ADR-004'ün "Limits/pending work" bölümü). Sıralanacak gerçek bir değer olmadığı için sekmeler yalnızca işlevsiz bir UI öğesiydi; kullanıcıya var olmayan bir yetenek vaat ediyordu.

## Decision

Sekmeler ve ilgili ölü state (`SortKey`, `SORT_OPTIONS`, `sortKey`/`setSortKey`, `sortedSuggestions` sarmalayıcısı) `search.tsx`'ten kaldırıldı. Liste artık `/api/search/suggest`'in döndürdüğü sırayla gösteriliyor; ekranın altındaki "Puan ve fiyat verisi arama sonuçlarında henüz yok" notu değişmeden kaldı.

`SegmentedControl` bileşeninin kendisi silinmedi — `basket.tsx` onu farklı, gerçekten işlevsel bir amaçla (sepet sekmeleri) kullanmaya devam ediyor.

## Follow-up

Gerçek fiyat ve/veya puan verisi arama sonuçlarına eklendiğinde, sıralama sekmeleri gerçek bir sıralama fonksiyonuyla birlikte geri eklenebilir. O zamana kadar sıralama UI'da sunulmayacak.
