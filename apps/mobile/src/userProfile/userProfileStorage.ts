/**
 * RafSkoru — Kullanıcı Profili Saklama Servisi
 * src/userProfile/userProfileStorage.ts
 *
 * Sorumluluk: UserSensitivityProfile verisini AsyncStorage'a yaz ve oku.
 * Bu servis saf bir I/O katmanıdır — UI'a ve risk motoruna bağımlılığı yoktur.
 *
 * Gereksinim: @react-native-async-storage/async-storage
 * Kurulum:    npx expo install @react-native-async-storage/async-storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  emptyUserSensitivityProfile,
  UserSensitivityProfile,
} from './userProfileTypes';

const STORAGE_KEY = 'rafskoru:userSensitivityProfile';

/**
 * Kaydedilmiş profili okur.
 * Kayıt yoksa ya da ayrıştırma başarısız olursa emptyUserSensitivityProfile döner.
 */
export async function loadUserSensitivityProfile(): Promise<UserSensitivityProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...emptyUserSensitivityProfile };
    return JSON.parse(raw) as UserSensitivityProfile;
  } catch {
    return { ...emptyUserSensitivityProfile };
  }
}

/**
 * Profili AsyncStorage'a kaydeder.
 * Mevcut kaydın üzerine yazar.
 */
export async function saveUserSensitivityProfile(
  profile: UserSensitivityProfile,
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Kayıt başarısız olursa sessizce geç — uygulama çalışmaya devam eder.
  }
}

/**
 * Kaydedilmiş profili siler ve boş profile sıfırlar.
 */
export async function clearUserSensitivityProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Silme başarısız olursa sessizce geç.
  }
}