import assert from 'node:assert/strict';

import { buildBetaFeedbackEvent } from './feedback.js';

const valid = buildBetaFeedbackEvent({
  feedbackType: 'wrong_price',
  severity: 'high',
  message: 'Wrong price',
  barcode: '8690000000000',
  productName: 'Milk 1 L',
  screen: 'product-result',
  rafScore: 87.4,
  productGroupKey: 'milk_1l',
  resolvedProductGroupKey: 'milk',
});

assert.equal(valid.ok, true);

if (valid.ok) {
  assert.equal(valid.event.eventType, 'beta_feedback');
  assert.equal(valid.event.feedbackType, 'wrong_price');
  assert.equal(valid.event.severity, 'high');
  assert.equal(valid.event.messageLength, 11);
  assert.equal(valid.event.context.hasBarcode, true);
  assert.equal(valid.event.context.barcodeLength, 13);
  assert.equal(valid.event.context.barcodeHash?.length, 64);
  assert.notEqual(valid.event.context.barcodeHash, '8690000000000');
  assert.equal(valid.event.context.hasProductName, true);
  assert.equal(valid.event.context.productNameLength, 8);
  assert.equal(valid.event.context.rafScore, 87);
  assert.equal(valid.event.context.resolvedProductGroupKey, 'milk');
}

const defaultSeverity = buildBetaFeedbackEvent({
  feedbackType: 'other',
  message: '',
});

assert.equal(defaultSeverity.ok, true);

if (defaultSeverity.ok) {
  assert.equal(defaultSeverity.event.severity, 'medium');
  assert.equal(defaultSeverity.event.messageLength, 0);
}


const productContribution = buildBetaFeedbackEvent({
  feedbackType: 'product_contribution',
  severity: 'medium',
  barcode: '8690000000001',
  productName: 'Bulunamayan beta ürünü',
  screen: 'product-result',
});

assert.equal(productContribution.ok, true);

if (productContribution.ok) {
  assert.equal(productContribution.event.feedbackType, 'product_contribution');
  assert.equal(productContribution.event.context.hasBarcode, true);
  assert.equal(productContribution.event.context.hasProductName, true);
}
const invalidType = buildBetaFeedbackEvent({
  feedbackType: 'bad_type',
});

assert.deepEqual(invalidType, { ok: false, errorCode: 'invalid_feedback_type' });

const invalidSeverity = buildBetaFeedbackEvent({
  feedbackType: 'wrong_score',
  severity: 'urgent',
});

assert.deepEqual(invalidSeverity, { ok: false, errorCode: 'invalid_severity' });

const tooLong = buildBetaFeedbackEvent({
  feedbackType: 'other',
  message: 'x'.repeat(1001),
});

assert.deepEqual(tooLong, { ok: false, errorCode: 'message_too_long' });

console.log('BETA_FEEDBACK_SMOKE_OK');
