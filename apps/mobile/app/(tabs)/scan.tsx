import { View } from 'react-native';

/**
 * Bu ekran hiç render edilmez: alt menüdeki "Okut" sekmesi
 * _layout.tsx içinde tabPress ile yakalanıp /barcode-scan'e yönlendirilir.
 * Dosya yalnızca sekmenin var olabilmesi için gereklidir.
 */
export default function ScanTabPlaceholder() {
  return <View />;
}
