import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HealthPreferenceKey,
  healthPreferenceOptions,
} from '../src/userProfile/userProfileTypes';
import {
  loadUserSensitivityProfile,
  saveUserSensitivityProfile,
} from '../src/userProfile/userProfileStorage';

export default function ProfileHealthPreferencesScreen() {
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
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(insets.top, styles.contentContainer.paddingTop) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Sağlık Tercihlerim</Text>

        <Text style={styles.description}>
          Bu ekranda kullanıcının ürün seçerken öncelik verdiği sağlık tercihleri seçilecektir.
        </Text>

        <Text style={styles.sectionTitle}>Tercih grupları</Text>

        {healthPreferenceOptions.map((option) => {
          const isSelected = selected.includes(option.key);

          return (
            <Pressable
              key={option.key}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => void handleToggle(option.key)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              {isSelected ? <Text style={styles.selectedBadge}>Seçildi</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/profile')}>
          <Text style={styles.secondaryButtonText}>Profile dön</Text>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#111827',
    backgroundColor: '#F9FAFB',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  selectedBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  actions: {
    width: '100%',
    marginTop: 20,
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