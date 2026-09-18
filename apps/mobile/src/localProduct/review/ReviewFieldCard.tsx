/**
 * RafSkoru — Alan inceleme kartı: fotoğraf + aday metin yan yana; Doğrula / Düzelt / Okunamıyor.
 * src/localProduct/review/ReviewFieldCard.tsx
 *
 * Dokunma alanı ≥48 pt; her buton accessibilityRole/Label/State; durum ikon + metinle gösterilir.
 * Kullanıcı seçimi hiçbir alanı doğrulanmış ürün verisi yapmaz; sonuç daima "aday".
 */

import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ReviewItem, FieldDecisionInput } from '../resolution/review';
import type { HumanFieldDecision } from '../resolution/types';

export interface ReviewFieldCardProps {
  item: ReviewItem;
  decision: FieldDecisionInput | undefined;
  onDecision: (decision: FieldDecisionInput) => void;
}

const DECISION_LABEL: Record<HumanFieldDecision, { icon: string; text: string }> = {
  confirmed: { icon: '✔', text: 'Doğrulandı (aday)' },
  corrected: { icon: '✎', text: 'Düzeltildi (aday)' },
  unreadable: { icon: '?', text: 'Okunamıyor → veri yok' },
};

export function ReviewFieldCard({ item, decision, onDecision }: ReviewFieldCardProps) {
  const current = decision?.decision ?? null;
  const canConfirm = Boolean(item.candidateText);

  return (
    <View style={[styles.card, item.isAllergen ? styles.cardAllergen : null]} accessible={false}>
      <Text style={styles.label} accessibilityRole="header" allowFontScaling>
        {item.label}
      </Text>
      {item.isFixture ? (
        <Text style={styles.fixture} accessibilityLabel="Geliştirme fixture uyarısı">
          ⚠ GELİŞTİRME FIXTURE — gerçek ambalaj verisi değil
        </Text>
      ) : null}

      <View style={styles.sideBySide}>
        <View style={styles.photoBox}>
          {item.photo ? (
            <Image source={{ uri: item.photo.localUri }} style={styles.photo} resizeMode="cover" accessibilityLabel={`${item.label} fotoğrafı (geçici önbellek)`} />
          ) : (
            <View style={[styles.photo, styles.photoMissing]} accessible accessibilityLabel="Bu alan için fotoğraf yok">
              <Text style={styles.photoMissingText}>Fotoğraf yok</Text>
            </View>
          )}
        </View>
        <View style={styles.candidateBox} accessible accessibilityLabel={`Aday metin: ${item.candidateText ?? 'boş'}`}>
          <Text style={styles.candidateCaption}>Aday metin (doğrulanmamış)</Text>
          <Text style={styles.candidateText} allowFontScaling>
            {item.candidateText ?? '— boş —'}
          </Text>
          {item.existingValueText ? (
            <Text style={styles.existing} allowFontScaling>
              Kayıtlı değer ({item.existingSourceLabel}): {item.existingValueText}
              {item.candidateText && item.candidateText.trim().toLowerCase() !== item.existingValueText.trim().toLowerCase() ? ' — ambalajla farklı, kayıt korunuyor' : ''}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, current === 'confirmed' ? styles.buttonActive : null, !canConfirm ? styles.buttonDisabled : null]}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: Doğrula`}
          accessibilityState={{ selected: current === 'confirmed', disabled: !canConfirm }}
          disabled={!canConfirm}
          onPress={() => onDecision({ decision: 'confirmed' })}
        >
          <Text style={[styles.buttonText, current === 'confirmed' ? styles.buttonTextActive : null]}>✔ Doğrula</Text>
        </Pressable>
        <Pressable
          style={[styles.button, current === 'corrected' ? styles.buttonActive : null]}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: Düzelt`}
          accessibilityState={{ selected: current === 'corrected' }}
          onPress={() => onDecision({ decision: 'corrected', correctedText: decision?.correctedText ?? item.candidateText ?? '' })}
        >
          <Text style={[styles.buttonText, current === 'corrected' ? styles.buttonTextActive : null]}>✎ Düzelt</Text>
        </Pressable>
        <Pressable
          style={[styles.button, current === 'unreadable' ? styles.buttonActive : null]}
          accessibilityRole="button"
          accessibilityLabel={`${item.label}: Okunamıyor`}
          accessibilityState={{ selected: current === 'unreadable' }}
          onPress={() => onDecision({ decision: 'unreadable' })}
        >
          <Text style={[styles.buttonText, current === 'unreadable' ? styles.buttonTextActive : null]}>? Okunamıyor</Text>
        </Pressable>
      </View>

      {current === 'corrected' ? (
        <TextInput
          style={styles.input}
          value={decision?.correctedText ?? ''}
          onChangeText={(text) => onDecision({ decision: 'corrected', correctedText: text })}
          multiline
          placeholder="Ambalajda yazanı aynen yazın"
          accessibilityLabel={`${item.label} düzeltilmiş metin`}
        />
      ) : null}

      {current ? (
        <Text style={styles.status} accessibilityLiveRegion="polite" allowFontScaling>
          {DECISION_LABEL[current].icon} {DECISION_LABEL[current].text}
        </Text>
      ) : (
        <Text style={styles.status} allowFontScaling>
          ○ Karar bekliyor
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  cardAllergen: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  label: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fixture: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  sideBySide: { flexDirection: 'row', gap: 8 },
  photoBox: { width: 120 },
  photo: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#111827' },
  photoMissing: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  photoMissingText: { fontSize: 12, color: '#374151' },
  candidateBox: { flex: 1, gap: 4 },
  candidateCaption: { fontSize: 12, color: '#6B7280' },
  candidateText: { fontSize: 15, lineHeight: 21, color: '#111827' },
  existing: { fontSize: 12, lineHeight: 17, color: '#92400E' },
  actions: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', paddingHorizontal: 6 },
  buttonActive: { backgroundColor: '#111827', borderColor: '#111827' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'center' },
  buttonTextActive: { color: '#FFFFFF' },
  input: { minHeight: 72, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 10, fontSize: 15, color: '#111827', textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  status: { fontSize: 13, color: '#374151' },
});
