/**
 * RafSkoru — Uyarı kartı renk eşlemesi (saf fonksiyon)
 * src/features/productResult/riskCardColors.ts
 *
 * WarningsSection.tsx'ten ayrı dosyada — React Native bileşen importu
 * olmadan Node altında test edilebilsin diye (bkz. primaryButtonDisabledState.ts
 * ile aynı desen).
 *
 * D5 + İş 3 (feat/ui-clarity, görev onayı): renk `level`'dan değil
 * `getWarningColorKind`'den gelir — kırmızı yalnız gerçek profil-alerjen
 * çakışmasına (profile_conflict) ayrılır. 'general' kind (iz beyanı + genel
 * beslenme uyarıları) artık `level`'dan BAĞIMSIZ her zaman turuncu
 * (warn/warnBg) — önceden 'low' yeşile, 'high' griye düşüyordu; "yeşil
 * yalnız doğrulanmış olumlu durum" ve "turuncu yalnız iz/genel uyarı"
 * kuralını ihlal ediyordu.
 */
import type { ThemeColors } from '../../ui/theme';
import { getWarningColorKind, type RiskWarning } from '../../riskEngine/riskEngine';

export function getRiskCardColors(warning: RiskWarning, colors: ThemeColors): { fg: string; bg: string } {
  const kind = getWarningColorKind(warning.code);

  if (kind === 'profile_conflict') return { fg: colors.danger, bg: colors.dangerBg };
  if (kind === 'missing_allergen_data') return { fg: colors.caution, bg: colors.cautionBg };

  return { fg: colors.warn, bg: colors.warnBg };
}
