/**
 * RafSkoru — Tüketici karar akışı V2 (Aşama 8). src/consumerUx/ConsumerDecisionScreen.tsx
 *
 * Zorunlu, SABİT ekran hiyerarşisini uygular:
 *   1) Ürün kimliği  2) Alerjen kapısı  3) Kısa karar özeti  4) Veri kaynağı/güncellik/eksiklik
 *   5) Ayrı skor boyutları  6) Eksik veri tamamlama çağrısı  7) Aynı gruptan seçenekler
 *   8) Sepete ekleme alanı
 * Alerjen kapısı hiçbir skorun altında/açılır bölümde DEĞİLDİR — 2. sırada, her zaman açık.
 * Bu dosya yalnız SUNUM birleştiricisidir; risk/skor/alterntif HESAPLAMASI yapmaz — tamamı
 * `product-result.tsx`'te zaten hesaplanmış `ConsumerDecisionView` (view-model çıktısı) alır.
 */

import { StyleSheet, Text, View } from 'react-native';

import { AllergenGateCard } from './AllergenGateCard';
import { AlternativePreviewCard } from './AlternativePreviewCard';
import { BasketActionBar } from './BasketActionBar';
import { DataTrustStrip } from './DataTrustStrip';
import { DecisionHero } from './DecisionHero';
import { DecisionSummaryCard } from './DecisionSummaryCard';
import { MissingDataActionCard } from './MissingDataActionCard';
import { ScoreDimensionCard } from './ScoreDimensionCard';
import { DEV_PREVIEW_LABEL, color, spacing, typography } from './tokens';
import type { ConsumerDecisionView } from './types';

export interface ConsumerDecisionScreenProps {
  view: ConsumerDecisionView;
  onAddPackageInfo: () => void;
  onSearchByName: () => void;
  onPhotoSearch: () => void;
  onOpenBasket: () => void;
}

export function ConsumerDecisionScreen({ view, onAddPackageInfo, onSearchByName, onPhotoSearch, onOpenBasket }: ConsumerDecisionScreenProps) {
  return (
    <View style={styles.container}>
      {view.isDevPreview ? (
        <View style={styles.devBanner} accessible accessibilityLabel={DEV_PREVIEW_LABEL}>
          <Text style={styles.devBannerText}>{DEV_PREVIEW_LABEL}</Text>
        </View>
      ) : null}

      {/* 1. Ürün kimliği */}
      <DecisionHero identity={view.identity} />

      {/* 2. Alerjen kapısı — her zaman açık, hiçbir skorun altında değil */}
      <AllergenGateCard view={view.allergenGate} />

      {/* 3. Kısa karar özeti */}
      <DecisionSummaryCard view={view.decisionSummary} />

      {/* 4. Veri kaynağı / güncellik / eksiklik şeridi */}
      <DataTrustStrip view={view.dataTrust} />

      {/* 5. Ayrı skor/değerlendirme boyutları */}
      <View style={styles.scoreGrid} accessibilityLabel="Skor boyutları">
        {view.scoreDimensions.map((dimension) => (
          <ScoreDimensionCard key={dimension.key} view={dimension} />
        ))}
      </View>
      <Text style={styles.disclaimer} allowFontScaling>
        RafSkoru bir karar destek aracıdır; tıbbi, beslenme veya satın alma tavsiyesi değildir.
      </Text>

      {/* 6. Eksik veri tamamlama çağrısı */}
      <MissingDataActionCard view={view.missingDataAction} onAddPackageInfo={onAddPackageInfo} onSearchByName={onSearchByName} onPhotoSearch={onPhotoSearch} />

      {/* 7. Aynı gruptan seçenekler */}
      <AlternativePreviewCard view={view.alternatives} />

      {/* 8. Sepete ekleme alanı (mevcut sepet akışını değiştirmez) */}
      <BasketActionBar view={view.basket} onPress={onOpenBasket} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  devBanner: { backgroundColor: '#3D2E12', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  devBannerText: { ...typography.captionStrong, color: '#FCE7C8', textAlign: 'center' },
  scoreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  disclaimer: { ...typography.caption, color: color.inkFaint },
});
