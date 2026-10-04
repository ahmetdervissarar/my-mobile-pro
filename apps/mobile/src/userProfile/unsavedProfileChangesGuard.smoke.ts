// unsavedProfileChangesGuard — saf TS, react-native importu yok.
// Çalıştırma: cd apps/backend && npx tsx ../mobile/src/userProfile/unsavedProfileChangesGuard.smoke.ts
import assert from 'node:assert/strict';

import {
  clearUnsavedProfileChanges,
  hasUnsavedProfileChanges,
  interceptIfDirty,
  setUnsavedProfileChanges,
} from './unsavedProfileChangesGuard';

// 1) Temiz durumda hiçbir şey kesilmez — onProceed hemen çağrılabilir
// (çağıran taraf navigasyonu kendisi yapar).
clearUnsavedProfileChanges();
assert.equal(hasUnsavedProfileChanges(), false);
let proceeded = false;
const intercepted1 = interceptIfDirty(() => {
  proceeded = true;
});
assert.equal(intercepted1, false, 'dirty değilken kesilmemeli');
assert.equal(proceeded, false, 'dirty değilken onDiscard ÇAĞRILMAMALI (çağıran taraf kendi yapar)');

// 2) dirty=true iken onay işleyicisi tetiklenir ve kesildiği bildirilir;
// onDiscard yalnız kullanıcı "Kaydetmeden çık" derse (burada simüle edilerek) çalışır.
let confirmHandlerCalled = false;
let discardCalled = false;
setUnsavedProfileChanges(true, (onDiscard) => {
  confirmHandlerCalled = true;
  onDiscard(); // kullanıcının "Kaydetmeden çık" dediğini simüle eder.
});
assert.equal(hasUnsavedProfileChanges(), true);
const intercepted2 = interceptIfDirty(() => {
  discardCalled = true;
});
assert.equal(intercepted2, true, 'dirty iken kesilmeli');
assert.equal(confirmHandlerCalled, true, 'kayıtlı onay işleyicisi çağrılmalı');
assert.equal(discardCalled, true, 'onDiscard, onay işleyicisi tarafından çağrıldığında çalışmalı');

// 3) clearUnsavedProfileChanges sonrası tekrar "temiz" davranır (ör. ekran
// odaktan çıktığında veya kaydettiğinde).
clearUnsavedProfileChanges();
assert.equal(hasUnsavedProfileChanges(), false);
let secondProceed = false;
const intercepted3 = interceptIfDirty(() => {
  secondProceed = true;
});
assert.equal(intercepted3, false);
assert.equal(secondProceed, false);

// 4) setUnsavedProfileChanges(false, ...) dirty=false olarak sayılır —
// handler hiç kayıtlı olmaz (isDirty false iken çağıran taraf handler
// geçse de guard yine kesmemeli).
setUnsavedProfileChanges(false, () => {
  throw new Error('isDirty false iken onay işleyicisi hiç çağrılmamalı');
});
assert.equal(hasUnsavedProfileChanges(), false);
assert.equal(interceptIfDirty(() => undefined), false);

console.log('UNSAVED_PROFILE_CHANGES_GUARD_SMOKE_OK');
