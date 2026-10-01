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
import { NovaBadge } from '../../ui/NovaBadge';
import { NutriScoreBadge } from '../../ui/NutriScoreBadge';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../../ui/theme';
import { getSearchCardBadge } from './searchCardPresentation';

export interface SearchResultRowProps {
  imageUrl?: string | null;
  name: string;
  metaLine: string | null;
  allergenData: AllergenBannerData;
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
  allergenData,
  nutriScoreGrade = null,
  novaGroup = null,
  showNutriNova,
  onPress,
  trailing,
  accessibilityLabel,
}: SearchResultRowProps) {
  const { colors } = useTheme();
  const allergenLine = getAllergenStatusLine(allergenData);
  const badge = getSearchCardBadge(allergenLine);
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

        {metaLine ? (
          <Text style={{ fontSize: 12.5, color: colors.muted }} numberOfLines={1}>
            {metaLine}
          </Text>
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

          {showNutriNova ? (
            <>
              <NutriScoreBadge grade={nutriScoreGrade} compact />
              <NovaBadge group={novaGroup} compact />
            </>
          ) : null}
        </View>
      </View>

      {trailing}
    </Pressable>
  );
}
