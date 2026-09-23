/**
 * RafSkoru — Alerjen Bandı
 * src/ui/AllergenBanner.tsx
 *
 * Dört ayrı veri durumunu (declared_contains / trace_may_contain /
 * not_listed_in_available_data / unknown_or_unverified) görsel ve
 * metinsel olarak ayırır. Hiçbir durum "güvenli/temiz/uygun" ifadesine
 * dönüştürülmez. Kritik profil eşleşmesi varsa en güçlü tonla öne çıkar.
 *
 * Bu bileşen skor mantığı içermez; yalnızca zaten hesaplanmış
 * riskEngine/productFacts çıktısını gösterir.
 */

import { Text, View } from 'react-native';

import { radii, spacing, useTheme } from './theme';

export type AllergenBannerStatus =
  | 'declared_contains'
  | 'trace_may_contain'
  | 'not_listed_in_available_data'
  | 'unknown_or_unverified';

/**
 * P1: AllergenBannerStatus'a ek, yalnızca SUNUM için 5 seviyeli kırılım —
 * bkz. catalogAllergenChip.ts getAllergenDisplayLevel. AllergenBannerStatus'a
 * yeni değer eklemez (o dört değerli enum kapalıdır); basis, perKey sonucunun
 * yapılandırılmış kaynağıdır (not metninden ayrıştırılmaz).
 */
export type AllergenDisplayLevel = 'declared' | 'ingredients' | 'trace' | 'no_data' | 'not_listed';

export interface AllergenBannerCriticalMatch {
  code: string;
  title: string;
  message: string;
}

export interface AllergenBannerDisplayInfo {
  level: AllergenDisplayLevel;
  text: string;
  otherLabels: string[];
  isConflict: boolean;
}

export interface AllergenBannerProps {
  status: AllergenBannerStatus;
  /** OFF/backend beyan listesinden gelen, kullanıcıya gösterilecek Türkçe alerjen adları. */
  declaredList?: string[];
  traceList?: string[];
  /** Profil ile çakışan riskEngine uyarıları (PROFILE_*_ALLERGEN_MATCH / PROFILE_ALLERGEN_INFO_MISSING). */
  criticalMatches?: AllergenBannerCriticalMatch[];
  /** Profil doluyken paylaşılan çekirdekten (getAllergenDisplayLevel) gelen, alerjen adını içeren seviye gösterimi. */
  displayInfo?: AllergenBannerDisplayInfo | null;
}

type Tone = 'danger' | 'warning' | 'caution' | 'info' | 'unknown';

function getTone(status: AllergenBannerStatus, hasCritical: boolean): Tone {
  if (hasCritical) return 'danger';
  if (status === 'declared_contains') return 'danger';
  if (status === 'trace_may_contain') return 'warning';
  if (status === 'not_listed_in_available_data') return 'info';
  return 'unknown';
}

function getToneForLevel(level: AllergenDisplayLevel, hasCritical: boolean): Tone {
  if (hasCritical) return 'danger';
  if (level === 'declared' || level === 'ingredients') return 'danger';
  if (level === 'trace') return 'warning';
  if (level === 'no_data') return 'caution';
  return 'info';
}

function getBaseTitle(status: AllergenBannerStatus): string {
  if (status === 'declared_contains') return 'Beyana göre içerir';
  if (status === 'trace_may_contain') return 'İçerebilir';
  if (status === 'not_listed_in_available_data') return 'Veri kaydında belirtilmemiş';
  return 'Alerjen verisi yok / doğrulanmamış';
}

function getBaseMessage(status: AllergenBannerStatus): string {
  if (status === 'declared_contains') return 'Ürün beyanına göre aşağıdaki alerjenleri içerir.';
  if (status === 'trace_may_contain') {
    return 'Eser miktarda içerebilir (çapraz bulaşma ihtimali beyan edilmiş). Bu bir kesinlik ifadesi değildir.';
  }
  if (status === 'not_listed_in_available_data') {
    return 'İlgili alerjen mevcut veri kaydında belirtilmemiştir; bu bir güvenlik garantisi değildir. Güncel ambalaj etiketini kontrol edin.';
  }
  return 'Alerjen verisi yok / doğrulanmamış. Etiketi kontrol edin, gerekirse uzman görüşü alın.';
}

export function AllergenBanner({
  status,
  declaredList = [],
  traceList = [],
  criticalMatches = [],
  displayInfo,
}: AllergenBannerProps) {
  const { colors } = useTheme();
  const hasCritical = criticalMatches.length > 0;
  const tone = displayInfo ? getToneForLevel(displayInfo.level, hasCritical) : getTone(status, hasCritical);

  const toneStyles: Record<Tone, { bg: string; fg: string; iconBg: string }> = {
    danger: { bg: colors.dangerBg, fg: colors.danger, iconBg: colors.danger },
    warning: { bg: colors.warnBg, fg: colors.warn, iconBg: colors.warn },
    caution: { bg: colors.cautionBg, fg: colors.caution, iconBg: colors.caution },
    info: { bg: colors.surface, fg: colors.ink, iconBg: colors.soft },
    unknown: { bg: colors.infoBg, fg: colors.info, iconBg: colors.info },
  };
  const style = toneStyles[tone];

  const title = hasCritical
    ? 'Profilinizle çakışan alerjen uyarısı'
    : displayInfo
      ? displayInfo.text
      : getBaseTitle(status);

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        borderRadius: radii.lg,
        padding: spacing.lg,
        backgroundColor: style.bg,
        borderWidth: tone === 'info' ? 1 : 0,
        borderColor: colors.line,
      }}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${displayInfo ? displayInfo.text : getBaseMessage(status)}`}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: style.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Text style={{ color: tone === 'info' ? colors.pine2 : '#fff', fontWeight: '800' }}>
          {tone === 'danger' ? '!' : tone === 'warning' ? '△' : tone === 'unknown' ? '?' : 'i'}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: style.fg }}>{title}</Text>

        {hasCritical ? (
          <View style={{ gap: 4, marginTop: 2 }}>
            {criticalMatches.map((match) => (
              <Text key={match.code} style={{ fontSize: 14, color: style.fg }}>
                • {match.message}
              </Text>
            ))}
          </View>
        ) : displayInfo ? (
          displayInfo.otherLabels.length > 0 ? (
            <Text style={{ fontSize: 13, color: tone === 'info' ? colors.muted : style.fg }}>
              Ayrıca: {displayInfo.otherLabels.join(', ')}
            </Text>
          ) : null
        ) : (
          <Text style={{ fontSize: 14, color: tone === 'info' ? colors.muted : style.fg }}>
            {getBaseMessage(status)}
          </Text>
        )}

        {!hasCritical && !displayInfo && status === 'declared_contains' && declaredList.length > 0 ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: style.fg, marginTop: 2 }}>
            {declaredList.join(', ')}
          </Text>
        ) : null}

        {!hasCritical && !displayInfo && status === 'trace_may_contain' && traceList.length > 0 ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: style.fg, marginTop: 2 }}>
            {traceList.join(', ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
