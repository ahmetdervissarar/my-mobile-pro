/**
 * RafSkoru — Tüketici karar akışı V2: 2) Alerjen kapısı. src/consumerUx/AllergenGateCard.tsx
 *
 * HİÇBİR skorun altında veya açılır/kapanır bölüm içinde gösterilmez — bu bileşen her zaman
 * açık, katlanmaz, hero'dan hemen sonra render edilir (ConsumerDecisionScreen sırası). Renk
 * tek başına anlam taşımaz: her satırda ikon + başlık + metin birlikte. Dört durum asla
 * birleştirilmez; hiçbiri olumlu bir uygunluk/güvenlik iddiasına dönüştürülmez (P5, D1).
 */

import { StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from './tokens';
import type { AllergenGateTone, AllergenGateView } from './types';

const TONE_META: Record<AllergenGateTone, { icon: string; label: string; text: string; surface: string; border: string; ink: string }> = {
  declared: { icon: '!', label: 'Beyan edilen alerjen', text: color.allergenDeclared, surface: color.allergenDeclaredSurface, border: color.allergenDeclaredBorder, ink: color.allergenDeclared },
  trace: { icon: '~', label: 'İz / çapraz bulaşma beyanı', text: color.allergenTrace, surface: color.allergenTraceSurface, border: color.allergenTraceBorder, ink: color.allergenTrace },
  not_listed: { icon: '–', label: 'Kayıtta belirtilmemiş', text: color.allergenNotListed, surface: color.allergenNotListedSurface, border: color.allergenNotListedBorder, ink: color.allergenNotListed },
  unknown: { icon: '?', label: 'Veri yok / doğrulanmamış', text: color.allergenUnknown, surface: color.allergenUnknownSurface, border: color.allergenUnknownBorder, ink: color.allergenUnknown },
};

export function AllergenGateCard({ view }: { view: AllergenGateView }) {
  const meta = TONE_META[view.tone];
  return (
    <View
      style={[styles.card, { backgroundColor: meta.surface, borderColor: meta.border }]}
      accessible
      accessibilityLabel={`Alerjen kapısı. ${view.a11ySummary}`}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.icon, { color: meta.ink }]} accessibilityElementsHidden importantForAccessibility="no">
          {meta.icon}
        </Text>
        <Text style={[styles.headerTitle, { color: meta.ink }]} allowFontScaling accessibilityRole="header">
          Alerjen kapısı
        </Text>
      </View>

      {view.criticalNotices.length > 0 ? (
        <View style={styles.criticalBlock}>
          {view.criticalNotices.map((notice) => (
            <View key={notice.code} style={styles.criticalItem}>
              <Text style={styles.criticalTitle} allowFontScaling>
                {notice.title}
              </Text>
              <Text style={styles.criticalMessage} allowFontScaling>
                {notice.message}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {view.lines.map((line) => (
        <Text key={line.text} style={[styles.lineText, { color: meta.ink }]} allowFontScaling>
          {line.text}
        </Text>
      ))}

      <Text style={styles.footer} allowFontScaling>
        Alerjen değerlendirmesi skordan bağımsızdır ve puanla dengelenmez.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  icon: { fontSize: 20, fontWeight: '800', width: 24, textAlign: 'center' },
  headerTitle: { ...typography.subtitle },
  criticalBlock: { gap: spacing.xxs, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.55)', padding: spacing.xs },
  criticalItem: { gap: 2 },
  criticalTitle: { ...typography.bodyStrong, color: color.allergenDeclared },
  criticalMessage: { ...typography.caption, color: color.ink },
  lineText: { ...typography.body },
  footer: { ...typography.caption, color: color.inkMuted, marginTop: spacing.xxs },
});
