/**
 * RafSkoru — Haftalık sepet ekranı (Aşama 9). src/weeklyBasket/WeeklyBasketScreen.tsx
 *
 * Zorunlu, SABİT sıra: 1) Bu haftanın sepeti başlığı (+ eski hafta uyarısı/"Yeni haftaya başla")
 * 2) ürün/adet bilgisi 3) profilinizle eşleşen kritik uyarılar + sepet alerjen özeti 4) veri
 * kapsamı + boyut kartları 5–8) ürün satırları (miktar, sil, incele, alternatif). Market seçimi,
 * mesafe, "en ucuz market" veya tahmini toplam YOK (Aşama 9 kapsam dışı). Bu dosya yalnız SUNUM
 * birleştiricisidir — I/O ve kalıcılık `app/weekly-basket.tsx`'tedir.
 *
 * Okuma HATASINDA ("hasLoadError") "Sepetiniz boş" YAZILMAZ — bilinmeyen durum boş sayılmaz (D1).
 */

import { StyleSheet, Text, View } from 'react-native';

import { DEV_PREVIEW_LABEL, color, spacing, typography } from '../consumerUx/tokens';
import { BasketAllergenSummaryCard } from './BasketAllergenSummaryCard';
import { BasketCriticalAllergenCard } from './BasketCriticalAllergenCard';
import { BasketDimensionCoverageCard } from './BasketDimensionCoverageCard';
import { BasketHeader } from './BasketHeader';
import { WeeklyBasketLineRow } from './WeeklyBasketLineRow';
import type { WeeklyBasketView } from './basketViewModel';

export interface WeeklyBasketScreenProps {
  view: WeeklyBasketView;
  onIncrement: (gtin: string) => void;
  onDecrement: (gtin: string) => void;
  onRemove: (gtin: string) => void;
  onClearBasket: () => void;
  onStartNewWeek: () => void;
  onOpenProduct: (gtin: string) => void;
  onOpenAlternatives: (gtin: string) => void;
}

export function WeeklyBasketScreen({
  view,
  onIncrement,
  onDecrement,
  onRemove,
  onClearBasket,
  onStartNewWeek,
  onOpenProduct,
  onOpenAlternatives,
}: WeeklyBasketScreenProps) {
  return (
    <View style={styles.container}>
      {view.isDevPreview ? (
        <View style={styles.devBanner} accessible accessibilityLabel={DEV_PREVIEW_LABEL}>
          <Text style={styles.devBannerText}>{DEV_PREVIEW_LABEL}</Text>
        </View>
      ) : null}

      {view.persistenceError ? (
        <View style={styles.errorBanner} accessible accessibilityLiveRegion="polite" accessibilityLabel={view.persistenceError}>
          <Text style={styles.errorBannerText} allowFontScaling>
            {view.persistenceError}
          </Text>
        </View>
      ) : null}

      {/* 1 + 2. Başlık + ürün/adet bilgisi + eski hafta uyarısı */}
      <BasketHeader view={view} onClearBasket={onClearBasket} onStartNewWeek={onStartNewWeek} />

      {view.hasLoadError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText} allowFontScaling>
            Sepet açılamadı. Yukarıdaki hatayı giderip tekrar deneyin.
          </Text>
        </View>
      ) : view.isEmpty ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText} allowFontScaling>
            Sepetiniz boş. Bir ürünün sonuç ekranında "Sepete ekle" ile buraya ekleyebilirsiniz.
          </Text>
        </View>
      ) : (
        <>
          {/* 3. Profilinizle eşleşen kritik uyarılar + sepet alerjen özeti */}
          <BasketCriticalAllergenCard view={view.criticalAllergen} />
          <BasketAllergenSummaryCard view={view.allergenSummary} />

          {/* 4. Veri kapsamı ve boyut kartları */}
          {view.dimensionMethodologyNote ? (
            <Text style={styles.methodologyNote} allowFontScaling>
              {view.dimensionMethodologyNote}
            </Text>
          ) : null}
          <View style={styles.dimensionGrid} accessibilityLabel="Veri kapsamı ve boyut kartları">
            {view.dimensionCoverage.map((dimension) => (
              <BasketDimensionCoverageCard key={dimension.key} view={dimension} />
            ))}
          </View>

          {/* 5–8. Ürün satırları: miktar, sil, incele, alternatif */}
          <View style={styles.lines}>
            {view.lines.map((line) => (
              <WeeklyBasketLineRow
                key={line.gtin}
                view={line}
                onIncrement={() => onIncrement(line.gtin)}
                onDecrement={() => onDecrement(line.gtin)}
                onRemove={() => onRemove(line.gtin)}
                onOpenProduct={() => onOpenProduct(line.gtin)}
                onOpenAlternatives={() => onOpenAlternatives(line.gtin)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  devBanner: { backgroundColor: '#3D2E12', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  devBannerText: { ...typography.captionStrong, color: '#FCE7C8', textAlign: 'center' },
  errorBanner: { backgroundColor: color.allergenDeclaredSurface, borderRadius: 8, borderWidth: 1, borderColor: color.allergenDeclaredBorder, padding: spacing.sm },
  errorBannerText: { ...typography.bodyStrong, color: color.allergenDeclared },
  emptyCard: { borderRadius: 12, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, padding: spacing.md },
  emptyText: { ...typography.body, color: color.inkMuted },
  methodologyNote: { ...typography.caption, color: color.inkFaint },
  dimensionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  lines: { gap: spacing.sm },
});
