/**
 * RafSkoru — PrimaryButton pasif durum testi (device test 30 Eylül, D6)
 * src/ui/primaryButtonDisabledState.smoke.ts
 *
 * Cihaz raporu: "Sepete ekle" düğmesi "henüz desteklenmiyor" durumunda
 * gerçekten pasifleşmiyordu (renk + dokunma). Kod incelemesi Pressable'ın
 * `disabled` prop'unun dokunmayı zaten doğru engellediğini gösterdi; asıl
 * eksik RENKTİ (%60 opaklık tek başına citrus/primary rengi yeterince
 * "kapalı" göstermiyordu). Bu test saf karar fonksiyonunu doğrular; gerçek
 * dokunma-engelleme RN Pressable'ın kendi garantisidir (bu ortamda render
 * testi yapılamaz).
 */
import assert from 'node:assert/strict';

import { getPrimaryButtonDisabledState } from './primaryButtonDisabledState';

// ── StickyAddBar'ın "desteklenmiyor" durumu: disabled=true, loading yok ────
assert.deepEqual(getPrimaryButtonDisabledState(true, undefined), {
  isPressDisabled: true,
  showMutedStyle: true,
});

// ── Normal aktif durum ──────────────────────────────────────────────────
assert.deepEqual(getPrimaryButtonDisabledState(false, false), {
  isPressDisabled: false,
  showMutedStyle: false,
});
assert.deepEqual(getPrimaryButtonDisabledState(undefined, undefined), {
  isPressDisabled: false,
  showMutedStyle: false,
});

// ── Yüklenirken (loading): dokunma engellenir AMA renk MUHAFAZA edilir ────
// (işlem sürüyor, "kapalı" değil — spinner zaten durumu anlatıyor).
assert.deepEqual(getPrimaryButtonDisabledState(false, true), {
  isPressDisabled: true,
  showMutedStyle: false,
});

// ── product-contribution.tsx deseni: disabled VE loading aynı anda true ───
// (gönderim sırasında) → yine "yükleniyor" sayılır, mat renge dönmez.
assert.deepEqual(getPrimaryButtonDisabledState(true, true), {
  isPressDisabled: true,
  showMutedStyle: false,
});

console.log('PRIMARY_BUTTON_DISABLED_STATE_SMOKE_OK');
