import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { getBetaFeedbackLabel, type BetaFeedbackType } from '../../api/betaFeedbackClient';
import { PrimaryButton } from '../../ui/PrimaryButton';
import { radii, spacing, useTheme } from '../../ui/theme';

const FEEDBACK_TYPES: BetaFeedbackType[] = [
  'wrong_product',
  'wrong_price',
  'wrong_score',
  'missing_alternative',
];

export interface FooterSectionProps {
  submittedFeedbackType: BetaFeedbackType | null;
  isSubmittingBetaFeedback: boolean;
  betaFeedbackError: string | null;
  onBetaFeedbackPress: (type: BetaFeedbackType) => void;
}

/** Kaynak satırı: kapalı beta + gizlilik notu, geri bildirim ve gezinme eylemleri. */
export function FooterSection({
  submittedFeedbackType,
  isSubmittingBetaFeedback,
  betaFeedbackError,
  onBetaFeedbackPress,
}: FooterSectionProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ borderRadius: radii.md, backgroundColor: colors.soft, padding: spacing.md, gap: 4 }}>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Kapalı beta: fiyat ve skorlar yardımcı göstergedir; güncel market fiyatı ve ürün etiketi esas
          alınmalıdır.
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Gizlilik: profil tercihleri cihazda tutulur; konum yalnızca yakın market ve fiyat sorgusu için
          kullanılır.
        </Text>
      </View>

      <View
        style={{
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.line,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Beta geri bildirimi</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          Bu sonuçta hatalı gördüğünüz alanı işaretleyin. Geri bildirimler kapalı beta iyileştirmesi için
          kullanılır.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {FEEDBACK_TYPES.map((feedbackType) => {
            const isSelected = submittedFeedbackType === feedbackType;
            return (
              <Pressable
                key={feedbackType}
                onPress={() => onBetaFeedbackPress(feedbackType)}
                disabled={isSubmittingBetaFeedback}
                accessibilityRole="button"
                accessibilityLabel={getBetaFeedbackLabel(feedbackType)}
                style={{
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.pine2 : colors.line,
                  backgroundColor: isSelected ? colors.soft : colors.surface,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                }}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.ink }}>
                  {isSelected ? '✓ ' : ''}
                  {getBetaFeedbackLabel(feedbackType)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {submittedFeedbackType ? (
          <Text style={{ fontSize: 12, color: colors.leaf }}>
            Geri bildiriminiz alındı: {getBetaFeedbackLabel(submittedFeedbackType)}
          </Text>
        ) : null}

        {betaFeedbackError ? <Text style={{ fontSize: 12, color: colors.danger }}>{betaFeedbackError}</Text> : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton label="Yeni barkod okut" onPress={() => router.push('/barcode-scan')} />
        <PrimaryButton label="Yeni ürün ara" variant="secondary" onPress={() => router.push('/search')} />
        <PrimaryButton label="Yeni fotoğraf çek" variant="secondary" onPress={() => router.push('/photo-search')} />
        <PrimaryButton label="Ana sayfaya dön" variant="ghost" onPress={() => router.push('/')} />
      </View>
    </View>
  );
}
