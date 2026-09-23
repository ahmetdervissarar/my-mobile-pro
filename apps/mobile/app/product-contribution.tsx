import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { submitBetaFeedback } from '../src/api/betaFeedbackClient';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../src/ui/theme';

type SlotKey = 'front' | 'ingredients' | 'nutrition';

const SLOTS: { key: SlotKey; title: string; hint: string }[] = [
  { key: 'front', title: 'Ön yüz', hint: 'Ürünün marka ve isim görünen yüzü' },
  { key: 'ingredients', title: 'İçindekiler', hint: 'İçindekiler listesinin net okunduğu kadraj' },
  { key: 'nutrition', title: 'Besin tablosu', hint: '100 g/100 ml besin değerleri tablosu' },
];

type PhotoState = Record<SlotKey, string | null>;

function PhotoSlot({
  title,
  hint,
  uri,
  onCapturePress,
}: {
  title: string;
  hint: string;
  uri: string | null;
  onCapturePress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{title}</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>{hint}</Text>
        </View>
        {uri ? <Text style={{ fontSize: 12, fontWeight: '700', color: colors.leaf }}>Eklendi</Text> : null}
      </View>

      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: 140, borderRadius: radii.md }} resizeMode="cover" />
      ) : (
        <View
          style={{
            width: '100%',
            height: 90,
            borderRadius: radii.md,
            backgroundColor: colors.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted }}>Veri yok</Text>
        </View>
      )}

      <PrimaryButton
        label={uri ? 'Yeniden çek' : 'Fotoğraf çek'}
        variant="secondary"
        onPress={onCapturePress}
        accessibilityLabel={`${title} fotoğrafını çek`}
      />
    </View>
  );
}

export default function ProductContributionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ barcode?: string; productName?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [photos, setPhotos] = useState<PhotoState>({ front: null, ingredients: null, nutrition: null });
  const [activeSlot, setActiveSlot] = useState<SlotKey | null>(null);
  const [offConsent, setOffConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const filledCount = SLOTS.filter((slot) => photos[slot.key] !== null).length;

  const openCameraFor = (slot: SlotKey) => {
    if (!permission?.granted) {
      void requestPermission();
      return;
    }
    setActiveSlot(slot);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !activeSlot) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setPhotos((current) => ({ ...current, [activeSlot]: photo.uri }));
      }
    } finally {
      setActiveSlot(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await submitBetaFeedback({
      feedbackType: 'product_contribution',
      barcode: params.barcode,
      productName: params.productName,
    });
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (activeSlot) {
    const slot = SLOTS.find((s) => s.key === activeSlot)!;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          padding: spacing.lg,
          paddingTop: Math.max(insets.top, spacing.lg),
          gap: spacing.md,
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{slot.title} fotoğrafı</Text>
        <CameraView ref={cameraRef} style={{ flex: 1, borderRadius: radii.lg, overflow: 'hidden' }} facing="back" />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Vazgeç" variant="secondary" onPress={() => setActiveSlot(null)} />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton label="Çek" variant="citrus" onPress={() => void handleCapture()} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.xl,
        paddingTop: Math.max(insets.top, spacing.xl),
        gap: spacing.lg,
        paddingBottom: spacing.xxxl,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Kayıtlı olmayan ürünü ekle</Text>
      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>
        Bu ürün için henüz veri yok. Aşağıdaki fotoğrafları eklersen ekip ürünü daha sonra doğrulayıp
        ekleyebilir. Eksik bıraktığın bir fotoğraf "veri yok" olarak kalır; tahminle doldurulmaz.
      </Text>

      <View style={{ height: 8, borderRadius: radii.pill, backgroundColor: colors.soft, overflow: 'hidden' }}>
        <View
          style={{
            width: `${(filledCount / SLOTS.length) * 100}%`,
            height: '100%',
            backgroundColor: colors.leaf,
          }}
        />
      </View>
      <Text style={{ fontSize: 12, color: colors.muted }}>{filledCount} / {SLOTS.length} fotoğraf eklendi</Text>

      {SLOTS.map((slot) => (
        <PhotoSlot
          key={slot.key}
          title={slot.title}
          hint={slot.hint}
          uri={photos[slot.key]}
          onCapturePress={() => openCameraFor(slot.key)}
        />
      ))}

      <Pressable
        onPress={() => setOffConsent((current) => !current)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: offConsent }}
        accessibilityLabel="Open Food Facts katkısına izin ver"
        style={{
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.line,
          padding: spacing.md,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: offConsent ? colors.pine2 : colors.line,
            backgroundColor: offConsent ? colors.pine2 : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {offConsent ? <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text> : null}
        </View>
        <Text style={{ flex: 1, fontSize: 12.5, color: colors.ink, lineHeight: 18 }}>
          Bu fotoğrafları Open Food Facts'e (ODbL lisansı ile) katkı olarak da paylaşmama izin ver
          (isteğe bağlı).
        </Text>
      </Pressable>

      <View style={{ borderRadius: radii.md, backgroundColor: colors.soft, padding: spacing.md }}>
        <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>
          Not: Fotoğraf yükleme şu an yalnızca bu cihazda hazırlanır; bu görevde fotoğrafları alacak bir
          backend uç noktası eklenmedi. "Gönder" yalnızca katkı isteğini kapalı beta ekibine bildirir.
        </Text>
      </View>

      {submitted ? (
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.leaf }}>
          Katkı isteğin alındı. Teşekkürler!
        </Text>
      ) : (
        <PrimaryButton
          label="Gönder"
          disabled={filledCount === 0 || isSubmitting}
          loading={isSubmitting}
          onPress={() => void handleSubmit()}
        />
      )}

      <PrimaryButton label="Geri dön" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}
