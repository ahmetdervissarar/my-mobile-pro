/**
 * RafSkoru — Kaydedilmemiş profil değişikliği koruması (sekme geçişleri dahil)
 * src/userProfile/unsavedProfileChangesGuard.ts
 *
 * Kök neden (cihaz testi feat/catalog-alternatives, madde 3): profil alt
 * ekranları (alerjen/kronik/sağlık tercihi) (tabs) içinde href:null
 * Tabs.Screen olarak yaşar (bkz. M2 kararı, _layout.tsx) — alt sekme
 * çubuğundan BAŞKA bir sekmeye dokunmak React Navigation'da ekranı
 * "kaldırmaz", yalnız odağı değiştirir. usePreventRemove'un dinlediği
 * 'beforeRemove' olayı bu durumda HİÇ tetiklenmez — "Kaydetmeden çıkmak
 * istiyor musunuz?" uyarısı sekme değişiminde asla görünmezdi (bildirilen
 * hata). Bu modül, o uyarıyı hem "Profile dön" düğmesinde hem sekme
 * dokunuşlarında (_layout.tsx) tetiklemek için paylaşılan, basit bir durum
 * taşır — her zaman yalnız ODAKTAKİ profil alt ekranının durumunu yansıtır
 * (bkz. useFocusEffect kullanımı çağıran ekranlarda).
 */

type ConfirmDiscardHandler = (onDiscard: () => void) => void;

let dirty = false;
let confirmDiscard: ConfirmDiscardHandler | null = null;

/** Odaktaki profil alt ekranı, kendi isDirty durumunu burada kaydeder. */
export function setUnsavedProfileChanges(isDirty: boolean, handler: ConfirmDiscardHandler): void {
  dirty = isDirty;
  confirmDiscard = isDirty ? handler : null;
}

/** Ekran odaktan çıkarken veya kaydettikten sonra temizler. */
export function clearUnsavedProfileChanges(): void {
  dirty = false;
  confirmDiscard = null;
}

export function hasUnsavedProfileChanges(): boolean {
  return dirty;
}

/**
 * dirty ise kayıtlı onay işleyicisini (bir Alert) çağırır ve true döner —
 * çağıran taraf navigasyonu BURADA durdurmalı (ör. tabPress event.preventDefault()).
 * dirty değilse hiçbir şey yapmaz ve false döner — navigasyon normal akışında devam etmeli.
 */
export function interceptIfDirty(onDiscard: () => void): boolean {
  if (dirty && confirmDiscard) {
    confirmDiscard(onDiscard);
    return true;
  }
  return false;
}
