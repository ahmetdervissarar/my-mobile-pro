/**
 * RafSkoru — İnceleme ekranının üst alerjen bloğu (bilgi hiyerarşisi 1: alerjen kapısı).
 * src/localProduct/review/AllergenReviewBlock.tsx
 *
 * "İçerir" ve "içerebilir" ayrı ayrı ele alınır; kullanıcı girişi hiçbir zaman okunabilir beyan
 * olmaz. Olumlu güvenlik iddiası yoktur; durum daima "veri yok / doğrulanmamış".
 */

import { StyleSheet, Text, View } from 'react-native';

import type { AllergenKey } from '../../userProfile/userProfileTypes';

export interface AllergenReviewBlockProps {
  candidateText: string | null;
  hasAllergenPhoto: boolean;
  /** Cihazdaki profil anahtarları; yalnız "profilinizde tanımlı" hatırlatması için, hiçbir yere gönderilmez. */
  profileAllergens: readonly AllergenKey[];
}

export function AllergenReviewBlock({ candidateText, hasAllergenPhoto, profileAllergens }: AllergenReviewBlockProps) {
  return (
    <View style={styles.block} accessible accessibilityRole="summary" accessibilityLabel="Alerjen beyanı incelemesi. Durum: veri yok, doğrulanmamış.">
      <Text style={styles.title} allowFontScaling>
        ! Alerjen beyanı — önce bu alan
      </Text>
      <Text style={styles.body} allowFontScaling>
        "İçerir" ve "içerebilir" ifadelerini ayrı satırlarda yazın. Fotoğraftan yazılan metin aday kalır; bu ekranda doğrulamak onu
        alerjen kararına sokmaz.
      </Text>
      <Text style={styles.line} allowFontScaling>
        Aday metin: {candidateText ?? '— boş —'}
      </Text>
      <Text style={styles.line} allowFontScaling>
        Fotoğraf: {hasAllergenPhoto ? 'var (geçici önbellek)' : 'yok'}
      </Text>
      {profileAllergens.length > 0 ? (
        <Text style={styles.line} allowFontScaling>
          Profilinizde {profileAllergens.length} alerjen tanımlı. Bu kayıt profil eşleşmesi üretmez; etiketi kontrol edin.
        </Text>
      ) : null}
      <Text style={styles.status} allowFontScaling>
        Durum: alerjen verisi yok / doğrulanmamış. Bu bir garanti değildir.
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
