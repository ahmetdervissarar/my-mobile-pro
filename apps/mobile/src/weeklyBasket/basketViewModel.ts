/**
 * RafSkoru — Haftalık sepet view-model (Aşama 9). src/weeklyBasket/basketViewModel.ts
 *
 * SALT PROJEKSİYON, I/O YOK. Yeni skor formülü/ağırlık ÜRETMEZ: boyut kartları yalnız satır
 * bazında ZATEN hesaplanmış puanların basit ortalaması + kapsam sayımıdır (eksik ürünler
 * ortalamaya sıfır olarak katılmaz, sayılmaz — dışarıda bırakılır). Tek/bağlamsız bir sepet
 * geneli puanı YOKTUR. Alerjen özeti dört durumu asla birleştirmez; her satır kendi alerjen
 * durumunu korur (sepet özeti bir satırın uyarısını diğerleriyle dengelemez).
 */

import type { AllergenGateTone } from '../consumerUx/types';
import type { ConsumerDecisionView } from '../consumerUx/types';
import { formatWeekRangeLabel } from './weekUtils';
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

// ── Sepet alerjen özeti — dört durum, HİÇBİRİ birleştirilmez ─────────────────────────────

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

const ALLERGEN_GROUP_ORDER: { key: AllergenGateTone; label: string }[] = [
  { key: 'declared', label: 'Beyana göre içerir' },
  { key: 'trace', label: 'İçerebilir' },
  { key: 'unknown', label: 'Alerjen verisi eksik / doğrulanmamış' },
  { key: 'not_listed', label: 'Mevcut veride profil çakışması görünmüyor' },
];

function buildAllergenSummary(lines: readonly WeeklyBasketLine[]): BasketAllergenSummaryView {
  const groups = ALLERGEN_GROUP_ORDER.map(({ key, label }) => {
    const matches = lines.filter((line) => line.snapshot.allergenGate.tone === key);
    return { key, label, count: matches.length, productNames: matches.map((line) => line.snapshot.productName) };
  });
  return {
    groups,
    disclaimer: 'Bu özet bir güvenlik garantisi değildir; her ürünün kendi alerjen durumu ayrı ayrı kontrol edilmelidir.',
  };
}

// ── Boyut kapsamı — Besin profili / İçerik-katkı / Veri kapsamı ─────────────────────────

export interface BasketDimensionCoverageView {
  key: 'health' | 'content' | 'dataCoverage';
  label: string;
  isAvailable: boolean;
  /** Yalnız `isAvailable` true ise dolu; aksi halde kart "Bu boyut için veri yetersiz" gösterir. */
  averageText: string | null;
  coveredCountText: string;
  missingCountText: string;
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
    missingCountText: missing > 0 ? `${missing} üründe veri yok` : 'Tüm ürünlerde veri var',
  };
}

function buildDataCoverageDimension(lines: readonly WeeklyBasketLine[]): BasketDimensionCoverageView {
  const total = lines.length;
  const covered = lines.filter((line) => line.snapshot.dataTrust.status === 'usable').length;
  const missing = total - covered;
  return {
    key: 'dataCoverage',
    label: 'Veri kapsamı',
    isAvailable: covered > 0,
    averageText: null,
    coveredCountText: `${covered}/${total} ürün tam veri`,
    missingCountText: missing > 0 ? `${missing} üründe veri eksik/doğrulanmamış` : 'Tüm ürünlerde veri tam',
  };
}

// ── Satır görünümü ────────────────────────────────────────────────────────────────────

const DATA_STATUS_LABELS: Record<WeeklyBasketLineSnapshot['dataTrust']['status'], string> = {
  loading: 'Veri alınıyor',
  usable: 'Veri tam',
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
  itemCount: number;
  totalQuantity: number;
  isEmpty: boolean;
  allergenSummary: BasketAllergenSummaryView;
  dimensionCoverage: BasketDimensionCoverageView[];
  lines: WeeklyBasketLineView[];
  persistenceError: string | null;
  isDevPreview: boolean;
}

export function buildWeeklyBasketView(
  record: WeeklyBasketRecord | null,
  options?: { persistenceError?: string | null; isDevPreview?: boolean },
): WeeklyBasketView {
  const lines = record?.lines ?? [];
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    weekLabel: 'Bu haftanın sepeti',
    weekRangeText: record ? formatWeekRangeLabel(record.weekStart) : null,
    itemCount: lines.length,
    totalQuantity,
    isEmpty: lines.length === 0,
    allergenSummary: buildAllergenSummary(lines),
    dimensionCoverage:
      lines.length === 0
        ? []
        : [
            buildScoreDimension(lines, 'health', 'Besin profili', (l) => l.snapshot.healthScore),
            buildScoreDimension(lines, 'content', 'İçerik / katkı değerlendirmesi', (l) => l.snapshot.contentScore),
            buildDataCoverageDimension(lines),
          ],
    lines: lines.map(buildLineView),
    persistenceError: options?.persistenceError ?? null,
    isDevPreview: options?.isDevPreview ?? false,
  };
}
