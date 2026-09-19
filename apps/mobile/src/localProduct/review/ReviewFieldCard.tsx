/**
 * RafSkoru — Alan inceleme kartı (Aşama 6B bilgi tasarımı; üst üste yerleşim, mobil ekran).
 * src/localProduct/review/ReviewFieldCard.tsx
 *
 * Sıra: 1) Mevcut kayıt (kaynak değeri + kaynak adı) · 2) Ambalaj adayı (fotoğraf + kullanıcının yazdığı
 * metin) · 2b) Cihazda OCR (Aşama 7, ADR-006; yalnız "Metni cihazda oku" ile, otomatik çalışmaz) ·
 * 3) Durum (aynı / yalnız ambalajda / çatışmalı / okunamıyor / veri yok; ikon + metin) ·
 * 4) Karar (Doğrula / Düzelt / Okunamıyor). Dokunma alanı ≥48 pt; her buton accessibilityRole/Label/State.
 * Hiçbir karar alanı doğrulanmış ürün verisi yapmaz; sonuç daima "aday". Teknik sağlayıcı adı gösterilmez.
 *
 * OCR sınırı: bu bileşen native OCR paketini DOĞRUDAN çağırmaz; yalnız `ocr/ocrEngine.ts`
 * sınırını kullanır (`getOcrCapability()` + `createOcrEngine()`). OCR sonucu asla otomatik
 * "Doğrula" saymaz — yalnız mevcut "Düzelt" metin kutusuna ön dolgu yapar; kullanıcı karar
 * vermeden (bir Karar düğmesine basmadan) inceleme ilerlemesi ARTMAZ.
 *
 * Ham OCR sonucu bu bileşenin İÇİNDE tutulmaz — `ocrResult`/`onOcrResult` prop'larıyla üst ekrana
 * (`package-review.tsx`) TAŞINIR ve kaydedilirken `applyHumanFieldChecks`'e geçirilip
 * `HumanFieldCheck.ocrEvidence` olarak kullanıcının `correctedText` kararından her zaman ayrı
 * tutulur. Ham OCR sonucu kullanıcı inceleme kaydını kaydettikten sonra cihazda kalıcıdır;
 * kaydetme öncesinde yalnız mevcut ekran oturumunda (React state) tutulur — kullanıcı kaydetmeden
 * ekranı kapatırsa bu oturumdaki OCR sonucu kaybolabilir; otomatik taslak kaydetme YOKTUR.
 */

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createOcrEngine, getOcrCapability, photoOcrEvidenceId } from '../ocr/ocrEngine';
import type { OcrRunResult } from '../ocr/types';
import { deriveFieldComparison, FIELD_COMPARISON_COPY } from '../resolution/review';
import type { ReviewItem, FieldDecisionInput } from '../resolution/review';
import type { HumanFieldDecision } from '../resolution/types';

export interface ReviewFieldCardProps {
  item: ReviewItem;
  decision: FieldDecisionInput | undefined;
  onDecision: (decision: FieldDecisionInput) => void;
  /** Bu alan için en son OCR sonucu (üst ekranda kalıcı tutulur); hiç çalıştırılmadıysa null. */
  ocrResult: OcrRunResult | null;
  /** OCR tamamlandığında (başarı/no_text/failed fark etmez) üst ekrana bildirir. */
  onOcrResult: (result: OcrRunResult) => void;
}

/**
 * `createOcrEngine()`/`engine.recognize()` kendi içlerinde de güvenli tarafa düşer, ama burası son
 * savunma hattıdır: beklenmeyen bir promise reddi/import hatası olursa bile kullanıcıya HİÇBİR
 * teknik ayrıntı (yığın izi, native mesaj) sızdırmadan sabit, güvenli bir "failed" sonucu üretir.
 */
function buildUnexpectedOcrFailure(item: ReviewItem): OcrRunResult {
  const now = new Date().toISOString();
  return {
    field: item.field,
    status: 'failed',
    rawText: null,
    blocks: [],
    engine: 'unavailable',
    engineVersion: null,
    photoEvidenceId: item.photo ? photoOcrEvidenceId(item.photo) : `photo:${item.field}:${now}`,
    capturedAt: item.photo?.takenAt ?? now,
    recognizedAt: now,
    source: 'user_ocr',
    verificationLevel: 'unverified',
    confidence: 'low',
    errorMessage: 'Okuma başarısız — yeniden deneyin veya elle yazın.',
  };
}

const DECISION_LABEL: Record<HumanFieldDecision, { icon: string; text: string }> = {
  confirmed: { icon: '✔', text: 'Doğrulandı — aday olarak kalır' },
  corrected: { icon: '✎', text: 'Düzeltildi — aday olarak kalır' },
  unreadable: { icon: '?', text: 'Okunamıyor — veri yok' },
};

function formatFetchedAt(iso: string | null): string | null {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : iso;
}

export function ReviewFieldCard({ item, decision, onDecision, ocrResult, onOcrResult }: ReviewFieldCardProps) {
  const current = decision?.decision ?? null;
  const canConfirm = Boolean(item.candidateText);
  const comparison = deriveFieldComparison(item, current);
  const comparisonCopy = FIELD_COMPARISON_COPY[comparison];
  const fetched = formatFetchedAt(item.existingFetchedAt);

  // Cihazda OCR (Aşama 7) — yalnız fotoğraf varsa gösterilir; otomatik çalışmaz. Sonucun kendisi
  // (`ocrResult`) prop'tur (üst ekranda kalıcı); burada yalnız "istek şu an sürüyor mu" tutulur.
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const ocrCapability = getOcrCapability();

  const handleRunOcr = async () => {
    if (!item.photo || isOcrRunning) return;
    setIsOcrRunning(true);
    try {
      const engine = await createOcrEngine();
      const result = await engine.recognize({ photo: item.photo, field: item.field });
      onOcrResult(result);
      // KASITLI OLARAK burada onDecision() ÇAĞRILMAZ: OCR tek başına bir "karar" üretmez — kullanıcı
      // ham metni görüp aşağıdaki "✎ Düzelt" düğmesine kendisi basmadan hiçbir alan "karar verildi"
      // sayılmaz (computeReviewProgress). Ham metin yalnız Düzelt'in metin kutusuna ÖN DOLGU olarak
      // sunulur, otomatik onaylanmaz/doğrulanmış sayılmaz.
    } catch {
      // Beklenmeyen hata (dinamik import, promise reddi, native mesaj/yığın izi) — hiçbir ayrıntı
      // kullanıcıya veya log'a taşınmaz; yalnız sabit, güvenli bir "failed" sonucu üretilir.
      onOcrResult(buildUnexpectedOcrFailure(item));
    } finally {
      setIsOcrRunning(false);
    }
  };

  const ocrSection =
    item.photo && ocrCapability.reason !== 'flag_disabled' ? (
      <View style={styles.section} accessible={false}>
        <Text style={styles.sectionCaption}>Cihazda oku (OCR — aday, doğrulanmamış)</Text>
        <Text style={styles.metaText} allowFontScaling>
          Fotoğraf yalnız bu cihazda işlenir; sunucuya gönderilmez.
        </Text>
        {ocrCapability.reason === 'native_module_missing' ? (
          <Text style={styles.metaText} allowFontScaling accessibilityLabel="OCR bu cihazda kullanılamıyor, elle yazabilirsiniz">
            OCR bu cihazda kullanılamıyor — elle yazabilirsiniz.
          </Text>
        ) : (
          <Pressable
            style={[styles.button, styles.ocrButton, isOcrRunning ? styles.buttonDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: Metni cihazda oku`}
            accessibilityState={{ disabled: isOcrRunning }}
            disabled={isOcrRunning}
            onPress={() => void handleRunOcr()}
          >
            {isOcrRunning ? <ActivityIndicator size="small" color="#111827" /> : <Text style={styles.buttonText}>◈ Metni cihazda oku</Text>}
          </Pressable>
        )}
        {isOcrRunning ? (
          <Text style={styles.metaText} accessibilityLiveRegion="polite" allowFontScaling>
            İşleniyor...
          </Text>
        ) : null}
        {!isOcrRunning && ocrResult?.status === 'no_text' ? (
          <Text style={styles.metaText} accessibilityLiveRegion="polite" allowFontScaling>
            Metin bulunamadı. Fotoğrafı yeniden çekebilir veya elle yazabilirsiniz.
          </Text>
        ) : null}
        {!isOcrRunning && ocrResult?.status === 'failed' ? (
          <Text style={styles.warnText} accessibilityLiveRegion="polite" allowFontScaling>
            {ocrResult.errorMessage ?? 'Okuma başarısız — yeniden deneyin veya elle yazın.'}
          </Text>
        ) : null}
        {ocrResult?.status === 'candidate' && ocrResult.rawText ? (
          <View accessible accessibilityLabel={`Ham OCR metni: ${ocrResult.rawText}`}>
            <Text style={styles.metaText} allowFontScaling>
              Ham OCR metni (yalnız aday, doğrulanmamış). Kullanmak için aşağıda "✎ Düzelt"e basın —
              düzenlenebilir alana ön dolgu olarak gelir, siz onaylamadan karar sayılmaz:
            </Text>
            <Text style={styles.ocrRawText} allowFontScaling>
              {ocrResult.rawText}
            </Text>
          </View>
        ) : null}
      </View>
    ) : null;

  return (
    <View style={[styles.card, item.isAllergen ? styles.cardAllergen : null, comparison === 'conflict' ? styles.cardConflict : null]} accessible={false}>
      <Text style={styles.label} accessibilityRole="header" allowFontScaling>
        {item.label}
      </Text>
      {item.isFixture ? (
        <Text style={styles.fixture} accessibilityLabel="Geliştirme fixture uyarısı">
          ⚠ GELİŞTİRME FIXTURE — gerçek ambalaj verisi değil
        </Text>
      ) : null}

      {/* 1. Mevcut kayıt */}
      <View style={styles.section} accessible accessibilityLabel={`Mevcut kayıt: ${item.existingValueText ?? 'bu alan için kayıt yok'}`}>
        <Text style={styles.sectionCaption}>Mevcut kayıt</Text>
        {item.existingValueText ? (
          <>
            <Text style={styles.valueText} allowFontScaling>
              {item.existingValueText}
            </Text>
            <Text style={styles.metaText} allowFontScaling>
              Kaynak: {item.existingSourceLabel}
              {fetched ? ` · alınma: ${fetched}` : ''}
            </Text>
          </>
        ) : (
          <Text style={styles.metaText} allowFontScaling>
            Bu alan için kayıt yok.
          </Text>
        )}
      </View>

      {/* 2. Ambalaj adayı */}
      <View style={styles.section} accessible accessibilityLabel={`Ambalaj adayı: ${item.candidateText ?? 'boş'}. Fotoğraf ${item.photo ? 'var' : 'yok'}.`}>
        <Text style={styles.sectionCaption}>Ambalaj adayı (doğrulanmamış)</Text>
        <View style={styles.candidateRow}>
          {item.photo ? (
            <Image source={{ uri: item.photo.localUri }} style={styles.photo} resizeMode="cover" accessibilityLabel={`${item.label} ambalaj fotoğrafı`} />
          ) : (
            <View style={[styles.photo, styles.photoMissing]}>
              <Text style={styles.photoMissingText}>Fotoğraf yok</Text>
            </View>
          )}
          <Text style={[styles.valueText, styles.candidateText]} allowFontScaling>
            {item.candidateText ?? '— boş —'}
          </Text>
        </View>
      </View>

      {/* 2b. Cihazda OCR (Aşama 7) */}
      {ocrSection}

      {/* 3. Durum */}
      <View style={styles.statusRow} accessible accessibilityLiveRegion="polite" accessibilityLabel={`Durum: ${comparisonCopy.label}. ${comparisonCopy.note}`}>
        <Text style={styles.statusIcon} accessibilityElementsHidden importantForAccessibility="no">
          {comparisonCopy.icon}
        </Text>
        <View style={styles.statusTextBlock}>
          <Text style={styles.statusLabel} allowFontScaling>
            Durum: {comparisonCopy.label}
          </Text>
          <Text style={styles.metaText} allowFontScaling>
            {comparisonCopy.note}
          </Text>
        </View>
      </View>

      {/* 4. Karar */}
      <Text style={styles.sectionCaption}>Karar</Text>
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
          onPress={() =>
            // Ön dolgu sırası: kullanıcının önceki düzeltmesi > OCR ham metni (yalnız burada, açık
            // basma anında teklif edilir) > mevcut ambalaj adayı. Kullanıcı bu metni değiştirmeden
            // kaydederse bile karar YİNE kendi açık "Düzelt" basışıyla verilmiş olur (OCR tek başına
            // karar üretmez); ham OCR metni `ocrResult` state'inde ayrı ve değişmeden kalır.
            onDecision({ decision: 'corrected', correctedText: decision?.correctedText ?? ocrResult?.rawText ?? item.candidateText ?? '' })
          }
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

      <Text style={styles.decisionStatus} accessibilityLiveRegion="polite" allowFontScaling>
        {current ? `${DECISION_LABEL[current].icon} ${DECISION_LABEL[current].text}` : '○ Karar bekliyor'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 12, gap: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  cardAllergen: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  cardConflict: { borderWidth: 2, borderStyle: 'dashed' },
  label: { fontSize: 16, fontWeight: '700', color: '#111827' },
  fixture: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  section: { gap: 4, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  sectionCaption: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 },
  valueText: { fontSize: 15, lineHeight: 21, color: '#111827' },
  metaText: { fontSize: 13, lineHeight: 18, color: '#4B5563' },
  candidateRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  candidateText: { flex: 1 },
  photo: { width: 96, height: 96, borderRadius: 8, backgroundColor: '#111827' },
  photoMissing: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  photoMissingText: { fontSize: 12, color: '#374151' },
  ocrButton: { alignSelf: 'flex-start', minWidth: 48, paddingHorizontal: 14, flex: 0 },
  ocrRawText: { fontSize: 14, lineHeight: 20, color: '#111827', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8, marginTop: 4 },
  warnText: { fontSize: 13, lineHeight: 18, color: '#92400E' },
  statusRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  statusIcon: { fontSize: 20, width: 28, textAlign: 'center', color: '#111827' },
  statusTextBlock: { flex: 1, gap: 2 },
  statusLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  actions: { flexDirection: 'row', gap: 6 },
  button: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', paddingHorizontal: 6 },
  buttonActive: { backgroundColor: '#111827', borderColor: '#111827' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'center' },
  buttonTextActive: { color: '#FFFFFF' },
  input: { minHeight: 72, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 10, fontSize: 15, color: '#111827', textAlignVertical: 'top', backgroundColor: '#FFFFFF' },
  decisionStatus: { fontSize: 13, color: '#374151' },
});
