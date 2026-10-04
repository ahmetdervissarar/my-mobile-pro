/**
 * RafSkoru — Kapalı Beta ve Gizlilik Bildirimi
 * src/ui/LegalNoticeModal.tsx
 *
 * İş 2 (feat/ui-clarity, görev onayı): bu iki paragraf önceden her ürün
 * sayfasının altında tekrarlanıyordu. Artık TEK metin kaynağı burada —
 * uygulama ilk açılışında (app/_layout.tsx) ve ürün sayfasındaki "Kapalı
 * beta ve gizlilik bilgisi" bağlantısından (FooterSection.tsx) AYNI
 * bileşen açılır. Metin değişmedi, yalnız gösterim yeri değişti.
 */
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from './PrimaryButton';
import { radii, spacing, useTheme } from './theme';

export interface LegalNoticeModalProps {
  visible: boolean;
  onClose: () => void;
  /** İlk açılışta true — "Anladım" dışında kapatma yolu sunulmaz (geri tuşu/dışına dokunma yok). */
  requireAcknowledgement?: boolean;
}

export function LegalNoticeModal({ visible, onClose, requireAcknowledgement = false }: LegalNoticeModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={requireAcknowledgement ? undefined : onClose}
    >
      {requireAcknowledgement ? (
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
      ) : (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Paneli kapat"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        />
      )}

      <View
        style={{
          backgroundColor: colors.bg,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          maxHeight: '80%',
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        }}
      >
        <View
          style={{
            padding: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>
            Kapalı beta ve gizlilik bilgisi
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 19 }}>
            Kapalı beta: fiyat ve skorlar yardımcı göstergedir; güncel market fiyatı ve ürün etiketi esas
            alınmalıdır.
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink, lineHeight: 19 }}>
            Gizlilik: profil tercihleri cihazda tutulur; konum yalnızca yakın market ve fiyat sorgusu için
            kullanılır.
          </Text>

          <PrimaryButton label="Anladım" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}
