/**
 * RafSkoru — Alerjen Ayrıntı Paneli
 * src/features/productResult/AllergenDetailSheet.tsx
 *
 * Katmanlı sadeleştirme (onaylı plan, madde 2): alerjen ayrıntısı TEK yerde
 * — sayfa içinde ayrı bir katlanır "Alerjen ayrıntısı" bölümü YOK, hepsi bu
 * panelde. AllergenStatusRow'a dokununca açılır. Yeni bir karar üretmez —
 * zaten hesaplanmış perKey/declaredList/traceList verisinin sunumudur.
 */
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AllergenProfileKeyBasis } from '../../riskEngine/catalogAllergenChip';
import { radii, spacing, useTheme } from '../../ui/theme';
import { getDetailRowLabel } from './allergenDetailRow';
import type { AllergenBannerData } from './helpers';

export interface AllergenDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  data: AllergenBannerData;
  /** Ürün analiz verisinin kaynağı (ör. "Open Food Facts (ODbL)"), varsa. */
  sourceText: string | null;
  /** Son gözlem tarihi, biçimlendirilmiş (ör. "3 gün önce"), varsa. */
  observedAtLabel: string | null;
}

const BASIS_LABEL: Record<AllergenProfileKeyBasis, string> = {
  declared: 'Beyan',
  ingredients: 'İçindekilerde geçiyor',
  trace: 'İz (eser miktar)',
  no_data: 'Veri yok',
  not_listed: 'Belirtilmemiş',
};

function basisTone(basis: AllergenProfileKeyBasis, colors: ReturnType<typeof useTheme>['colors']): string {
  if (basis === 'declared' || basis === 'ingredients') return colors.danger;
  if (basis === 'trace') return colors.warn;
  if (basis === 'no_data') return colors.caution;
  return colors.muted;
}

export function AllergenDetailSheet({ visible, onClose, data, sourceText, observedAtLabel }: AllergenDetailSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Paneli kapat"
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
      />

      <View
        style={{
          backgroundColor: colors.bg,
          borderTopLeftRadius: radii.xl,
          borderTopRightRadius: radii.xl,
          maxHeight: '80%',
          paddingBottom: Math.max(insets.bottom, spacing.lg),
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>Alerjen ayrıntısı</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat">
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.pine2 }}>Kapat</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
          {data.perKey.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>PROFİLİNİZDEKİ ALERJENLER</Text>
              {data.perKey.map((keyResult) => {
                const { label, note } = getDetailRowLabel(keyResult.key, keyResult.basis);

                return (
                  <View
                    key={keyResult.key}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{label}</Text>
                      {note ? <Text style={{ fontSize: 11.5, color: colors.muted }}>{note}</Text> : null}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: basisTone(keyResult.basis, colors) }}>
                      {BASIS_LABEL[keyResult.basis]}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: spacing.xs }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>BEYAN EDİLEN ALERJENLER</Text>
              <Text style={{ fontSize: 14, color: colors.ink }}>
                {data.declaredList.length > 0 ? data.declaredList.join(', ') : 'Yok'}
              </Text>
              {data.traceList.length > 0 ? (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: spacing.xs }}>
                    ESER MİKTARDA İÇEREBİLİR
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.ink }}>{data.traceList.join(', ')}</Text>
                </>
              ) : null}
            </View>
          )}

          {sourceText || observedAtLabel ? (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, gap: 2 }}>
              {sourceText ? <Text style={{ fontSize: 12, color: colors.muted }}>{sourceText}</Text> : null}
              {observedAtLabel ? (
                <Text style={{ fontSize: 12, color: colors.muted }}>Son gözlem: {observedAtLabel}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.sm, gap: spacing.xs }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>RENKLERİN ANLAMI</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger }} />
              <Text style={{ fontSize: 12.5, color: colors.muted }}>Kırmızı: profilinizle çakışıyor</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.caution }} />
              <Text style={{ fontSize: 12.5, color: colors.muted }}>Sarı: alerjen verisi yok</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.line }} />
              <Text style={{ fontSize: 12.5, color: colors.muted }}>Nötr: beyan var veya belirtilmemiş</Text>
            </View>
          </View>

          <Text style={{ fontSize: 11.5, color: colors.muted, lineHeight: 16 }}>
            Bu bilgiler tıbbi tavsiye niteliği taşımaz. Alerjiniz veya hassasiyetiniz varsa her zaman ürün
            etiketini kontrol edin ve gerektiğinde bir uzmana danışın.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}
