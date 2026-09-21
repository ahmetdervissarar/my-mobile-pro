import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { PrimaryButton } from '../../ui/PrimaryButton';
import { radii, spacing, useTheme } from '../../ui/theme';

export interface UnknownProductNoticeProps {
  initialQuery: string;
  isSubmittingBetaFeedback: boolean;
  onContributeProduct: () => void;
}

/** Barkod için ürün/fiyat verisi bulunamadığında gösterilen tam durum. */
export function UnknownProductNotice({
  initialQuery,
  isSubmittingBetaFeedback,
  onContributeProduct,
}: UnknownProductNoticeProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Ürün bulunamadı</Text>
      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>
        Bu barkod için ürün verisi ve fiyat bulunamadı. RafSkoru hesaplanamıyor. Aşağıdaki seçeneklerden
        biriyle devam edebilirsin.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          label="Ürün adını yazarak ara"
          variant="secondary"
          onPress={() => router.push({ pathname: '/search', params: { initialQuery } })}
        />
        <PrimaryButton
          label="Ürün fotoğrafı ile dene"
          variant="secondary"
          onPress={() => router.push('/photo-search')}
        />
        <PrimaryButton
          label="Ürünü beta verisine katkı olarak gönder"
          variant="ghost"
          disabled={isSubmittingBetaFeedback}
          onPress={onContributeProduct}
        />
      </View>
    </View>
  );
}
