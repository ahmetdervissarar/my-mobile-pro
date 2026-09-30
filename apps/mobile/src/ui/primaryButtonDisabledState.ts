/**
 * RafSkoru — PrimaryButton pasif durum kararı (saf mantık, RN bağımlılığı yok)
 * src/ui/primaryButtonDisabledState.ts
 *
 * D6 (device test 30 Eylül): "pasif" hâl (disabled, YÜKLENİYOR değilken)
 * artık yalnız opaklıkla değil, renkle de belli olsun — bir citrus/primary
 * düğme %60 opaklıkta bile "aktif" görünebiliyordu. Yüklenirken (loading)
 * orijinal varyant rengi KORUNUR — o an "kapalı" değil "işlem sürüyor".
 * PrimaryButton.tsx'in kendisi react-native içe aktardığından (plain
 * Node/tsx altında çalışmaz), bu karar mantığı ayrı, RN'siz bir dosyada
 * tutulur — böylece testlerde gerçek RN render zinciri gerekmez.
 */
export function getPrimaryButtonDisabledState(
  disabled: boolean | undefined,
  loading: boolean | undefined,
): { isPressDisabled: boolean; showMutedStyle: boolean } {
  return {
    isPressDisabled: Boolean(disabled || loading),
    showMutedStyle: Boolean(disabled) && !loading,
  };
}
