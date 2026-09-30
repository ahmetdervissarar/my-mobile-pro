/**
 * RafSkoru — Profil ekranları koyu tema regresyon koruması (device test 30
 * Eylül, D7)
 * src/navigation/profileScreensDarkThemeGuard.smoke.ts
 *
 * Cihaz raporu: (tabs)/profile.tsx, profile-chronic.tsx ve
 * profile-health-preferences.tsx useTheme() HİÇ kullanmıyordu — sabit
 * StyleSheet içinde açık tema renkleri (#fff, #F3F4F6, #111827 vb.)
 * hardcode edilmişti (profile-allergens.tsx zaten doğruydu). Bu statik
 * koruma, her ekranın useTheme()'i kullandığını ve StyleSheet.create ile
 * sabit açık-tema hex renklerinin geri gelmediğini doğrular.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '../..');

function readMobileFile(relativePath: string): string {
  return readFileSync(resolve(mobileRoot, relativePath), 'utf8');
}

const screens = [
  'app/(tabs)/profile.tsx',
  'app/profile-allergens.tsx',
  'app/profile-chronic.tsx',
  'app/profile-health-preferences.tsx',
];

// '#fff' HARİÇ tutulur: profile-allergens.tsx'te seçili bir dairenin İÇİNDEKİ
// onay işareti (renkli arka plan üstünde beyaz ✓) için meşru/kasıtlı kullanılır
// — ekran arka planı/kart rengi DEĞİLDİR. Diğerleri eski StyleSheet paletinin
// (ekran/kart arka planı, metin rengi) imzasıdır.
const HARDCODED_LIGHT_HEX_PATTERN = /#(F3F4F6|111827|6B7280|E5E7EB|F9FAFB|DC2626|D1D5DB)\b/;

for (const screen of screens) {
  const content = readMobileFile(screen);
  assert.ok(content.includes('useTheme'), `${screen} useTheme() kullanmalı (koyu tema desteği için)`);
  assert.ok(!content.includes('StyleSheet.create'), `${screen} sabit StyleSheet.create yerine tema-farkında inline style kullanmalı`);
  assert.ok(
    !HARDCODED_LIGHT_HEX_PATTERN.test(content),
    `${screen} sabit açık-tema hex rengi içermemeli (colors.* token'ları kullanılmalı)`,
  );
}

console.log('PROFILE_SCREENS_DARK_THEME_GUARD_SMOKE_OK');
