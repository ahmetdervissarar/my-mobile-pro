/**
 * RafSkoru — Ürün veri durumu kartı (üç durum + alerjen beyanı özeti + katkı taslağı).
 * src/localProduct/ProductDataStateCard.tsx
 *
 * Yalnız EXPO_PUBLIC_LOCAL_PRODUCT_RECOVERY=1 iken product-result ekranında gösterilir.
 * Renk tek anlam taşıyıcısı değildir: her durumda ikon + metin vardır. Dokunma alanları
 * en az 48 pt; her buton accessibilityRole/Label taşır; metinler dinamik yazıya izin verir.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AllergenKey } from '../userProfile/userProfileTypes';
import type { ContributionDraft, ProductDataView } from './types';
import { describeAllergenDeclaration, findProfileDeclarationMatches } from './productDataState';

export interface ProductDataStateCardProps {
  view: ProductDataView;
  draft: ContributionDraft | null;
  /** Cihazdaki profil alerjen anahtarları; yalnız ekran projeksiyonu için, hiçbir yere gönderilmez. */
  profileAllergens: readonly AllergenKey[];
  onAddPackageInfo: () => void;
  onSearchByName: () => void;
  onPhotoSearch: () => void;
}

const STATE_META: Record<ProductDataView['state'], { icon: string; title: string; a11y: string }> = {
  loading: { icon: '…', title: 'Ürün verisi alınıyor', a11y: 'Ürün verisi alınıyor' },
  usable: { icon: '✔', title: 'Ürün kaydı kullanılabilir', a11y: 'Ürün kaydı kullanılabilir' },
  partial: { icon: '◐', title: 'Ürün kaydı kısmi', a11y: 'Ürün kaydı kısmi, bazı alanlar eksik' },
  not_found: { icon: '✕', title: 'Ürün verisi bulunamadı', a11y: 'Ürün verisi bulunamadı' },
};

const ALLERGEN_ICON: Record<ReturnType<typeof describeAllergenDeclaration>['tone'], string> = {
  declared: '!',
  trace: '~',
  none_listed: '–',
  unknown: '?',
};

export function ProductDataStateCard({ view, draft, profileAllergens, onAddPackageInfo, onSearchByName, onPhotoSearch }: ProductDataStateCardProps) {
  const meta = STATE_META[view.state];
  const allergen = describeAllergenDeclaration(view.allergenDeclaration);
  const profileMatches = findProfileDeclarationMatches(view.allergenDeclaration, profileAllergens);
  const presentFields = view.fields.filter((f) => f.present);
  const missingFields = view.fields.filter((f) => !f.present);

  return (
    <View style={[styles.card, view.state === 'not_found' ? styles.cardNotFound : null]} accessible accessibilityLabel={meta.a11y}>
      <View style={styles.headerRow}>
        <Text style={styles.stateIcon} accessibilityElementsHidden importantForAccessibility="no">
          {meta.icon}
        </Text>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.meta}>Kaynak: {view.sourceLabel}</Text>
        </View>
      </View>

      <Text style={styles.body}>{view.summary}</Text>

      {view.state === 'usable' || view.state === 'partial' ? (
        <View style={styles.fieldsBlock}>
          {presentFields.length > 0 ? (
            <Text style={styles.fieldLine}>
              <Text style={styles.fieldLabel}>Mevcut: </Text>
              {presentFields.map((f) => f.label).join(' · ')}
            </Text>
          ) : null}
          {missingFields.length > 0 ? (
            <Text style={styles.fieldLine}>
              <Text style={styles.fieldLabel}>Eksik: </Text>
              {missingFields.map((f) => f.label).join(' · ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {view.state !== 'loading' ? (
        <View style={styles.allergenBlock} accessible accessibilityLabel={`${allergen.title}. ${allergen.lines.join(' ')}`}>
          <View style={styles.headerRow}>
            <Text style={styles.allergenIcon} accessibilityElementsHidden importantForAccessibility="no">
              {ALLERGEN_ICON[allergen.tone]}
            </Text>
            <Text style={styles.allergenTitle}>{allergen.title}</Text>
          </View>
          {allergen.lines.map((line) => (
            <Text key={line} style={styles.allergenLine}>
              {line}
            </Text>
          ))}
          {profileMatches.trace.length > 0 ? (
            <Text style={styles.allergenProfileLine}>
              Profilinizdeki {profileMatches.trace.map((m) => m.tag).join(', ')} için "içerebilir" beyanı var. Bu bir eşleşme uyarısıdır, kesin içerik bilgisi değildir; ambalaj etiketini kontrol edin.
            </Text>
          ) : null}
          <Text style={styles.allergenFooter}>Alerjen değerlendirmesi skordan bağımsızdır ve puanla dengelenmez.</Text>
        </View>
      ) : null}

      {draft ? (
        <View style={styles.draftBlock} accessible accessibilityLabel="Bu ürün için kaydedilmiş katkı taslağı var">
          <Text style={styles.draftTitle}>Katkı taslağı kaydedildi</Text>
          <Text style={styles.draftText}>
            Aday kayıt, doğrulanmadı. Skorlara ve alerjen kararına girmez. Gönderim bu sürümde kapalı; insan doğrulaması bekliyor.
          </Text>
          <Text style={styles.draftText}>
            Fotoğraf: {draft.photos.length} · Eksik alan: {draft.missingFields.length} · Ambalaj sürümü: {draft.packagingVersion ?? 'belirtilmedi'}
          </Text>
        </View>
      ) : null}

      {view.state === 'not_found' || view.state === 'partial' ? (
        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            accessibilityRole="button"
            accessibilityLabel={view.state === 'not_found' ? 'Paket bilgisini ekle' : 'Eksik alanları paketten ekle'}
            accessibilityHint="Ambalaj fotoğraflarıyla doğrulama için aday kayıt oluşturur"
            onPress={onAddPackageInfo}
          >
            <Text style={styles.primaryButtonText}>
              {view.state === 'not_found' ? '＋ Paket bilgisini ekle' : '＋ Eksik alanları paketten ekle'}
            </Text>
          </Pressable>
          {view.state === 'not_found' ? (
            <>
              <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Ürün adını yazarak ara" onPress={onSearchByName}>
                <Text style={styles.secondaryButtonText}>Ürün adını yazarak ara</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Ürün fotoğrafı ile dene" onPress={onPhotoSearch}>
                <Text style={styles.secondaryButtonText}>Ürün fotoğrafı ile dene</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 10,
  },
  cardNotFound: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  stateIcon: {
    fontSize: 22,
    lineHeight: 26,
    width: 28,
    textAlign: 'center',
    color: '#111827',
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  meta: {
    fontSize: 13,
    color: '#6B7280',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  fieldsBlock: {
    gap: 4,
  },
  fieldLine: {
    fontSize: 13,
    lineHeight: 19,
    color: '#374151',
  },
  fieldLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  allergenBlock: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  allergenIcon: {
    fontSize: 18,
    lineHeight: 22,
    width: 22,
    textAlign: 'center',
    fontWeight: '700',
    color: '#111827',
  },
  allergenTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  allergenLine: {
    fontSize: 13,
    lineHeight: 19,
    color: '#374151',
  },
  allergenProfileLine: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    color: '#7C2D12',
  },
  allergenFooter: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },
  draftBlock: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    gap: 4,
  },
  draftTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B4B',
  },
  draftText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#312E81',
  },
  actions: {
    gap: 8,
  },
  primaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
});
