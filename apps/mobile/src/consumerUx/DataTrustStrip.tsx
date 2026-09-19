/**
 * RafSkoru — Tüketici karar akışı V2: 4) Veri kaynağı/güncellik/eksiklik şeridi.
 * src/consumerUx/DataTrustStrip.tsx
 *
 * "Yerel inceleme adayı" durumu doğrulanmış ürün gibi SUNULMAZ (`locally_reviewed_candidate`
 * etiketi her zaman görünür). Kaynak çatışmasında OFF ve ambalaj değeri YAN YANA gösterilir;
 * otomatik kazanan YOK — kart yalnız iki değeri de gösterir, birini seçmez.
 */

import { StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from './tokens';
import type { ConsumerProductDataStatus, DataTrustView } from './types';

const STATUS_META: Record<ConsumerProductDataStatus, { icon: string; label: string; ink: string }> = {
  loading: { icon: '…', label: 'Ürün verisi alınıyor', ink: color.inkMuted },
  usable: { icon: '✔', label: 'Kayıt kullanılabilir', ink: color.trustOk },
  partial: { icon: '◐', label: 'Kayıt kısmi', ink: color.trustPartial },
  not_found: { icon: '✕', label: 'Kayıt yok', ink: color.trustMissing },
  locally_reviewed_candidate: { icon: '◔', label: 'Yerel aday kayıt — doğrulanmış ürün değil', ink: color.trustPartial },
  conflict: { icon: '≠', label: 'Kaynaklar çatışıyor', ink: color.trustConflict },
};

export function DataTrustStrip({ view }: { view: DataTrustView }) {
  const meta = STATUS_META[view.status];
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Veri durumu: ${meta.label}. Kaynak: ${view.sourceLabel}.${view.missingLabels.length ? ' Eksik: ' + view.missingLabels.join(', ') + '.' : ''}`}
    >
      <View style={styles.row}>
        <Text style={[styles.icon, { color: meta.ink }]} accessibilityElementsHidden importantForAccessibility="no">
          {meta.icon}
        </Text>
        <View style={styles.textBlock}>
          <Text style={[styles.label, { color: meta.ink }]} allowFontScaling>
            {meta.label}
          </Text>
          <Text style={styles.sourceText} allowFontScaling>
            Kaynak: {view.sourceLabel}
            {view.freshnessText ? ` · ${view.freshnessText}` : ''}
          </Text>
        </View>
      </View>

      {view.isLocallyReviewedCandidate ? (
        <Text style={styles.candidateNotice} allowFontScaling>
          Aday kayıt, doğrulanmadı. Skorlara ve alerjen kararına girmez.
        </Text>
      ) : null}

      {view.conflict ? (
        <View style={styles.conflictBlock} accessible accessibilityLabel={`${view.conflict.fieldLabel} çatışması: Open Food Facts ${view.conflict.offValue}, ambalaj ${view.conflict.packagingValue}. Otomatik kazanan yok.`}>
          <Text style={styles.conflictLabel} allowFontScaling>
            {view.conflict.fieldLabel} çatışması — otomatik kazanan yok
          </Text>
          <View style={styles.conflictRow}>
            <View style={styles.conflictColumn}>
              <Text style={styles.conflictSource} allowFontScaling>
                Open Food Facts
              </Text>
              <Text style={styles.conflictValue} allowFontScaling>
                {view.conflict.offValue}
              </Text>
            </View>
            <View style={styles.conflictColumn}>
              <Text style={styles.conflictSource} allowFontScaling>
                Ambalaj (kullanıcı)
              </Text>
              <Text style={styles.conflictValue} allowFontScaling>
                {view.conflict.packagingValue}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {view.missingLabels.length > 0 ? (
        <Text style={styles.missingText} allowFontScaling>
          Eksik: {view.missingLabels.join(' · ')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, padding: spacing.sm, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  icon: { fontSize: 18, fontWeight: '800', width: 22, textAlign: 'center' },
  textBlock: { flex: 1, gap: 2 },
  label: { ...typography.bodyStrong },
  sourceText: { ...typography.caption, color: color.inkMuted },
  candidateNotice: { ...typography.caption, color: color.trustPartial, fontWeight: '700' },
  missingText: { ...typography.caption, color: color.inkMuted },
  conflictBlock: { borderRadius: radius.sm, backgroundColor: color.surface, borderWidth: 1, borderColor: color.borderStrong, padding: spacing.xs, gap: spacing.xs },
  conflictLabel: { ...typography.captionStrong, color: color.trustConflict },
  conflictRow: { flexDirection: 'row', gap: spacing.sm },
  conflictColumn: { flex: 1, gap: 2 },
  conflictSource: { ...typography.caption, color: color.inkMuted, textTransform: 'uppercase', fontSize: 11 },
  conflictValue: { ...typography.body, color: color.ink },
});
