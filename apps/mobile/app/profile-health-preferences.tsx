import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HealthPreferenceKey,
  healthPreferenceOptions,
} from '../src/userProfile/userProfileTypes';
import {
  loadUserSensitivityProfile,
  saveUserSensitivityProfile,
} from '../src/userProfile/userProfileStorage';
import { PrimaryButton } from '../src/ui/PrimaryButton';
import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../src/ui/theme';

export default function ProfileHealthPreferencesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<HealthPreferenceKey[]>([]);

  useEffect(() => {
    void loadUserSensitivityProfile().then((profile) => {
      setSelected(profile.healthPreferences);
    });
  }, []);

  const handleToggle = async (key: HealthPreferenceKey) => {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];

    setSelected(next);

    const profile = await loadUserSensitivityProfile();
    await saveUserSensitivityProfile({ ...profile, healthPreferences: next });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        padding: spacing.xl,
        paddingTop: Math.max(insets.top, spacing.xl),
        gap: spacing.lg,
        paddingBottom: spacing.xxxl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Sağlık Tercihlerim</Text>

      <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
        Bu ekranda kullanıcının ürün seçerken öncelik verdiği sağlık tercihleri seçilecektir.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>Tercih grupları</Text>

        {healthPreferenceOptions.map((option) => {
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
              {isSelected ? (
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.pine2 }}>Seçildi</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="Profile dön" variant="secondary" onPress={() => router.push('/profile')} />
    </ScrollView>
  );
}