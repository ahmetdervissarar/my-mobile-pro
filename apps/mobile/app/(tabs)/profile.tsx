import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  clearUserSensitivityProfile,
  loadUserSensitivityProfile,
} from '../../src/userProfile/userProfileStorage';
import { PrimaryButton } from '../../src/ui/PrimaryButton';
import { radii, spacing, useTheme } from '../../src/ui/theme';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState({
    allergens: 0,
    chronicSensitivities: 0,
    healthPreferences: 0,
  });

  const loadSummary = useCallback(() => {
    let isActive = true;

    void loadUserSensitivityProfile().then((profile) => {
      if (!isActive) return;

      setSummary({
        allergens: profile.allergens.length,
        chronicSensitivities: profile.chronicSensitivities.length,
        healthPreferences: profile.healthPreferences.length,
      });
    });

    return () => {
      isActive = false;
    };
  }, []);

  useFocusEffect(loadSummary);

  const handleClearProfile = () => {
    Alert.alert(
      'Profil seçimleri temizlensin mi?',
      'Alerjen, kronik hassasiyet ve sağlık tercihi seçimleriniz sıfırlanacak.',
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            void clearUserSensitivityProfile().then(() => {
              setSummary({
                allergens: 0,
                chronicSensitivities: 0,
                healthPreferences: 0,
              });
            });
          },
        },
      ],
    );
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
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>Profilim</Text>

      <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 20 }}>
        RafSkoru uyarılarını kişisel hassasiyetlerinize göre özelleştirin.
      </Text>

      <View style={{ gap: spacing.sm }}>
        <Pressable
          onPress={() => router.push('/profile-allergens')}
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>Alerjen Profilim</Text>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
            Yumurta, süt, gluten, soya, fıstık ve diğer alerjenleri seçin.
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink, marginTop: 2 }}>
            {summary.allergens} seçim
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/profile-chronic')}
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
            Kronik Rahatsızlık / Hassasiyet Profilim
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
            Kan şekeri, sodyum, kolesterol ve benzeri hassasiyetleri yönetin.
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink, marginTop: 2 }}>
            {summary.chronicSensitivities} seçim
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/profile-health-preferences')}
          style={{
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.md,
            backgroundColor: colors.surface,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>Sağlık Tercihlerim</Text>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }}>
            Daha az şeker, daha az tuz, temiz içerik ve benzeri tercihleri belirleyin.
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.ink, marginTop: 2 }}>
            {summary.healthPreferences} seçim
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Pressable
          onPress={handleClearProfile}
          style={{
            borderWidth: 1,
            borderColor: colors.danger,
            paddingVertical: spacing.md,
            borderRadius: radii.sm,
            alignItems: 'center',
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '700' }}>Seçimleri temizle</Text>
        </Pressable>

        <PrimaryButton label="Ana sayfaya dön" variant="secondary" onPress={() => router.push('/')} />
      </View>
    </ScrollView>
  );
}