/**
 * RafSkoru — Tüketici karar akışı V2 GELİŞTİRME ÖNİZLEMESİ fixture'ları (Aşama 8).
 * src/consumerUx/devFixtures.ts
 *
 * Yalnız `__DEV__ && EXPO_PUBLIC_CONSUMER_UX_V2==='1'` iken kullanılır (bkz. DevStateGallery.tsx).
 * Uydurma yapı verisidir; gerçek OFF/risk/skor yanıtı DEĞİLDİR. Her görünüm `isDevPreview:true`
 * taşır ve galeri bunu "GELİŞTİRME ÖNİZLEMESİ" etiketiyle gösterir — üretim ekranına SIZMAZ
 * (gerçek `ConsumerDecisionView`, `product-result.tsx`'te her zaman `isDevPreview:false` alır).
 *
 * Gerçek üretim mantığıyla (view-model builder fonksiyonları) aynı yoldan üretilir; yalnız
 * girdiler sentetiktir — bu, galerinin gerçek render mantığından SAPMAMASINI sağlar.
 */

import type { AllergenDeclaration } from '../contracts/generated';
import type { LocallyReviewedRecord } from '../localProduct/resolution/types';
import type { ProductDataView } from '../localProduct/types';
import type { ProductRiskResult } from '../riskEngine/riskEngine';
import { projectConsumerDecisionViewModel } from './decisionViewModel';
import type { ConsumerDecisionView, ProductIdentityView } from './types';

const IDENTITY: ProductIdentityView = { name: 'GELİŞTİRME ÖNİZLEMESİ — Örnek Ürün 200 g', barcode: '8690000000099', imageUrl: null, isLoading: false };

const RISK_EMPTY: ProductRiskResult = { overallRisk: 'unknown', warnings: [], isEvaluated: true };

const OFF_SOURCE = { source: 'off' as const, confidence: 'medium' as const, reference: null, fetchedAt: null };

function readableDeclaration(declaredTags: string[], traceTags: string[]): AllergenDeclaration {
  return { status: 'readable', declaredTags, traceTags, source: OFF_SOURCE };
}

const ABSENT_DECLARATION: AllergenDeclaration = { status: 'absent', declaredTags: [], traceTags: [], source: null };

const USABLE_DATA_VIEW: ProductDataView = {
  state: 'usable',
  sourceLabel: 'Open Food Facts',
  fields: [],
  missingLabels: [],
  capabilities: { risk: true, health: true, content: true },
  allergenDeclaration: ABSENT_DECLARATION,
  summary: 'GELİŞTİRME ÖNİZLEMESİ.',
};

const PARTIAL_DATA_VIEW: ProductDataView = {
  ...USABLE_DATA_VIEW,
  state: 'partial',
  missingLabels: ['Ürün görseli', 'Nutri-Score', 'NOVA işleme grubu'],
};

function baseInput() {
  return {
    isLoading: false,
    identity: IDENTITY,
    riskResult: RISK_EMPTY,
    criticalProfileWarnings: [],
    reviewedRecord: null as LocallyReviewedRecord | null,
    offProductName: null as string | null,
    rafScore: null,
    priceScore: null,
    healthScore: null,
    contentScore: null,
    sustainability: null,
    visibleAlternatives: [],
  };
}

function toDevPreview(view: ConsumerDecisionView): ConsumerDecisionView {
  return { ...view, isDevPreview: true };
}

export interface DevFixtureEntry {
  key: string;
  title: string;
  view: ConsumerDecisionView;
}

export const DEV_CONSUMER_DECISION_FIXTURES: readonly DevFixtureEntry[] = [
  {
    key: 'declared_contains',
    title: '1. Beyana göre içerir',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: readableDeclaration(['gluten', 'milk'], []),
        productDataView: USABLE_DATA_VIEW,
      }),
    ),
  },
  {
    key: 'trace_may_contain',
    title: '2. İçerebilir',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: readableDeclaration([], ['tree_nuts']),
        productDataView: USABLE_DATA_VIEW,
      }),
    ),
  },
  {
    key: 'not_listed_in_available_data',
    title: '3. Mevcut veride belirtilmemiş',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: readableDeclaration([], []),
        productDataView: USABLE_DATA_VIEW,
      }),
    ),
  },
  {
    key: 'unknown_or_unverified',
    title: '4. Veri yok / doğrulanmamış',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: ABSENT_DECLARATION,
        productDataView: USABLE_DATA_VIEW,
      }),
    ),
  },
  {
    key: 'partial_off_data',
    title: '5. Kısmi OFF verisi',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: readableDeclaration(['egg'], []),
        productDataView: PARTIAL_DATA_VIEW,
      }),
    ),
  },
  {
    key: 'not_found',
    title: '6. OFF’ta bulunmayan ürün',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: ABSENT_DECLARATION,
        productDataView: null,
      }),
    ),
  },
  {
    key: 'locally_reviewed_candidate',
    title: '7. Yerel inceleme adayı',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: ABSENT_DECLARATION,
        productDataView: PARTIAL_DATA_VIEW,
        reviewedRecord: {
          id: 'dev-review-1',
          status: 'locally_reviewed_candidate',
          gtin: IDENTITY.barcode,
          draftId: 'dev-draft-1',
          checks: [],
          evidence: [],
          allergenDeclaration: ABSENT_DECLARATION,
          allergenState: 'unknown_or_unverified',
          createdAt: '2026-09-19T10:00:00.000Z',
          boundary: { notVerified: 'not_rafskoru_verified', nextTask: 'rafskoru_verification', upload: 'no_upload_in_this_build' },
        },
      }),
    ),
  },
  {
    key: 'conflict',
    title: '8. Kaynak çatışması',
    view: toDevPreview(
      projectConsumerDecisionViewModel({
        ...baseInput(),
        allergenDeclaration: readableDeclaration(['milk'], []),
        productDataView: PARTIAL_DATA_VIEW,
        offProductName: 'Fixture Yulaflı Bisküvi 200 g',
        reviewedRecord: {
          id: 'dev-review-2',
          status: 'locally_reviewed_candidate',
          gtin: IDENTITY.barcode,
          draftId: 'dev-draft-2',
          checks: [
            {
              field: 'productName',
              decision: 'corrected',
              candidateEvidenceId: null,
              candidateText: 'Yulaflı Bisküvi 200 gr (ambalaj)',
              reviewedText: 'Yulaflı Bisküvi 200 gr (ambalaj)',
              photoEvidenceId: null,
              checkedAt: '2026-09-19T10:05:00.000Z',
              resultingEvidenceId: 'dev-evidence-1',
              ocrEvidence: null,
            },
          ],
          evidence: [],
          allergenDeclaration: ABSENT_DECLARATION,
          allergenState: 'unknown_or_unverified',
          createdAt: '2026-09-19T10:05:00.000Z',
          boundary: { notVerified: 'not_rafskoru_verified', nextTask: 'rafskoru_verification', upload: 'no_upload_in_this_build' },
        },
      }),
    ),
  },
];
