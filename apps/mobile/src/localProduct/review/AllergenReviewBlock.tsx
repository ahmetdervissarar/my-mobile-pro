/**
 * RafSkoru — İnceleme ekranının üst alerjen bloğu (bilgi hiyerarşisi 1: alerjen kapısı).
 * src/localProduct/review/AllergenReviewBlock.tsx
 *
 * İki durum AYRI gösterilir ve biri diğerini yok saymaz:
 * 1) Mevcut kaynak beyanı (OFF/doğrulanmış kayıt): var / yok.
 * 2) Ambalaj adayı: doğrulanmamış / okunamıyor / veri yok.
 * Kullanıcı girişi hiçbir zaman okunabilir beyan olmaz; ikisi otomatik kıyaslanmaz → "İnsan
 * karşılaştırması gerekli". Olumlu güvenlik iddiası yoktur.
 */

import { StyleSheet, Text, View } from 'react-native';

import type { HumanFieldDecision } from '../resolution/types';
import type { AllergenKey } from '../../userProfile/userProfileTypes';

export interface AllergenReviewBlockProps {
  candidateText: string | null;
  hasAllergenPhoto: boolean;
  /** Kullanıcının bu alan için verdiği karar (henüz yoksa null). */
  candidateDecision?: HumanFieldDecision | null;
  /** Kayıtlı (okunabilir kaynak) beyanın kullanıcı metni; yoksa null. Kullanıcı girişi bunu değiştirmez. */
  existingDeclarationText?: string | null;
  existingSourceLabel?: string | null;
  /** Cihazdaki profil anahtarları; yalnız "profilinizde tanımlı" hatırlatması için, hiçbir yere gönderilmez. */
  profileAllergens: readonly AllergenKey[];
}

function candidateStatus(candidateText: string | null, decision: HumanFieldDecision | null): { icon: string; text: string } {
  if (decision === 'unreadable') return { icon: '?', text: 'okunamıyor → veri yok / doğrulanmamış' };
  if (!candidateText) return { icon: '–', text: 'veri yok / doğrulanmamış' };
  return { icon: '✎', text: 'doğrulanmamış aday (bu ekranda onaylansa da alerjen kararına girmez)' };
}

export function AllergenReviewBlock({
  candidateText,
  hasAllergenPhoto,
  candidateDecision = null,
  existingDeclarationText = null,
  existingSourceLabel = null,
  profileAllergens,
}: AllergenReviewBlockProps) {
  const sourceLine = existingDeclarationText
    ? `${existingSourceLabel ?? 'Kayıt'} kaydında beyan var: ${existingDeclarationText}`
    : 'kayıtta okunabilir beyan yok';
  const candidate = candidateStatus(candidateText, candidateDecision);
  const needsHumanComparison = Boolean(existingDeclarationText && candidateText && candidateDecision !== 'unreadable');

  return (
    <View
      style={styles.block}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Alerjen beyanı incelemesi. Mevcut kaynak beyanı: ${sourceLine}. Ambalaj adayı: ${candidate.text}.`}
    >
      <Text style={styles.title} allowFontScaling>
        ! Alerjen beyanı — önce bu alan
      </Text>
      <Text style={styles.body} allowFontScaling>
        "İçerir" ve "içerebilir" ifadelerini ayrı satırlarda yazın. Fotoğraftan yazılan metin aday kalır; bu ekranda doğrulamak onu
        alerjen kararına sokmaz.
      </Text>
      <Text style={styles.line} allowFontScaling>
        {existingDeclarationText ? '■' : '□'} Mevcut kaynak beyanı: {sourceLine}
      </Text>
      <Text style={styles.line} allowFontScaling>
        {candidate.icon} Ambalaj adayı: {candidate.text}
        {candidateText ? ` — "${candidateText}"` : ''}
      </Text>
      <Text style={styles.line} allowFontScaling>
        Fotoğraf: {hasAllergenPhoto ? 'var' : 'yok'}
      </Text>
      {needsHumanComparison ? (
        <Text style={styles.status} allowFontScaling>
          ⇄ İnsan karşılaştırması gerekli: kayıtlı beyan ile ambalaj metni otomatik kıyaslanmaz; kayıt korunur.
        </Text>
      ) : null}
      {profileAllergens.length > 0 ? (
        <Text style={styles.line} allowFontScaling>
          Profilinizde {profileAllergens.length} alerjen tanımlı. Ambalaj adayı profil eşleşmesi üretmez; etiketi kontrol edin.
        </Text>
      ) : null}
      <Text style={styles.status} allowFontScaling>
        Bu bir garanti değildir; son karar için güncel ambalaj etiketi esastır.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: 12, padding: 12, gap: 6, borderWidth: 2, borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  body: { fontSize: 14, lineHeight: 20, color: '#374151' },
  line: { fontSize: 14, lineHeight: 20, color: '#111827' },
  status: { fontSize: 13, fontWeight: '700', color: '#92400E' },
});
