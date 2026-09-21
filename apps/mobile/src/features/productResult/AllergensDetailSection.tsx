import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { radii, spacing, useTheme } from '../../ui/theme';

export interface AllergensDetailSectionProps {
  allergens: string[];
  additives: string[];
  ingredients: string | null;
  sourceText: string | null;
}

/** "Alerjenler" — beyan edilen tüm alerjen/katkı listesi ve içindekiler metni. */
export function AllergensDetailSection({
  allergens,
  additives,
  ingredients,
  sourceText,
}: AllergensDetailSectionProps) {
  const { colors } = useTheme();
  const [isIngredientsVisible, setIsIngredientsVisible] = useState(false);

  return (
    <View
      style={{
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Alerjenler</Text>
        <Text style={{ fontSize: 14, color: colors.ink, marginTop: 2 }}>
          {allergens.length > 0 ? allergens.join(', ') : 'Bilinmiyor'}
        </Text>
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Katkı maddeleri</Text>
        <Text style={{ fontSize: 14, color: colors.ink, marginTop: 2 }}>
          {additives.length > 0 ? additives.join(', ') : 'Bilinmiyor'}
        </Text>
      </View>

      <View>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>İçindekiler</Text>
        <Pressable
          onPress={() => setIsIngredientsVisible((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={isIngredientsVisible ? 'İçindekileri gizle' : 'İçindekileri göster'}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.pine2, marginTop: 4 }}>
            {isIngredientsVisible ? 'İçindekileri gizle' : 'İçindekileri göster'}
          </Text>
        </Pressable>

        {isIngredientsVisible ? (
          <Text style={{ fontSize: 13, color: colors.ink, marginTop: 4, lineHeight: 18 }}>
            {ingredients?.trim() || 'İçindekiler bilgisi bulunamadı.'}
          </Text>
        ) : null}
      </View>

      <Text style={{ fontSize: 12, color: colors.muted }}>
        Alerjen ve katkı bilgileri ürün etiketine göre değişebilir. Son karar için ambalaj üzerindeki
        bilgileri kontrol edin.
      </Text>

      {sourceText ? <Text style={{ fontSize: 11.5, color: colors.muted }}>{sourceText}</Text> : null}
    </View>
  );
}
