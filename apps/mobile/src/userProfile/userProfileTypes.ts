/**
 * RafSkoru — Kullanıcı Hassasiyet Profili Tipleri
 * apps/mobile/src/userProfile/userProfileTypes.ts
 *
 * Sorumluluk:
 * Kullanıcının alerjen, kronik rahatsızlık / hassasiyet
 * ve sağlık tercihlerini tanımlayan tip ve sabit listeleri tutmak.
 *
 * Bu dosya saf tip/veri katmanıdır.
 * UI'a, API'ye ve risk motoruna bağımlılığı yoktur.
 */

// 1. Alerjen Profili

export type AllergenKey =
  | 'egg'
  | 'milk'
  | 'lactose'
  | 'gluten_wheat'
  | 'soy'
  | 'peanut'
  | 'tree_nuts'
  | 'sesame'
  | 'fish'
  | 'shellfish';

// 2. Kronik Rahatsızlık / Hassasiyet Profili

export type ChronicSensitivityKey =
  | 'blood_sugar_diabetes'
  | 'hypertension_sodium'
  | 'cardiovascular'
  | 'celiac_gluten'
  | 'kidney_sensitivity'
  | 'cholesterol_saturated_fat';

// 3. Sağlık Tercihleri

export type HealthPreferenceKey =
  | 'less_sugar'
  | 'less_salt'
  | 'less_additives'
  | 'less_ultra_processed'
  | 'high_protein'
  | 'child_safe_selection'
  | 'clean_label';

// Kullanıcı Profili

/**
 * Kullanıcının aktif hassasiyet ve tercih seçimlerini tutan profil.
 * Her alan seçili anahtarların listesidir.
 * Seçilmemiş anahtarlar dizide yer almaz.
 */
export interface UserSensitivityProfile {
  allergens: AllergenKey[];
  chronicSensitivities: ChronicSensitivityKey[];
  healthPreferences: HealthPreferenceKey[];
}

// Seçenek Tipi

/**
 * UI'da bir profil seçeneğini temsil eden yapı.
 * key: makine tarafından okunabilir tanımlayıcı
 * label: kullanıcıya gösterilecek Türkçe metin
 */
export interface ProfileOption<TKey extends string> {
  key: TKey;
  label: string;
}

// Alerjen Seçenek Listesi

export const allergenOptions: ProfileOption<AllergenKey>[] = [
  { key: 'egg', label: 'Yumurta' },
  { key: 'milk', label: 'Süt' },
  { key: 'lactose', label: 'Laktoz' },
  { key: 'gluten_wheat', label: 'Gluten / Buğday' },
  { key: 'soy', label: 'Soya' },
  { key: 'peanut', label: 'Fıstık' },
  { key: 'tree_nuts', label: 'Fındık / Ağaç yemişleri' },
  { key: 'sesame', label: 'Susam' },
  { key: 'fish', label: 'Balık' },
  { key: 'shellfish', label: 'Kabuklu deniz ürünleri' },
];

// Kronik Rahatsızlık / Hassasiyet Seçenek Listesi

export const chronicSensitivityOptions: ProfileOption<ChronicSensitivityKey>[] = [
  { key: 'blood_sugar_diabetes', label: 'Kan şekeri hassasiyeti / Diyabet' },
  { key: 'hypertension_sodium', label: 'Hipertansiyon / Sodyum hassasiyeti' },
  { key: 'cardiovascular', label: 'Kalp-damar hassasiyeti' },
  { key: 'celiac_gluten', label: 'Çölyak / Gluten hassasiyeti' },
  { key: 'kidney_sensitivity', label: 'Böbrek hassasiyeti' },
  { key: 'cholesterol_saturated_fat', label: 'Kolesterol / Doymuş yağ hassasiyeti' },
];

// Sağlık Tercihi Seçenek Listesi

export const healthPreferenceOptions: ProfileOption<HealthPreferenceKey>[] = [
  { key: 'less_sugar', label: 'Daha az şeker' },
  { key: 'less_salt', label: 'Daha az tuz' },
  { key: 'less_additives', label: 'Daha az katkı maddesi' },
  { key: 'less_ultra_processed', label: 'Daha az ultra işlenmiş ürün' },
  { key: 'high_protein', label: 'Yüksek protein tercihi' },
  { key: 'child_safe_selection', label: 'Çocuklar için daha dikkatli seçim' },
  { key: 'clean_label', label: 'Temiz içerik tercihi' },
];

// Boş Profil Sabiti

/**
 * Yeni bir kullanıcı için başlangıç profili.
 * useState veya AsyncStorage başlangıç değeri olarak kullanılabilir.
 */
export const emptyUserSensitivityProfile: UserSensitivityProfile = {
  allergens: [],
  chronicSensitivities: [],
  healthPreferences: [],
};