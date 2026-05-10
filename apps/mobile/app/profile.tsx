import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Profilim</Text>
        <Text style={styles.description}>
          {'RafSkoru uyar\u0131lar\u0131n\u0131 ki\u015fisel hassasiyetlerinize g\u00f6re \u00f6zelle\u015ftirin.'}
        </Text>

        <Pressable style={styles.menuCard}>
          <Text style={styles.menuTitle}>Alerjen Profilim</Text>
          <Text style={styles.menuDescription}>
            {'Yumurta, s\u00fct, gluten, soya, f\u0131st\u0131k ve di\u011fer alerjenleri se\u00e7in.'}
          </Text>
        </Pressable>

        <Pressable style={styles.menuCard}>
          <Text style={styles.menuTitle}>{'Kronik Rahats\u0131zl\u0131k / Hassasiyet Profilim'}</Text>
          <Text style={styles.menuDescription}>
            {'Kan \u015fekeri, sodyum, kolesterol ve benzeri hassasiyetleri y\u00f6netin.'}
          </Text>
        </Pressable>

        <Pressable style={styles.menuCard}>
          <Text style={styles.menuTitle}>{'Sa\u011fl\u0131k Tercihlerim'}</Text>
          <Text style={styles.menuDescription}>
            {'Daha az \u015feker, daha az tuz, temiz i\u00e7erik ve benzeri tercihleri belirleyin.'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
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
  actions: {
    width: '100%',
    marginTop: 20,
    gap: 12,
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
