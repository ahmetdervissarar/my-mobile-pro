/**
 * RafSkoru — Tüketici karar akışı V2 geliştirme önizlemesi rotası (Aşama 8; Aşama 10'da pilot
 * koşulu eklendi). app/dev-consumer-ux-gallery.tsx
 *
 * Yalnız (`__DEV__` VEYA `EXPO_PUBLIC_PILOT_PREVIEW=1`) VE `EXPO_PUBLIC_CONSUMER_UX_V2=1` iken
 * içerik gösterir (`DevStateGallery` kendi kapısını taşır); üretim derlemesinde veya bayrak
 * kapalıyken boş/kapalı bir ekran döner, hiçbir gerçek veriye dokunmaz. Pilot bayrağı açıkken
 * fixture ekranlarının üstünde kalıcı "PİLOT ÖNİZLEME — Geliştirme verileri" şeridi gösterilir.
 */

import { Text, View } from 'react-native';

import { isPilotPreviewEnabled } from '../src/localProduct/featureFlag';
import { DevStateGallery, isDevStateGalleryEnabled } from '../src/consumerUx/DevStateGallery';

export default function DevConsumerUxGalleryRoute() {
  if (!isDevStateGalleryEnabled()) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Bu ekran yalnız geliştirme derlemesinde/pilot önizlemede ve EXPO_PUBLIC_CONSUMER_UX_V2=1 iken kullanılabilir.</Text>
      </View>
    );
  }

  if (isPilotPreviewEnabled()) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ backgroundColor: '#3D2E12', paddingVertical: 10, paddingHorizontal: 14 }}>
          <Text style={{ color: '#FCE7C8', fontWeight: '800', textAlign: 'center' }}>
            PİLOT ÖNİZLEME — Geliştirme verileri
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <DevStateGallery />
        </View>
      </View>
    );
  }

  return <DevStateGallery />;
}
