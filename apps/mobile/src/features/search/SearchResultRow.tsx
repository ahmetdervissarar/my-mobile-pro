/**
 * RafSkoru — Arama Sonucu Kartı (en fazla 3 satır)
 * src/features/search/SearchResultRow.tsx
 *
 * Katmanlı sadeleştirme (onaylı plan): satır 1 ürün adı, satır 2
 * marka·miktar·fiyat, satır 3 tek rozet (alerjen/puan) + küçük Nutri-Score/
 * NOVA simgesi. Alt not satırları (otherLabels/allergenNote) kalktı —
 * ayrıntı artık yalnız ürün sayfasında (AllergenDetailSheet). Profil
 * çakışmasında kart kenarı kırmızı kalır.
 */
import type { ReactNode } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { getAllergenStatusLine } from '../productResult/allergenStatusLine';
import type { AllergenBannerData } from '../productResult/helpers';
import type { RafScoreResult } from '../../price/types';
import { AllergenChip } from '../../ui/AllergenChip';
import { NovaBadge } from '../../ui/NovaBadge';
import { NutriScoreBadge } from '../../ui/NutriScoreBadge';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../../ui/theme';
import { getSearchCardBadge } from './searchCardPresentation';

export interface SearchResultRowProps {
  imageUrl?: string | null;
  name: string;
  metaLine: string | null;
  /** Aynı marka+boyutta birden fazla kayıt varsa ayırt edici barkod son eki (ör. "… 2021"). Ayrı, daralmayan metin — kesilmez. */
  duplicateBarcodeSuffix?: string;
  allergenData: AllergenBannerData;
  /** Ürün sayfasıyla AYNI hesaplayıcıdan gelen liste puanı (bkz. madde 4). Yoksa "Puan: Veri yok". */
  rafScore?: RafScoreResult;
  nutriScoreGrade?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  novaGroup?: 1 | 2 | 3 | 4 | null;
  /** false ise (ör. ürün grubu önerisi) Nutri-Score/NOVA simgeleri hiç gösterilmez. */
  showNutriNova: boolean;
  onPress: () => void;
  trailing?: ReactNode;
  accessibilityLabel?: string;
}

export function SearchResultRow({
  imageUrl,
  name,
  metaLine,
  duplicateBarcodeSuffix,
  allergenData,
  rafScore,
  nutriScoreGrade = null,
  novaGroup = null,
  showNutriNova,
  onPress,
  trailing,
  accessibilityLabel,
}: SearchResultRowProps) {
  const { colors } = useTheme();
  const allergenLine = getAllergenStatusLine(allergenData);
  const badge = getSearchCardBadge(allergenLine, rafScore);
  const isConflict = allergenLine.tone === 'danger';

  const badgeToneStyle = isConflict
    ? { bg: colors.dangerBg, fg: colors.danger }
    : { bg: colors.soft, fg: colors.muted };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: MIN_TOUCH_TARGET,
        backgroundColor: colors.surface,
        borderWidth: isConflict ? 2 : 1,
        borderColor: isConflict ? colors.danger : colors.line,
        borderRadius: radii.lg,
        padding: spacing.md,
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 52, height: 52, borderRadius: radii.md, backgroundColor: colors.soft }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radii.md,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.muted, fontSize: 18 }}>▦</Text>
        </View>
      )}

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }} numberOfLines={2}>
          {name}
        </Text>

        {metaLine || duplicateBarcodeSuffix ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            {metaLine ? (
              <Text style={{ flexShrink: 1, fontSize: 12.5, color: colors.muted }} numberOfLines={1}>
                {metaLine}
              </Text>
            ) : null}
            {duplicateBarcodeSuffix ? (
              <Text style={{ flexShrink: 0, fontSize: 12.5, color: colors.muted }} numberOfLines={1}>
                {metaLine ? ` · ${duplicateBarcodeSuffix}` : duplicateBarcodeSuffix}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <View
            style={{
              alignSelf: 'flex-start',
              borderRadius: radii.sm,
              paddingVertical: 3,
              paddingHorizontal: spacing.sm,
              backgroundColor: badgeToneStyle.bg,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: badgeToneStyle.fg }} numberOfLines={1}>
              {badge.text}
            </Text>
          </View>

          {/* Cihaz testi (feat/catalog-alternatives): çakışma rozeti zaten
              yukarıda ("Profilinle çakışıyor") alerjeni gösteriyor — çakışma
              YOKSA (beyan/belirtilmemiş/veri yok) ayrı bir AllergenChip
              eklenir; hiçbir kart rozetsiz kalmaz (fail-open'a karşı). */}
          {!badge.isAllergenBadge ? (
            <AllergenChip status={allergenData.status} displayInfo={allergenData.displayInfo} />
          ) : null}

          {showNutriNova && nutriScoreGrade ? <NutriScoreBadge grade={nutriScoreGrade} compact /> : null}
          {showNutriNova && novaGroup ? <NovaBadge group={novaGroup} compact /> : null}
        </View>
      </View>

      {trailing}
    </Pressable>
  );
}
