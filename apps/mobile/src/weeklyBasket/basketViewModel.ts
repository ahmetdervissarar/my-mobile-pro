/**
 * RafSkoru — Haftalık sepet view-model (Aşama 9). src/weeklyBasket/basketViewModel.ts
 *
 * SALT PROJEKSİYON, I/O YOK. Yeni skor formülü/ağırlık ÜRETMEZ: boyut kartları yalnız satır
 * bazında ZATEN hesaplanmış puanların basit ortalamasıdır (miktar/tüketim sıklığı hesaba
 * katılmaz) + kapsam sayımıdır (eksik ürünler ortalamaya sıfır olarak katılmaz, dışarıda
 * bırakılıp ayrıca sayılır). Tek/bağlamsız bir sepet geneli puanı YOKTUR. Alerjen özeti dört
 * BEYAN durumunu asla birleştirmez; her satır kendi alerjen durumunu korur. Kullanıcının
 * PROFİLİYLE çakışan kritik uyarılar ayrı, bağımsız bir bölümdür — ürün beyan grubuyla
 * karıştırılmaz (bir ürün "beyan edilmiş alerjen" grubunda görünebilir ama profil eşleşmesi
 * olmayabilir, ya da tersi mümkün değildir çünkü kritik uyarı zaten bir beyan/iz eşleşmesidir).
 */

import type { AllergenGateTone, ConsumerDecisionView, CriticalAllergenNotice } from '../consumerUx/types';
import { getIsoWeekStartDate, formatWeekRangeLabel } from './weekUtils';
import type { WeeklyBasketLine, WeeklyBasketLineSnapshot, WeeklyBasketRecord, WeeklyBasketScoreSnapshot } from './types';

// ── Ekleme anında snapshot üretimi — ZATEN hesaplanmış ConsumerDecisionView'den kopyalar ────

export function buildBasketLineSnapshotFromDecisionView(
  view: ConsumerDecisionView,
  healthScoreRaw: { status: string; score: number | null } | null,
  contentScoreRaw: { status: string; score: number | null } | null,
): WeeklyBasketLineSnapshot {
  const toScoreSnapshot = (raw: { status: string; score: number | null } | null): WeeklyBasketScoreSnapshot => ({
    isAvailable: Boolean(raw && raw.status !== 'unavailable' && raw.score !== null),
    score: raw?.score ?? null,
  });

  return {
    productName: view.identity.name,
    imageUrl: view.identity.imageUrl,
    allergenGate: view.allergenGate,
    dataTrust: view.dataTrust,
    healthScore: toScoreSnapshot(healthScoreRaw),
    contentScore: toScoreSnapshot(contentScoreRaw),
  };
}

// ── Profilinizle eşleşen kritik uyarılar — ürün BEYAN gruplarından AYRI, bağımsız bölüm ────
// `criticalNotices` yalnız ekleme anında GERÇEKTEN profil eşleşmesi varsa doludur (bkz.
// consumerUx/decisionViewModel.ts::buildAllergenGateView, riskEngine'in ürettiği uyarılardan).
// Burada YENİDEN hesaplama YOK — yalnız satırlara zaten kopyalanmış olan bu alan toplanır.

export interface BasketCriticalAllergenItem {
  gtin: string;
  productName: string;
  notices: CriticalAllergenNotice[];
}

export interface BasketCriticalAllergenView {
  items: BasketCriticalAllergenItem[];
  isEmpty: boolean;
  /** Ekleme anındaki profil eşleşmesi olduğunu açıkça belirtir — güncel profil farklı olabilir. */
  snapshotDisclaimer: string;
  /** Kritik uyarı yokken gösterilir; olumlu/güvenli bir sonuç İDDİA ETMEZ (P5, D1). */
  emptyNotice: string;
}

function buildCriticalAllergenView(lines: readonly WeeklyBasketLine[]): BasketCriticalAllergenView {
  const items = lines
    .filter((line) => line.snapshot.allergenGate.criticalNotices.length > 0)
    .map((line) => ({
      gtin: line.gtin,
      productName: line.snapshot.productName,
      notices: line.snapshot.allergenGate.criticalNotices,
    }));

  return {
    items,
    isEmpty: items.length === 0,
    snapshotDisclaimer:
      'Bu, ürün sepete eklendiği andaki profil eşleşmesidir. Alerji profilinizi daha sonra değiştirdiyseniz ürünleri yeniden kontrol edin.',
    emptyNotice:
      'Sepete eklenme anında kaydedilmiş kritik profil uyarısı yok. Bu, ürünlerin güvenli olduğu anlamına gelmez; profilinizi değiştirdiyseniz ürünleri ve güncel etiketleri yeniden kontrol edin.',
  };
}

// ── Sepet alerjen özeti — dört BEYAN durumu, HİÇBİRİ birleştirilmez, profil iddiası taşımaz ──
// Gruplar `allergenGate.tone` (BASKIN durum) yerine `allergenGate.lines`'a göre kurulur: bir
// üründe hem `declared` hem `trace` satırı varsa (örn. "Beyana göre içerir: X" + "İçerebilir: Y")
// ürün İKİ grupta da tam birer kez sayılır — dominant tone tek grup seçip diğerini kaybetmez.
// Gruplar birbirini DIŞLAMAZ (bkz. disclaimer). Satır kartındaki baskın renk/ton (`buildLineView`)
// bu değişiklikten etkilenmez, orada hâlâ `allergenGate.tone` kullanılır.

export interface BasketAllergenSummaryGroup {
  key: AllergenGateTone;
  label: string;
  count: number;
  productNames: string[];
}

export interface BasketAllergenSummaryView {
  groups: BasketAllergenSummaryGroup[];
  disclaimer: string;
}

// Etiketler yalnız ÜRÜNÜN kendi beyanını anlatır; profille bir çakışma/eşleşme İDDİA ETMEZ
// (profil eşleşmesi ayrı bölümdedir, bkz. buildCriticalAllergenView).
const ALLERGEN_GROUP_ORDER: { key: AllergenGateTone; label: string }[] = [
  { key: 'declared', label: 'Beyan edilmiş alerjen bulunan ürünler' },
  { key: 'trace', label: 'İz/eser beyanı bulunan ürünler' },
  { key: 'unknown', label: 'Alerjen verisi eksik veya doğrulanmamış ürünler' },
  { key: 'not_listed', label: 'Mevcut kayıtta alerjen belirtilmemiş ürünler' },
];

function buildAllergenSummary(lines: readonly WeeklyBasketLine[]): BasketAllergenSummaryView {
  const groups = ALLERGEN_GROUP_ORDER.map(({ key, label }) => {
    const matches = lines.filter((line) => line.snapshot.allergenGate.lines.some((gateLine) => gateLine.tone === key));
    return { key, label, count: matches.length, productNames: matches.map((line) => line.snapshot.productName) };
  });
  return {
    groups,
    disclaimer:
      'Bu özet bir güvenlik garantisi değildir; her ürünün kendi alerjen durumu ayrı ayrı kontrol edilmelidir. Gruplar birbirini dışlamaz; bir ürün birden fazla beyan grubunda görünebilir.',
  };
}

// ── Boyut kapsamı — Besin profili / İçerik-katkı / Veri kapsamı ─────────────────────────

export interface BasketDimensionCoverageBreakdownItem {
  key: string;
  label: string;
  count: number;
}

export interface BasketDimensionCoverageView {
  key: 'health' | 'content' | 'dataCoverage';
  label: string;
  isAvailable: boolean;
  /** Yalnız `isAvailable` true ise dolu; aksi halde kart "Bu boyut için veri yetersiz" gösterir. */
  averageText: string | null;
  coveredCountText: string;
  missingCountText: string;
  /** Yalnız `dataCoverage` boyutunda dolu: kullanılabilir/kısmi/çatışma/yerel aday/bulunamadı ayrı sayılır. */
  breakdown: BasketDimensionCoverageBreakdownItem[] | null;
}

function buildScoreDimension(
  lines: readonly WeeklyBasketLine[],
  key: 'health' | 'content',
  label: string,
  getScore: (line: WeeklyBasketLine) => WeeklyBasketScoreSnapshot,
): BasketDimensionCoverageView {
  const total = lines.length;
  const available = lines.filter((line) => {
    const s = getScore(line);
    return s.isAvailable && s.score !== null;
  });
  const missing = total - available.length;
  const average =
    available.length > 0
      ? Math.round(available.reduce((sum, line) => sum + (getScore(line).score ?? 0), 0) / available.length)
      : null;

  return {
    key,
    label,
    isAvailable: available.length > 0,
    averageText: average !== null ? `${average}/100 ortalama` : null,
    coveredCountText: `${available.length}/${total} ürün`,
    missingCountText: missing > 0 ? `${missing} üründe bu boyut hesaplanamadı` : 'Tüm ürünlerde bu boyut hesaplandı',
    breakdown: null,
  };
}

const DATA_COVERAGE_BREAKDOWN_LABELS: Record<string, string> = {
  usable: 'Kullanılabilir veri',
  partial: 'Kısmi veri',
  conflict: 'Kaynak çatışması',
  locally_reviewed_candidate: 'Yerel incelenmiş aday',
  not_found_or_unloaded: 'Bulunamadı / yüklenemedi',
};

function buildDataCoverageDimension(lines: readonly WeeklyBasketLine[]): BasketDimensionCoverageView {
  const total = lines.length;
  const counts = { usable: 0, partial: 0, conflict: 0, locally_reviewed_candidate: 0, not_found_or_unloaded: 0 };

  for (const line of lines) {
    const status = line.snapshot.dataTrust.status;
    // Yalnız 'usable' kapsanmış sayılır; diğer dört durum ayrı ayrı sayılır, sıfır olarak
    // ortalamaya EKLENMEZ (burada zaten bir ortalama yok, yalnız sayım var).
    if (status === 'usable') counts.usable += 1;
    else if (status === 'partial') counts.partial += 1;
    else if (status === 'conflict') counts.conflict += 1;
    else if (status === 'locally_reviewed_candidate') counts.locally_reviewed_candidate += 1;
    else counts.not_found_or_unloaded += 1; // 'not_found' | 'loading'
  }

  const breakdown: BasketDimensionCoverageBreakdownItem[] = [
    { key: 'usable', label: DATA_COVERAGE_BREAKDOWN_LABELS.usable, count: counts.usable },
    { key: 'partial', label: DATA_COVERAGE_BREAKDOWN_LABELS.partial, count: counts.partial },
    { key: 'conflict', label: DATA_COVERAGE_BREAKDOWN_LABELS.conflict, count: counts.conflict },
    { key: 'locally_reviewed_candidate', label: DATA_COVERAGE_BREAKDOWN_LABELS.locally_reviewed_candidate, count: counts.locally_reviewed_candidate },
    { key: 'not_found_or_unloaded', label: DATA_COVERAGE_BREAKDOWN_LABELS.not_found_or_unloaded, count: counts.not_found_or_unloaded },
  ];

  return {
    key: 'dataCoverage',
    label: 'Veri kapsamı',
    isAvailable: counts.usable > 0,
    averageText: null,
    coveredCountText: `${counts.usable}/${total} ürün kullanılabilir veri`,
    missingCountText: `${total - counts.usable} üründe veri kısmi, çatışmalı, aday veya bulunamadı`,
    breakdown,
  };
}

// ── Satır görünümü ────────────────────────────────────────────────────────────────────

const DATA_STATUS_LABELS: Record<WeeklyBasketLineSnapshot['dataTrust']['status'], string> = {
  loading: 'Veri alınıyor',
  usable: 'Kullanılabilir veri',
  partial: 'Veri kısmi',
  not_found: 'Veri yok',
  locally_reviewed_candidate: 'Yerel aday — doğrulanmadı',
  conflict: 'Kaynaklar çatışıyor',
};

export interface WeeklyBasketLineView {
  gtin: string;
  quantity: number;
  productName: string;
  imageUrl: string | null;
  allergenTone: AllergenGateTone;
  allergenSummaryText: string;
  dataStatusLabel: string;
  canDecrement: boolean;
  canViewAlternatives: boolean;
}

function buildLineView(line: WeeklyBasketLine): WeeklyBasketLineView {
  return {
    gtin: line.gtin,
    quantity: line.quantity,
    productName: line.snapshot.productName,
    imageUrl: line.snapshot.imageUrl,
    allergenTone: line.snapshot.allergenGate.tone,
    allergenSummaryText: line.snapshot.allergenGate.lines.map((l) => l.text).join(' '),
    dataStatusLabel: DATA_STATUS_LABELS[line.snapshot.dataTrust.status] ?? 'Veri durumu bilinmiyor',
    canDecrement: line.quantity > 1,
    canViewAlternatives: line.snapshot.dataTrust.status !== 'not_found',
  };
}

// ── Bütün ekran görünümü ─────────────────────────────────────────────────────────────

export interface WeeklyBasketView {
  weekLabel: string;
  weekRangeText: string | null;
  /** false = yüklenen sepet ÖNCEKİ bir haftaya ait (bkz. app/weekly-basket.tsx "Yeni haftaya başla"). */
  isCurrentWeek: boolean;
  itemCount: number;
  totalQuantity: number;
  isEmpty: boolean;
  /** true = sepet OKUNAMADI/bozuk; bu durumda "Sepetiniz boş" YAZILMAZ (D1: bilinmeyen ≠ boş/güvenli). */
  hasLoadError: boolean;
  criticalAllergen: BasketCriticalAllergenView;
  allergenSummary: BasketAllergenSummaryView;
  dimensionCoverage: BasketDimensionCoverageView[];
  /** Boyut kartlarının ÜZERİNDE bir kez gösterilir; yeni bir skor iddiası değil, yöntem açıklamasıdır. */
  dimensionMethodologyNote: string | null;
  lines: WeeklyBasketLineView[];
  persistenceError: string | null;
  isDevPreview: boolean;
}

export function buildWeeklyBasketView(
  record: WeeklyBasketRecord | null,
  options?: { persistenceError?: string | null; hasLoadError?: boolean; isDevPreview?: boolean; now?: string },
): WeeklyBasketView {
  const lines = record?.lines ?? [];
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const now = options?.now ?? new Date().toISOString();
  const isCurrentWeek = !record || record.weekStart === getIsoWeekStartDate(new Date(now));

  return {
    weekLabel: 'Bu haftanın sepeti',
    weekRangeText: record ? formatWeekRangeLabel(record.weekStart) : null,
    isCurrentWeek,
    itemCount: lines.length,
    totalQuantity,
    isEmpty: lines.length === 0,
    hasLoadError: options?.hasLoadError ?? false,
    criticalAllergen: buildCriticalAllergenView(lines),
    allergenSummary: buildAllergenSummary(lines),
    dimensionCoverage:
      lines.length === 0
        ? []
        : [
            buildScoreDimension(lines, 'health', 'Besin profili', (l) => l.snapshot.healthScore),
            buildScoreDimension(lines, 'content', 'İçerik / katkı değerlendirmesi', (l) => l.snapshot.contentScore),
            buildDataCoverageDimension(lines),
          ],
    dimensionMethodologyNote:
      lines.length === 0 ? null : 'Ürün skorlarının basit ortalamasıdır; miktar ve tüketim sıklığı hesaba katılmaz.',
    lines: lines.map(buildLineView),
    persistenceError: options?.persistenceError ?? null,
    isDevPreview: options?.isDevPreview ?? false,
  };
}
