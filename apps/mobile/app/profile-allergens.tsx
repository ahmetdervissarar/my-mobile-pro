import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AllergenKey, allergenOptions } from '../src/userProfile/userProfileTypes';
import {
  loadUserSensitivityProfile,
  saveUserSensitivityProfile,
} from '../src/userProfile/userProfileStorage';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../src/ui/theme';

export default function ProfileAllergensScreen() {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<AllergenKey[]>([]);

  useEffect(() => {
    void loadUserSensitivityProfile().then((profile) => {
      setSelected(profile.allergens);
    });
  }, []);

  const handleToggle = async (key: AllergenKey) => {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];

    setSelected(next);

    const profile = await loadUserSensitivityProfile();
    await saveUserSensitivityProfile({ ...profile, allergens: next });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Alerjen Profilim</Text>

      <View style={{ borderRadius: radii.md, backgroundColor: colors.soft, padding: spacing.md, gap: 4 }}>
        <Text style={{ fontSize: 12.5, color: colors.ink, fontWeight: '700' }}>
          Bu seçimler yalnız telefonunda saklanır.
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
          Seçimlerin backend'e, log'a veya üçüncü bir tarafa gönderilmez; yalnız cihazında kalır ve ürün
          sayfalarındaki alerji uyarılarını kişiselleştirmek için kullanılır.
        </Text>
      </View>

      <View style={{ borderRadius: radii.md, borderWidth: 1, borderColor: colors.line, padding: spacing.md }}>
        <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 17 }}>
          Tıbbi uyarı: RafSkoru tıbbi tavsiye niteliği taşımaz. Alerjiniz veya hassasiyetiniz varsa her zaman
          ürün etiketini kontrol edin ve gerektiğinde bir uzmana danışın.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>Alerjen grupları</Text>

        {allergenOptions.map((option) => {
          const isSelected = selected.includes(option.key);

          return (
            <Pressable
              key={option.key}
              onPress={() => void handleToggle(option.key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              style={{
                minHeight: MIN_TOUCH_TARGET,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: isSelected ? colors.pine2 : colors.line,
                backgroundColor: isSelected ? colors.soft : colors.surface,
                borderRadius: radii.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{option.label}</Text>

              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.pine2 : colors.line,
                  backgroundColor: isSelected ? colors.pine2 : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSelected ? <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>✓</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="Profile dön" variant="secondary" onPress={() => router.push('/profile')} />
    </ScrollView>
  );
}
