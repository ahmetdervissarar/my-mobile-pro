import { getPriceApiBaseUrl } from './config';

export type BasketItem = ProductGroupBasketItem | ProductBasketItem;

export interface BasketItemQuantity {
  amount: number;
  unit: 'piece' | 'gram' | 'kilogram' | 'milliliter' | 'liter';
}

export interface ProductGroupBasketItem {
  type: 'product_group';
  productGroupKey: string;
  label: string;
  quantity: BasketItemQuantity;
}

export interface ProductBasketItem {
  type: 'product';
  productId: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: {
    amount: number;
    unit: string;
  };
  quantity: BasketItemQuantity;
}

export interface BasketLocation {
  lat: number;
  lng: number;
}

export interface BasketEvaluateRequest {
  items: BasketItem[];
  location?: BasketLocation;
}

export interface BasketProfileSubScores {
  health: number | null;
  content: number | null;
  additives: number | null;
  sustainability: number | null;
}

export interface BasketProfileItem {
  type: BasketItem['type'];
  label: string;
  productGroupKey: string;
  quantity: BasketItemQuantity;
  score: number | null;
  subScores: BasketProfileSubScores;
  riskFlags: string[];
}

export interface BasketProfile {
  itemCount: number;
  coverage: 'full' | 'partial' | 'insufficient_data';
  basketRafSkoru: number | null;
  subScores: BasketProfileSubScores;
  perItem: BasketProfileItem[];
}

export interface BasketMarketEvaluation {
  marketId: string;
  name: string;
  distanceKm: number | null;
  availability: {
    available: number;
    total: number;
    missing: string[];
  };
  priceEstimate?: {
    amount: number;
    currency: 'TRY';
    coversItemCount: number;
  };
  basketPriceScore?: number;
  basketAvailabilityScore?: number;
  basketDistanceScore?: number;
  marketBasketRafSkoru?: number;
}

export interface BasketEvaluateResponse {
  ok: true;
  basketProfile: BasketProfile;
  marketEvaluations: {
    status: 'real' | 'demo' | 'insufficient_data';
    markets: BasketMarketEvaluation[];
    cheapestMarketId?: string | null;
    bestRafScoreMarketId?: string | null;
    insufficientDataReason?: string;
  };
}

export async function evaluateBasket(
  request: BasketEvaluateRequest,
): Promise<BasketEvaluateResponse> {
  const response = await fetch(`${getPriceApiBaseUrl()}/api/basket/evaluate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Basket evaluation failed.');
  }

  return (await response.json()) as BasketEvaluateResponse;
}
