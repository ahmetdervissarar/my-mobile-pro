/**
 * RafSkoru — Haftalık sepet veri tipleri (Aşama 9). src/weeklyBasket/types.ts
 *
 * Yalnız BU haftanın sepetini modeller; haftalık arşiv/alışveriş geçmişi bu aşamanın dışındadır
 * (kasıtlı olarak "önceki hafta" rollover/silme mantığı YOK). Alerjen kapısı ve veri kaynağı/
 * tamlık bilgisi, tüketici karar akışı V2'nin (Aşama 8) ZATEN hesaplanmış görünümünden (bkz.
 * `src/weeklyBasket/basketViewModel.ts::buildBasketLineSnapshotFromDecisionView`) anlık olarak
 * satıra kopyalanır — burada yeniden hesaplanmaz.
 */

import type { AllergenGateView, DataTrustView } from '../consumerUx/types';

export interface WeeklyBasketScoreSnapshot {
  isAvailable: boolean;
  /** 0–100; yalnız `isAvailable` true ise anlamlıdır. */
  score: number | null;
}

export interface WeeklyBasketLineSnapshot {
  productName: string;
  imageUrl: string | null;
  /** Ürün düzeyi alerjen kapısı sonucu — ekleme anında zaten hesaplanmış görünümden kopyalanır. */
  allergenGate: AllergenGateView;
  /** Ürün düzeyi veri kaynağı/tamlık bilgisi. */
  dataTrust: DataTrustView;
  healthScore: WeeklyBasketScoreSnapshot;
  contentScore: WeeklyBasketScoreSnapshot;
}

export interface WeeklyBasketLine {
  gtin: string;
  quantity: number;
  snapshot: WeeklyBasketLineSnapshot;
  addedAt: string;
  updatedAt: string;
}

export interface WeeklyBasketRecord {
  basketId: string;
  weekStart: string;
  createdAt: string;
  updatedAt: string;
  lines: WeeklyBasketLine[];
}
