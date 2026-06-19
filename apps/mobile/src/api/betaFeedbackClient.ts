import { getPriceApiBaseUrl } from './config';

export type BetaFeedbackType =
  | 'wrong_product'
  | 'wrong_price'
  | 'missing_price'
  | 'wrong_score'
  | 'unsafe_alternative'
  | 'missing_alternative'
  | 'product_contribution'
  | 'other';

export interface SubmitBetaFeedbackInput {
  feedbackType: BetaFeedbackType;
  barcode?: string;
  productName?: string;
  rafScore?: number;
  productGroupKey?: string;
  resolvedProductGroupKey?: string | null;
}

export function getBetaFeedbackLabel(type: BetaFeedbackType): string {
  if (type === 'wrong_product') return 'Ürün hatalı';
  if (type === 'wrong_price') return 'Fiyat hatalı';
  if (type === 'missing_price') return 'Fiyat eksik';
  if (type === 'wrong_score') return 'Puan hatalı';
  if (type === 'unsafe_alternative') return 'Alternatif hatalı';
  if (type === 'missing_alternative') return 'Alternatif eksik';
  if (type === 'product_contribution') return 'Ürün katkısı';
  return 'Diğer';
}

export async function submitBetaFeedback(input: SubmitBetaFeedbackInput): Promise<boolean> {
  try {
    const response = await fetch(getPriceApiBaseUrl() + '/api/beta/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackType: input.feedbackType,
        severity: 'medium',
        barcode: input.barcode,
        productName: input.productName,
        screen: 'product-result',
        rafScore: input.rafScore,
        productGroupKey: input.productGroupKey,
        resolvedProductGroupKey: input.resolvedProductGroupKey,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
