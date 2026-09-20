/**
 * RafSkoru — Haftalık sepet GELİŞTİRME ÖNİZLEMESİ fixture'ları (Aşama 9).
 * src/weeklyBasket/basketDevFixtures.ts
 *
 * Yalnız `__DEV__ && EXPO_PUBLIC_CONSUMER_UX_V2==='1'` iken kullanılır (bkz. DevStateGallery.tsx,
 * Aşama 8). Uydurma yapı verisidir; gerçek sepet/OFF/risk yanıtı DEĞİLDİR. Gerçek üretim view
 * builder'ı (`buildWeeklyBasketView`) ile aynı yoldan üretilir; yalnız girdi (WeeklyBasketRecord)
 * sentetiktir — galeri gerçek render mantığından sapmaz. Her görünüm `isDevPreview:true` taşır.
 */

import type { AllergenGateView, DataTrustView } from '../consumerUx/types';
import { buildWeeklyBasketView, type WeeklyBasketView } from './basketViewModel';
import type { WeeklyBasketLine, WeeklyBasketLineSnapshot, WeeklyBasketRecord } from './types';

const NOW = '2026-09-19T12:00:00.000Z';

function allergenGate(tone: AllergenGateView['tone'], text: string): AllergenGateView {
  return { tone, lines: [{ tone, text }], criticalNotices: [], a11ySummary: text };
}

function dataTrust(status: DataTrustView['status'], sourceLabel: string, missingLabels: string[] = []): DataTrustView {
  return { status, sourceLabel, freshnessText: null, missingLabels, isLocallyReviewedCandidate: status === 'locally_reviewed_candidate', conflict: null };
}

function makeLine(
  gtin: string,
  productName: string,
  tone: AllergenGateView['tone'],
  allergenText: string,
  opts?: { quantity?: number; dataStatus?: DataTrustView['status']; missingLabels?: string[]; healthAvailable?: boolean; contentAvailable?: boolean },
): WeeklyBasketLine {
  const snapshot: WeeklyBasketLineSnapshot = {
    productName,
    imageUrl: null,
    allergenGate: allergenGate(tone, allergenText),
    dataTrust: dataTrust(opts?.dataStatus ?? 'usable', 'Open Food Facts', opts?.missingLabels ?? []),
    healthScore: { isAvailable: opts?.healthAvailable ?? true, score: (opts?.healthAvailable ?? true) ? 68 : null },
    contentScore: { isAvailable: opts?.contentAvailable ?? true, score: (opts?.contentAvailable ?? true) ? 74 : null },
  };
  return { gtin, quantity: opts?.quantity ?? 1, snapshot, addedAt: NOW, updatedAt: NOW };
}

function record(lines: WeeklyBasketLine[]): WeeklyBasketRecord {
  return { basketId: 'dev-basket-1', weekStart: '2026-09-14', createdAt: NOW, updatedAt: NOW, lines };
}

export interface DevBasketFixtureEntry {
  key: string;
  title: string;
  view: WeeklyBasketView;
}

export const DEV_WEEKLY_BASKET_FIXTURES: readonly DevBasketFixtureEntry[] = [
  {
    key: 'empty_basket',
    title: '1. Boş sepet',
    view: buildWeeklyBasketView(null, { isDevPreview: true }),
  },
  {
    key: 'multi_item_basket',
    title: '2. Normal çok ürünlü sepet',
    view: buildWeeklyBasketView(
      record([
        makeLine('8690000000001', 'GELİŞTİRME ÖNİZLEMESİ — Yulaflı Bisküvi 200 g', 'not_listed', 'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.'),
        makeLine('8690000000002', 'GELİŞTİRME ÖNİZLEMESİ — Tam Buğday Ekmeği 500 g', 'declared', 'Beyana göre içerir: gluten'),
        makeLine('8690000000003', 'GELİŞTİRME ÖNİZLEMESİ — Badem Sütü 1 L', 'trace', 'İçerebilir: fındık'),
        makeLine('8690000000004', 'GELİŞTİRME ÖNİZLEMESİ — Pirinç 1 kg', 'unknown', 'Alerjen verisi yok veya doğrulanmamış. Güncel ambalaj etiketini kontrol edin.', { dataStatus: 'not_found', healthAvailable: false, contentAvailable: false }),
      ]),
      { isDevPreview: true },
    ),
  },
  {
    key: 'declared_match',
    title: '3. Beyana göre alerjen eşleşmesi',
    view: buildWeeklyBasketView(
      record([makeLine('8690000000005', 'GELİŞTİRME ÖNİZLEMESİ — Süt Kremalı Bisküvi', 'declared', 'Beyana göre içerir: süt, gluten')]),
      { isDevPreview: true },
    ),
  },
  {
    key: 'trace_warning',
    title: '4. İz uyarısı',
    view: buildWeeklyBasketView(
      record([makeLine('8690000000006', 'GELİŞTİRME ÖNİZLEMESİ — Çikolatalı Gofret', 'trace', 'İçerebilir: fındık, süt')]),
      { isDevPreview: true },
    ),
  },
  {
    key: 'missing_allergen_data',
    title: '5. Eksik alerjen verisi',
    view: buildWeeklyBasketView(
      record([makeLine('8690000000007', 'GELİŞTİRME ÖNİZLEMESİ — Karışık Baharat', 'unknown', 'Alerjen verisi yok veya doğrulanmamış. Güncel ambalaj etiketini kontrol edin.', { dataStatus: 'not_found', healthAvailable: false, contentAvailable: false })]),
      { isDevPreview: true },
    ),
  },
  {
    key: 'partial_score_coverage',
    title: '6. Kısmi skor kapsamı',
    view: buildWeeklyBasketView(
      record([
        makeLine('8690000000008', 'GELİŞTİRME ÖNİZLEMESİ — Yoğurt 1 kg', 'not_listed', 'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.'),
        makeLine('8690000000009', 'GELİŞTİRME ÖNİZLEMESİ — Kısmi Kayıt Ürünü', 'not_listed', 'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.', { dataStatus: 'partial', missingLabels: ['Nutri-Score'], healthAvailable: false, contentAvailable: true }),
      ]),
      { isDevPreview: true },
    ),
  },
  {
    key: 'same_gtin_quantity_increment',
    title: "7. Aynı GTIN'in miktar artırması",
    view: buildWeeklyBasketView(
      record([makeLine('8690000000010', 'GELİŞTİRME ÖNİZLEMESİ — Aynı Ürün 4 kez eklendi', 'not_listed', 'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.', { quantity: 4 })]),
      { isDevPreview: true },
    ),
  },
  {
    key: 'persistence_error',
    title: '8. Kalıcılık hatası',
    view: buildWeeklyBasketView(
      record([makeLine('8690000000011', 'GELİŞTİRME ÖNİZLEMESİ — Eklenmeye çalışılan ürün', 'not_listed', 'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.')]),
      { isDevPreview: true, persistenceError: 'Sepet cihazda kaydedilemedi. Depolama alanı dolu olabilir. Tekrar deneyin.' },
    ),
  },
];
