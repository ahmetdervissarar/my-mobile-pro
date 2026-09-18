/**
 * RafSkoru — Çözümleme durumu şeridi (on durum; ikon + metin, renk tek anlam taşıyıcısı değil).
 * src/localProduct/review/ResolutionStateBanner.tsx
 */

import { StyleSheet, Text, View } from 'react-native';

import type { ResolutionUiState } from '../resolution/types';
import { RESOLUTION_UI_COPY } from '../resolution/uiState';

export function ResolutionStateBanner({ state }: { state: ResolutionUiState }) {
  const copy = RESOLUTION_UI_COPY[state];
  return (
    <View
      style={styles.banner}
      accessible
      accessibilityRole="header"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${copy.title}. ${copy.body} Sonraki adım: ${copy.nextAction}`}
    >
      <View style={styles.row}>
        <Text style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
          {copy.icon}
        </Text>
        <Text style={styles.title} allowFontScaling>
          {copy.title}
        </Text>
      </View>
      <Text style={styles.body} allowFontScaling>
        {copy.body}
      </Text>
      <Text style={styles.next} allowFontScaling>
        Sonraki adım: {copy.nextAction}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 12, padding: 12, gap: 6, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 20, width: 28, textAlign: 'center', color: '#111827' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  body: { fontSize: 14, lineHeight: 20, color: '#374151' },
  next: { fontSize: 13, lineHeight: 18, color: '#4B5563', fontWeight: '600' },
});
