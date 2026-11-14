/**
 * RafSkoru — Ürün sayfası "Ayrıntılar" kapısı testi (İş 4, feat/ui-clarity)
 * src/navigation/productResultDetailsGateGuard.smoke.ts
 *
 * Onaylı görev: ilk ekran (kaydırmadan önce) yalnız ürün kimliği + alerjen
 * satırı + tek cümlelik karar özeti + puan + "Sepete ekle"/"Ayrıntılar"
 * gösterir; 6 katlanır bölüm + footer "Ayrıntılar" açılana kadar HİÇ
 * render edilmez (productResultCollapsedSectionsGuard.smoke.ts zaten
 * bunların varsayılan KAPALI olduğunu doğruluyor — bu test MOUNT
 * edilip edilmediğini doğrular). RN render ortamı olmadığından statik
 * metin taraması kullanılır (bkz. aynı desen, productResultCollapsedSectionsGuard).
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

const fullFile = readMobileFile('app/(tabs)/product-result.tsx');

// isUnknownProduct dalı (erken return) KENDİ ProductHero/FooterSection'ını
// kullanır — bu testin kapsamı DEĞİL. Ana render'ın başlangıcı, "1. Ürün
// kimliği önce" yorumuyla işaretli (yalnız ana dalda var).
const mainReturnStart = fullFile.indexOf('{/* 1. Ürün kimliği önce');
assert.ok(mainReturnStart !== -1, 'ana render bloğunun başlangıç işareti bulunamadı');
const productResult = fullFile.slice(mainReturnStart);

// ── "Ayrıntılar" düğmesi + durum değişkeni var ──────────────────────────────
assert.ok(/const \[isDetailsOpen, setIsDetailsOpen\] = useState\(false\)/.test(fullFile), 'isDetailsOpen=false ile başlamalı');
assert.ok(productResult.includes("label={isDetailsOpen ? 'Ayrıntıları gizle' : 'Ayrıntılar'}"), '"Ayrıntılar" düğmesi olmalı');

// ── 6 CollapsibleSection + FooterSection, isDetailsOpen bloğunun İÇİNDE ─────
// (productResultCollapsedSectionsGuard.smoke.ts zaten tam 6 adet olduğunu ve
// hepsinin kapalı başladığını doğruluyor; burada yalnız MOUNT koşulu kontrol edilir.)
const detailsGateIndex = productResult.indexOf('{isDetailsOpen ? (');
const stickyBarIndex = productResult.indexOf('<StickyAddBar');
assert.ok(detailsGateIndex !== -1, "'{isDetailsOpen ? (' bloğu olmalı — katlanır bölümler bu kapının İÇİNDE");
assert.ok(stickyBarIndex !== -1 && detailsGateIndex < stickyBarIndex, "isDetailsOpen bloğu StickyAddBar'dan ÖNCE olmalı");

const detailsBlock = productResult.slice(detailsGateIndex, stickyBarIndex);
const sectionsInGate = detailsBlock.match(/<CollapsibleSection\b/g) ?? [];
assert.equal(sectionsInGate.length, 6, "6 katlanır bölümün HEPSİ 'Ayrıntılar' kapısının içinde olmalı");
assert.ok(detailsBlock.includes('<FooterSection'), 'FooterSection da "Ayrıntılar" kapısının içinde olmalı');

// ── İlk ekranda (kapı dışında, ana render bloğunda) HİÇ CollapsibleSection/FooterSection YOK ──
const firstScreenBlock = productResult.slice(0, detailsGateIndex);
assert.ok(!firstScreenBlock.includes('<CollapsibleSection'), 'ilk ekran bloğunda katlanır bölüm MOUNT edilmemeli');
assert.ok(!firstScreenBlock.includes('<FooterSection'), 'ilk ekran bloğunda footer MOUNT edilmemeli');

// ── Ürün kimliği + alerjen satırı + puan, "Ayrıntılar" kapısından ÖNCE ──────
const heroIndex = productResult.indexOf('<ProductHero');
const allergenRowIndex = productResult.indexOf('<AllergenStatusRow');
const indicatorRowIndex = productResult.indexOf('<IndicatorRow');
assert.ok(
  heroIndex !== -1 && heroIndex < allergenRowIndex && allergenRowIndex < indicatorRowIndex && indicatorRowIndex < detailsGateIndex,
  'sıra: ProductHero → AllergenStatusRow → IndicatorRow → Ayrıntılar kapısı',
);

// ── Tek cümlelik özet: sinyal yoksa render edilmez (decisionSummaryLine ? ... : null) ──
assert.ok(
  productResult.includes('{decisionSummaryLine ? (') ,
  'tek cümlelik özet sinyal yoksa HİÇ render edilmemeli (decisionSummaryLine ? ... : null)',
);

// ── Çakışma varsa AYNI metin (allergenStatusLine.text) StickyAddBar'ın ÜSTÜNDE tekrarlanır ──
const repeatedLineIndex = productResult.indexOf('{isAllergenConflict ? (', detailsGateIndex);
assert.ok(repeatedLineIndex !== -1 && repeatedLineIndex < stickyBarIndex, 'çakışma satırı StickyAddBar\'dan ÖNCE (ScrollView dışında) tekrarlanmalı');
const repeatedBlock = productResult.slice(repeatedLineIndex, stickyBarIndex);
assert.ok(repeatedBlock.includes('{allergenStatusLine.text}'), 'tekrarlanan satır AllergenStatusRow ile AYNI kaynaktan (allergenStatusLine.text) gelmeli');

// ── ScrollView'ın KAPANIŞINDAN SONRA (yani kaydırma konumundan bağımsız) ────
const scrollViewCloseIndex = productResult.indexOf('</ScrollView>');
assert.ok(scrollViewCloseIndex !== -1 && scrollViewCloseIndex < repeatedLineIndex, 'tekrarlanan satır ScrollView DIŞINDA olmalı (kaydırma konumundan bağımsız görünür kalsın)');

console.log('PRODUCT_RESULT_DETAILS_GATE_GUARD_SMOKE_OK');
