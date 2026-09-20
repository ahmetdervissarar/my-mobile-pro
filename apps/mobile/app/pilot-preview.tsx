/**
 * RafSkoru — Pilot önizleme menüsü (Aşama 10). app/pilot-preview.tsx
 *
 * Yalnız `EXPO_PUBLIC_PILOT_PREVIEW=1` iken erişilebilir; bu bayrak yalnız CI'nin pilot APK
 * iş akışının job ortamında açılır, hiçbir izlenen `.env`/`app.json` dosyasında değildir.
 * Yeni bir ürün özelliği DEĞİLDİR — yalnız zaten var olan akışlara giden küçük bir menü.
 * Fixture/durum galerileri kendi ekranlarında "PİLOT ÖNİZLEME — Geliştirme verileri" şeridini
 * taşır; bu menü fixture verisi ÜRETMEZ, yalnız yönlendirir.
 */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { isPilotPreviewEnabled } from '../src/localProduct/featureFlag';

interface MenuItem {
  key: string;
  label: string;
  description: string;
  path: string;
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'scan', label: '1. Ürün tarama / arama', description: 'Normal barkod tarama akışı.', path: '/barcode-scan' },
  { key: 'decision-gallery', label: '2. Tüketici karar ekranı durum galerisi', description: 'GELİŞTİRME ÖNİZLEMESİ fixture ekranları.', path: '/dev-consumer-ux-gallery' },
  { key: 'package-capture', label: '3. Paket bilgisi ekleme akışı', description: 'Eksik ürün için fotoğraf/alan yakalama.', path: '/package-capture' },
  { key: 'ocr-review', label: '4. Cihaz içi OCR akışı', description: 'Alan alan inceleme; OCR sonuçları burada görünür.', path: '/package-review' },
  { key: 'weekly-basket', label: '5. Haftalık sepet', description: 'Bu haftanın sepeti (gerçek, cihazda kalıcı).', path: '/weekly-basket' },
  { key: 'basket-gallery', label: '6. Haftalık sepet durum galerisi', description: 'GELİŞTİRME ÖNİZLEMESİ sepet fixture ekranları (aynı galeri ekranında, #2 ile birlikte).', path: '/dev-consumer-ux-gallery' },
];

export default function PilotPreviewRoute() {
  const router = useRouter();

  if (!isPilotPreviewEnabled()) {
    return (
      <View style={styles.disabledContainer}>
        <Text style={styles.disabledText}>Bu ekran yalnız pilot önizleme derlemesinde kullanılabilir.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner} accessible accessibilityLabel="PİLOT ÖNİZLEME — Geliştirme verileri">
        <Text style={styles.bannerText}>PİLOT ÖNİZLEME — Geliştirme verileri</Text>
      </View>

      <Text style={styles.title}>Pilot Önizleme</Text>
      <Text style={styles.subtitle}>Tamamlanan akışlara hızlı erişim. Yeni bir özellik değildir.</Text>

      <View style={styles.list}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => router.push(item.path as never)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60, gap: 16 },
  banner: { backgroundColor: '#3D2E12', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  bannerText: { color: '#FCE7C8', fontWeight: '800', textAlign: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  list: { gap: 10 },
  item: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', padding: 14, gap: 4 },
  itemLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  itemDescription: { fontSize: 13, color: '#6B7280' },
  disabledContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  disabledText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
