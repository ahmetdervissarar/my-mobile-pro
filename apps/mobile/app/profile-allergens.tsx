import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { allergenOptions } from '../src/userProfile/userProfileTypes';

export default function ProfileAllergensScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Alerjen Profilim</Text>

        <Text style={styles.description}>
          Bu ekranda kullanıcının dikkat etmesi gereken alerjen grupları seçilecektir.
        </Text>

        <Text style={styles.sectionTitle}>Alerjen grupları</Text>

        {allergenOptions.map((option) => (
          <View key={option.key} style={styles.optionCard}>
            <Text style={styles.optionText}>{option.label}</Text>
          </View>
        ))}
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
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
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