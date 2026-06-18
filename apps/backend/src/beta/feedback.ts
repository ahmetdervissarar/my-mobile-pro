import { createHash } from 'node:crypto';

export const betaFeedbackTypes = [
  'wrong_product',
  'wrong_price',
  'missing_price',
  'wrong_score',
  'unsafe_alternative',
  'missing_alternative',
  'other',
] as const;

export type BetaFeedbackType = (typeof betaFeedbackTypes)[number];

export type BetaFeedbackSeverity = 'low' | 'medium' | 'high';

export interface BetaFeedbackPayload {
  feedbackType?: unknown;
  severity?: unknown;
  message?: unknown;
  barcode?: unknown;
  productName?: unknown;
  screen?: unknown;
  rafScore?: unknown;
  productGroupKey?: unknown;
  resolvedProductGroupKey?: unknown;
}

export interface BetaFeedbackEvent {
  eventType: 'beta_feedback';
  timestamp: string;
  feedbackType: BetaFeedbackType;
  severity: BetaFeedbackSeverity;
  messageLength: number;
  context: {
    screen?: string;
    hasBarcode: boolean;
    barcodeHash?: string;
    barcodeLength?: number;
    hasProductName: boolean;
    productNameLength?: number;
    rafScore?: number;
    productGroupKey?: string;
    resolvedProductGroupKey?: string;
  };
}

export interface BetaFeedbackValidationResult {
  ok: true;
  event: BetaFeedbackEvent;
}

export interface BetaFeedbackValidationError {
  ok: false;
  errorCode: 'invalid_feedback_type' | 'invalid_severity' | 'message_too_long' | 'invalid_payload';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBetaFeedbackType(value: unknown): value is BetaFeedbackType {
  return typeof value === 'string' && betaFeedbackTypes.includes(value as BetaFeedbackType);
}

function isBetaFeedbackSeverity(value: unknown): value is BetaFeedbackSeverity {
  return value === 'low' || value === 'medium' || value === 'high';
}

function cleanOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, maxLength);
}

function hashValue(value: string): string {
  return createHash('sha256').update(value.trim()).digest('hex');
}

function cleanRafScore(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function buildBetaFeedbackEvent(
  payload: unknown,
): BetaFeedbackValidationResult | BetaFeedbackValidationError {
  if (!isRecord(payload)) {
    return { ok: false, errorCode: 'invalid_payload' };
  }

  if (!isBetaFeedbackType(payload.feedbackType)) {
    return { ok: false, errorCode: 'invalid_feedback_type' };
  }

  const severity = payload.severity ?? 'medium';

  if (!isBetaFeedbackSeverity(severity)) {
    return { ok: false, errorCode: 'invalid_severity' };
  }

  const rawMessage = typeof payload.message === 'string' ? payload.message.trim() : '';

  if (rawMessage.length > 1000) {
    return { ok: false, errorCode: 'message_too_long' };
  }

  const barcode = cleanOptionalText(payload.barcode, 64);
  const productName = cleanOptionalText(payload.productName, 160);
  const screen = cleanOptionalText(payload.screen, 80);
  const productGroupKey = cleanOptionalText(payload.productGroupKey, 80);
  const resolvedProductGroupKey = cleanOptionalText(payload.resolvedProductGroupKey, 80);

  return {
    ok: true,
    event: {
      eventType: 'beta_feedback',
      timestamp: new Date().toISOString(),
      feedbackType: payload.feedbackType,
      severity,
      messageLength: rawMessage.length,
      context: {
        screen,
        hasBarcode: Boolean(barcode),
        barcodeHash: barcode ? hashValue(barcode) : undefined,
        barcodeLength: barcode ? barcode.length : undefined,
        hasProductName: Boolean(productName),
        productNameLength: productName ? productName.length : undefined,
        rafScore: cleanRafScore(payload.rafScore),
        productGroupKey,
        resolvedProductGroupKey,
      },
    },
  };
}

export function logBetaFeedbackEvent(event: BetaFeedbackEvent): void {
  if (process.env.ENABLE_BETA_FEEDBACK_LOGS !== '1') {
    return;
  }

  console.info('[beta-feedback]', JSON.stringify(event));
}
