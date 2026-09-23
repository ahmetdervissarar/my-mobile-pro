import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { validateContributionDraft } from '../src/localProduct/contributionValidation';
import type { ContributionValidationIssue } from '../src/localProduct/contributionValidation';
import { scoreLocalProduct } from '../src/localProduct/localProductScoring';
import { saveLocalProduct } from '../src/localProduct/localProductStorage';
import type { UserContributedNutrition100g, UserContributedProduct } from '../src/localProduct/types';
import { loadUserSensitivityProfile } from '../src/userProfile/userProfileStorage';
import { allergenOptions, emptyUserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import type { AllergenKey, UserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../src/ui/theme';

type SlotKey = 'front' | 'ingredients' | 'nutrition';

const SLOTS: { key: SlotKey; title: string; hint: string }[] = [
  { key: 'front', title: 'Ön yüz', hint: 'Ürünün marka ve isim görünen yüzü' },
  { key: 'ingredients', title: 'İçindekiler', hint: 'İçindekiler listesinin net okunduğu kadraj' },
  { key: 'nutrition', title: 'Besin tablosu', hint: '100 g/100 ml besin değerleri tablosu' },
];

type PhotoState = Record<SlotKey, string | null>;

type NutritionFieldKey = keyof UserContributedNutrition100g;

const NUTRITION_FIELDS: { key: NutritionFieldKey; label: string; unit: string }[] = [
  { key: 'energyKcal', label: 'Enerji', unit: 'kcal/100g' },
  { key: 'fat', label: 'Yağ', unit: 'g/100g' },
  { key: 'saturatedFat', label: 'Doymuş yağ', unit: 'g/100g' },
  { key: 'carbohydrates', label: 'Karbonhidrat', unit: 'g/100g' },
  { key: 'sugars', label: 'Şeker', unit: 'g/100g' },
  { key: 'fiber', label: 'Lif', unit: 'g/100g' },
  { key: 'proteins', label: 'Protein', unit: 'g/100g' },
  { key: 'salt', label: 'Tuz', unit: 'g/100g' },
];

/** Boş metin → null; virgüllü ondalık ("12,5") da kabul edilir. */
function parseNumericField(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function textInputStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  } as const;
}

function FieldLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{children}</Text>;
}

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

  const [barcode, setBarcode] = useState(params.barcode ?? '');
  const [name, setName] = useState(params.productName ?? '');
  const [brand, setBrand] = useState('');
  const [quantityText, setQuantityText] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [nutritionText, setNutritionText] = useState<Record<NutritionFieldKey, string>>({
    energyKcal: '',
    fat: '',
    saturatedFat: '',
    carbohydrates: '',
    sugars: '',
    fiber: '',
    proteins: '',
    salt: '',
  });
  const [declaredAllergens, setDeclaredAllergens] = useState<AllergenKey[]>([]);
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(emptyUserSensitivityProfile);

  const [issues, setIssues] = useState<ContributionValidationIssue[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedScore, setSavedScore] = useState<ReturnType<typeof scoreLocalProduct> | null>(null);

  useEffect(() => {
    void loadUserSensitivityProfile()
      .then(setUserProfile)
      .catch(() => setUserProfile(emptyUserSensitivityProfile));
  }, []);

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

  const toggleAllergen = (key: AllergenKey) => {
    setDeclaredAllergens((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  };

  const buildNutrition100g = (): UserContributedNutrition100g => ({
    energyKcal: parseNumericField(nutritionText.energyKcal),
    fat: parseNumericField(nutritionText.fat),
    saturatedFat: parseNumericField(nutritionText.saturatedFat),
    carbohydrates: parseNumericField(nutritionText.carbohydrates),
    sugars: parseNumericField(nutritionText.sugars),
    fiber: parseNumericField(nutritionText.fiber),
    proteins: parseNumericField(nutritionText.proteins),
    salt: parseNumericField(nutritionText.salt),
  });

  const handleSubmit = async () => {
    const nutrition100g = buildNutrition100g();
    const draftIssues = validateContributionDraft({
      gtin: barcode,
      name,
      nutrition100g,
    });

    setIssues(draftIssues);
    if (draftIssues.length > 0) {
      return;
    }

    setIsSaving(true);

    const product: UserContributedProduct = {
      gtin: barcode.trim(),
      name: name.trim(),
      brand: brand.trim() || null,
      quantityText: quantityText.trim() || null,
      ingredientsText: ingredientsText.trim() || null,
      nutrition100g,
      declaredAllergens,
      photos,
      entryMethod: 'manual',
      dataSource: 'user_contributed',
      verified: false,
      createdAt: new Date().toISOString(),
    };

    await saveLocalProduct(product);
    setSavedScore(scoreLocalProduct(product, userProfile));
    setIsSaving(false);
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

  if (savedScore) {
    const { riskResult, allergenEvaluation } = savedScore;

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
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Katkın kaydedildi</Text>
        <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>
          Bu ürün yalnızca bu cihazda saklanıyor; sunucuya gönderilmedi. Aşağıdaki değerlendirme
          henüz doğrulanmamış kendi verine dayanıyor.
        </Text>

        <View style={{ borderRadius: radii.md, backgroundColor: colors.soft, padding: spacing.md, gap: spacing.xs }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Alerjen durumu</Text>
          <Text style={{ fontSize: 12.5, color: colors.muted, lineHeight: 18 }}>
            {allergenEvaluation.note ?? 'Kendi beyanına dayanır — doğrulanmamış veri, hiçbir alerjen "yok" sayılmaz.'}
          </Text>
        </View>

        {riskResult.warnings.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>Dikkat edilmesi gerekenler</Text>
            {riskResult.warnings.map((warning) => (
              <View
                key={warning.code}
                style={{ borderRadius: radii.md, backgroundColor: colors.soft, padding: spacing.md, gap: 4 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{warning.title}</Text>
                <Text style={{ fontSize: 12.5, color: colors.muted, lineHeight: 18 }}>{warning.message}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <PrimaryButton label="Tamam" onPress={() => router.back()} />
      </ScrollView>
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
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Kayıtlı olmayan ürünü ekle</Text>
      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>
        Bu ürün için henüz veri yok. Barkod ve ürün adı zorunlu; diğer alanlar isteğe bağlıdır.
        Fotoğraflar yalnızca bu cihazda saklanır, hiçbir yere gönderilmez.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Barkod *</FieldLabel>
        <TextInput
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Barkod numarası"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          accessibilityLabel="Barkod"
          style={textInputStyle(colors)}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Ürün adı *</FieldLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ürün adı"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Ürün adı"
          style={textInputStyle(colors)}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Marka</FieldLabel>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder="Marka (isteğe bağlı)"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Marka"
          style={textInputStyle(colors)}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Net miktar</FieldLabel>
        <TextInput
          value={quantityText}
          onChangeText={setQuantityText}
          placeholder="ör. 500 g (isteğe bağlı)"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Net miktar"
          style={textInputStyle(colors)}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>İçindekiler</FieldLabel>
        <TextInput
          value={ingredientsText}
          onChangeText={setIngredientsText}
          placeholder="İçindekiler listesi (isteğe bağlı)"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
          accessibilityLabel="İçindekiler"
          style={[textInputStyle(colors), { minHeight: 80, paddingTop: spacing.sm, textAlignVertical: 'top' }]}
        />
      </View>

      <View style={{ gap: spacing.md }}>
        <FieldLabel>Besin değerleri (100 g/100 ml başına, isteğe bağlı)</FieldLabel>
        {NUTRITION_FIELDS.map((field) => (
          <View key={field.key} style={{ gap: 4 }}>
            <Text style={{ fontSize: 12, color: colors.muted }}>{`${field.label} (${field.unit})`}</Text>
            <TextInput
              value={nutritionText[field.key]}
              onChangeText={(text) => setNutritionText((current) => ({ ...current, [field.key]: text }))}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              accessibilityLabel={field.label}
              style={textInputStyle(colors)}
            />
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Alerjenler</FieldLabel>
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
          Yalnızca ambalajda gördüğün ve emin olduğun alerjenleri işaretle. Hiçbir alerjen
          otomatik olarak işaretlenmez veya "yok" sayılmaz.
        </Text>
        {allergenOptions.map((option) => {
          const isSelected = declaredAllergens.includes(option.key);
          return (
            <Pressable
              key={option.key}
              onPress={() => toggleAllergen(option.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: isSelected ? colors.pine2 : colors.line,
                backgroundColor: isSelected ? colors.soft : colors.surface,
                paddingHorizontal: spacing.md,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.pine2 : colors.line,
                  backgroundColor: isSelected ? colors.pine2 : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected ? <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>✓</Text> : null}
              </View>
              <Text style={{ fontSize: 13.5, color: colors.ink }}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.md }}>
        <FieldLabel>Fotoğraflar (isteğe bağlı)</FieldLabel>
        {SLOTS.map((slot) => (
          <PhotoSlot
            key={slot.key}
            title={slot.title}
            hint={slot.hint}
            uri={photos[slot.key]}
            onCapturePress={() => openCameraFor(slot.key)}
          />
        ))}
      </View>

      {issues.length > 0 ? (
        <View style={{ borderRadius: radii.md, backgroundColor: colors.dangerBg, padding: spacing.md, gap: 4 }}>
          {issues.map((issue, index) => (
            <Text key={`${issue.code}-${index}`} style={{ fontSize: 12.5, color: colors.danger }}>
              {issue.message}
            </Text>
          ))}
        </View>
      ) : null}

      <PrimaryButton
        label="Kaydet"
        loading={isSaving}
        onPress={() => void handleSubmit()}
        accessibilityLabel="Katkıyı kaydet"
      />

      <PrimaryButton label="Geri dön" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}
