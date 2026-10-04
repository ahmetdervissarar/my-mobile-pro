import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '..');

function readMobileFile(relativePath) {
  return readFileSync(resolve(mobileRoot, relativePath), 'utf8');
}

/**
 * RafSkoru — Eylem rengi TEK token guard'ı
 * scripts/actionColorTokenGuard.mjs
 *
 * İş 3 (feat/ui-clarity, görev onayı, madde 2): "Sepete ekle", alt menü
 * etkin sekme, ana ekran barkod kartı ve bağlantı metinleri AYNI token'ı
 * (colors.accent/onAccent) kullanmalı; hiçbiri uyarı renklerini
 * (danger/warn/caution/leaf) kullanamaz. Eski 'citrus' tonu tamamen
 * kaldırıldı (sarı uyarı rengiyle karışıyordu). Bu guard statiktir —
 * betaWordingGuard.mjs ile aynı desen (metin taraması), çalışan uygulamayı
 * başlatmaz.
 */
const WARNING_COLOR_TOKENS = ['colors.danger', 'colors.warn', 'colors.caution', 'colors.leaf'];

function assertIncludes(fileName, content, expectedText) {
  assert.ok(content.includes(expectedText), `${fileName} must include: ${expectedText}`);
}

function assertNotIncludes(fileName, content, forbiddenText) {
  assert.ok(!content.includes(forbiddenText), `${fileName} must not include: ${forbiddenText}`);
}

/** anchorText'i içeren satırın etrafındaki (±windowLines) pencerede arama yapar. */
function assertAnchorWindow(fileName, content, anchorText, { mustInclude = [], mustNotInclude = [] }, windowLines = 3) {
  const lines = content.split('\n');
  const anchorIndex = lines.findIndex((line) => line.includes(anchorText));
  assert.ok(anchorIndex >= 0, `${fileName} must include anchor text: ${anchorText}`);

  const start = Math.max(0, anchorIndex - windowLines);
  const end = Math.min(lines.length, anchorIndex + windowLines + 1);
  const window = lines.slice(start, end).join('\n');

  for (const text of mustInclude) {
    assert.ok(window.includes(text), `${fileName} around "${anchorText}" must use: ${text}`);
  }
  for (const text of mustNotInclude) {
    assert.ok(!window.includes(text), `${fileName} around "${anchorText}" must not use: ${text}`);
  }
}

// ── theme.ts: 'citrus' alan/token tanımı tamamen kaldırılmış (yorumlarda
// retirement açıklaması kalabilir — aranan literal ALAN TANIMIdır), accent/
// onAccent her iki temada da var ──
const theme = readMobileFile('src/ui/theme.ts');
assertNotIncludes('theme.ts', theme, 'citrus:');
assertIncludes('theme.ts', theme, 'accent: string;');
assertIncludes('theme.ts', theme, 'onAccent: string;');

// ── PrimaryButton.tsx: 'accent' varyantı colors.accent/onAccent'e eşlenir, 'citrus'
// alan/varyant tanımı yok (retirement yorumunda geçmesi serbest) ──
const primaryButton = readMobileFile('src/ui/PrimaryButton.tsx');
assertNotIncludes('PrimaryButton.tsx', primaryButton, 'citrus:');
assertIncludes(
  'PrimaryButton.tsx',
  primaryButton,
  'accent: { backgroundColor: colors.accent, borderWidth: 0, textColor: colors.onAccent }',
);

// ── StickyAddBar.tsx: "Sepete ekle" accent varyantını kullanır, uyarı rengi yok ──
const stickyAddBar = readMobileFile('src/features/productResult/StickyAddBar.tsx');
assertIncludes('StickyAddBar.tsx', stickyAddBar, 'label="Sepete ekle"');
assertIncludes('StickyAddBar.tsx', stickyAddBar, 'variant="accent"');
for (const forbidden of WARNING_COLOR_TOKENS) {
  assertNotIncludes('StickyAddBar.tsx', stickyAddBar, forbidden);
}

// ── _layout.tsx: alt menü etkin sekme + barkod dairesi accent, uyarı rengi yok ──
const tabsLayout = readMobileFile('app/(tabs)/_layout.tsx');
assertIncludes('_layout.tsx', tabsLayout, 'tabBarActiveTintColor: colors.accent');
for (const forbidden of WARNING_COLOR_TOKENS) {
  assertNotIncludes('_layout.tsx', tabsLayout, forbidden);
}

// ── index.tsx: ana ekran barkod kartı accent, uyarı rengi yok ──
const homeScreen = readMobileFile('app/(tabs)/index.tsx');
assertIncludes('index.tsx', homeScreen, 'backgroundColor: colors.accent');
for (const forbidden of WARNING_COLOR_TOKENS) {
  assertNotIncludes('index.tsx', homeScreen, forbidden);
}

// ── Bağlantı metinleri: "Detayları göster/gizle" ve "Kapat" accent, çevresinde uyarı rengi yok ──
assertAnchorWindow(
  'WarningsSection.tsx',
  readMobileFile('src/features/productResult/WarningsSection.tsx'),
  "'Detayları gizle' : 'Detayları göster'",
  { mustInclude: ['colors.accent'], mustNotInclude: WARNING_COLOR_TOKENS },
);
assertAnchorWindow(
  'PriceSection.tsx',
  readMobileFile('src/features/productResult/PriceSection.tsx'),
  "'Detayları gizle' : 'Detayları göster'",
  { mustInclude: ['colors.accent'], mustNotInclude: WARNING_COLOR_TOKENS },
);
assertAnchorWindow(
  'AllergenDetailSheet.tsx',
  readMobileFile('src/features/productResult/AllergenDetailSheet.tsx'),
  '>Kapat</Text>',
  { mustInclude: ['colors.accent'], mustNotInclude: WARNING_COLOR_TOKENS },
);
assertAnchorWindow(
  'FooterSection.tsx',
  readMobileFile('src/features/productResult/FooterSection.tsx'),
  'Kapalı beta ve gizlilik bilgisi',
  { mustInclude: ['colors.accent'], mustNotInclude: WARNING_COLOR_TOKENS },
  2,
);

console.log('ACTION_COLOR_TOKEN_GUARD_OK');
