/**
 * RafSkoru — Tüketici karar akışı V2 geliştirme önizlemesi rotası (Aşama 8).
 * app/dev-consumer-ux-gallery.tsx
 *
 * Yalnız `__DEV__` VE `EXPO_PUBLIC_CONSUMER_UX_V2=1` iken içerik gösterir
 * (`DevStateGallery` kendi kapısını taşır); üretim derlemesinde veya bayrak kapalıyken
 * boş/kapalı bir ekran döner, hiçbir gerçek veriye dokunmaz.
 */

import { Text, View } from 'react-native';

import { DevStateGallery, isDevStateGalleryEnabled } from '../src/consumerUx/DevStateGallery';

export default function DevConsumerUxGalleryRoute() {
  if (!isDevStateGalleryEnabled()) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Bu ekran yalnız geliştirme derlemesinde ve EXPO_PUBLIC_CONSUMER_UX_V2=1 iken kullanılabilir.</Text>
      </View>
    );
  }
  return <DevStateGallery />;
}
