import { Image, Text, View } from 'react-native';

import { radii, spacing, useTheme } from '../../ui/theme';

export interface ProductHeroProps {
  name: string;
  barcode: string;
  imageUrl: string | null;
  isPhotoSearch: boolean;
}

export function ProductHero({ name, barcode, imageUrl, isPhotoSearch }: ProductHeroProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.lg, alignItems: 'center' }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: 84, height: 84, borderRadius: radii.lg, backgroundColor: colors.soft }}
            resizeMode="contain"
          />
        ) : (
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: radii.lg,
              backgroundColor: colors.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, color: colors.muted }}>▦</Text>
            <Text style={{ fontSize: 10, color: colors.muted, marginTop: 2 }}>Görsel yok</Text>
          </View>
        )}

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }} numberOfLines={3}>
            {name}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>Barkod: {barcode || 'bilinmiyor'}</Text>
        </View>
      </View>

      {isPhotoSearch ? (
        <View
          style={{
            borderRadius: radii.md,
            backgroundColor: colors.warnBg,
            padding: spacing.md,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warn }}>
            Fotoğrafla arama beta aşamasındadır
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.warn, marginTop: 2 }}>
            Fotoğraf sonucu henüz kesin ürün tanıma değildir. Sağlık, alerjen ve fiyat yorumu için barkod
            okutmanız önerilir.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
