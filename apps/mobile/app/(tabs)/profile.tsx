import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  clearUserSensitivityProfile,
  loadUserSensitivityProfile,
} from '../../src/userProfile/userProfileStorage';

export default function ProfileScreen() {
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
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Profilim</Text>

        <Text style={styles.description}>
          RafSkoru uyarılarını kişisel hassasiyetlerinize göre özelleştirin.
        </Text>

        <Pressable
          style={styles.menuCard}
          onPress={() => router.push('/profile-allergens')}
        >
          <Text style={styles.menuTitle}>Alerjen Profilim</Text>
          <Text style={styles.menuDescription}>
            Yumurta, süt, gluten, soya, fıstık ve diğer alerjenleri seçin.
          </Text>
          <Text style={styles.menuSummary}>{summary.allergens} seçim</Text>
        </Pressable>

        <Pressable
          style={styles.menuCard}
          onPress={() => router.push('/profile-chronic')}
        >
          <Text style={styles.menuTitle}>Kronik Rahatsızlık / Hassasiyet Profilim</Text>
          <Text style={styles.menuDescription}>
            Kan şekeri, sodyum, kolesterol ve benzeri hassasiyetleri yönetin.
          </Text>
          <Text style={styles.menuSummary}>
            {summary.chronicSensitivities} seçim
          </Text>
        </Pressable>

        <Pressable
          style={styles.menuCard}
          onPress={() => router.push('/profile-health-preferences')}
        >
          <Text style={styles.menuTitle}>Sağlık Tercihlerim</Text>
          <Text style={styles.menuDescription}>
            Daha az şeker, daha az tuz, temiz içerik ve benzeri tercihleri belirleyin.
          </Text>
          <Text style={styles.menuSummary}>
            {summary.healthPreferences} seçim
          </Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.dangerButton} onPress={handleClearProfile}>
          <Text style={styles.dangerButtonText}>Seçimleri temizle</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/')}>
          <Text style={styles.secondaryButtonText}>Ana sayfaya dön</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    gap: 6,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  menuDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  menuSummary: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  actions: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  dangerButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
});