/**
 * RafSkoru — "Paket bilgisini ekle" akışı (kullanıcı testine hazır dikey dilim).
 * app/package-capture.tsx
 *
 * Adımlar: ön yüz → barkod → içindekiler → alerjen beyanı → besin tablosu → net miktar.
 * Her adımda neden gerektiği ve atlanırsa ne olacağı yazılır; tekrar çekme, önceki adıma dönme
 * ve atlama vardır. OCR bu sürümde YOK: aday metin elle yazılır veya (yalnız __DEV__ + fixture
 * bayrağı) fixture ile ön doldurulur ve "GELİŞTİRME FIXTURE" etiketiyle görünür. Sonuç
 * `candidate` taslaktır; dış servise yüklenmez, skorlara ve alerjen kararına girmez.
 *
 * Kamera izni yalnız kullanıcı "Kamera izni ver" butonuna bastığında istenir — ekran açılır
 * açılmaz otomatik istenmez; önce gerekçe metni gösterilir (proje sahibi düzeltmesi, 2026-09-18).
 * Fotoğraflar bu sürümde yalnız GEÇİCİ önbellek dosyasıdır; kalıcı depolama (`expo-file-system`)
 * kurulmadı — bu, yeni bağımlılık onayı gerektiren, bilinçli olarak durdurulmuş bir sınırdır.
 */

import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';

import { isLocalProductFixtureEnabled, isLocalProductRecoveryEnabled } from '../src/localProduct/featureFlag';
import {
  createContributionDraft,
  DRAFT_TEXT_FIELDS,
  PACKAGE_CAPTURE_STEPS,
  PHOTO_TEMPORARY_STORAGE_NOTICE,
  summarizeContributionDraft,
} from '../src/localProduct/contributionDraft';
import { saveContributionDraft } from '../src/localProduct/contributionDraftStorage';
import { describeGtinValidationError, isValidGtin } from '../src/localProduct/gtin';
import { FIXTURE_LABEL, ocrCandidateFixture } from '../src/localProduct/fixtures';
import type { CapturedPhoto, ContributionDraft, DraftTextField, OcrCandidate, PackageCaptureStepKind } from '../src/localProduct/types';

type Phase = 'capture' | 'review' | 'done';

export default function PackageCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode?: string; productName?: string }>();
  const initialBarcode = typeof params.barcode === 'string' && isValidGtin(params.barcode) ? params.barcode : null;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [phase, setPhase] = useState<Phase>('capture');
  const [stepIndex, setStepIndex] = useState(0);
  const [photos, setPhotos] = useState<Partial<Record<PackageCaptureStepKind, CapturedPhoto>>>({});
  const [skipped, setSkipped] = useState<PackageCaptureStepKind[]>([]);
  const [gtin, setGtin] = useState<string | null>(initialBarcode);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [texts, setTexts] = useState<Partial<Record<DraftTextField, string>>>(() => {
    if (!isLocalProductFixtureEnabled()) return {};
    const initial: Partial<Record<DraftTextField, string>> = {};
    for (const c of ocrCandidateFixture) if (c.text) initial[c.field] = c.text;
    return initial;
  });
  const [packagingVersion, setPackagingVersion] = useState('');
  const [draft, setDraft] = useState<ContributionDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fixtureEnabled = isLocalProductFixtureEnabled();
  const step = PACKAGE_CAPTURE_STEPS[stepIndex];
  const currentPhoto = photos[step.kind];
  const gtinError = describeGtinValidationError(gtin);

  const candidates: OcrCandidate[] = useMemo(
    () =>
      DRAFT_TEXT_FIELDS.map(({ field }) => {
        const text = texts[field]?.trim() || null;
        const isFixture = Boolean(text && text.includes(FIXTURE_LABEL));
        return {
          field,
          text,
          entryMethod: text ? (isFixture ? 'fixture' : 'manual') : 'none',
          isFixture,
          source: 'user_ocr',
          verified: false,
        };
      }),
    [texts],
  );

  if (!isLocalProductRecoveryEnabled()) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Paket bilgisini ekle</Text>
        <Text style={styles.body}>Bu akış bu sürümde kapalı.</Text>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isTakingPhoto) return;
    try {
      setIsTakingPhoto(true);
      setCaptureError(null);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) throw new Error('PHOTO_URI_MISSING');
      setPhotos((current) => ({
        ...current,
        [step.kind]: { kind: step.kind, localUri: photo.uri, takenAt: new Date().toISOString() },
      }));
      setSkipped((current) => current.filter((k) => k !== step.kind));
    } catch {
      setCaptureError('Fotoğraf çekilemedi. Tekrar deneyin veya bu adımı atlayın.');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (step.kind !== 'barcode' || gtin) return;
    if (isValidGtin(result.data)) {
      setGtin(result.data);
    } else {
      setCaptureError('Okunan barkod geçersiz görünüyor (kontrol basamağı hatalı). Tekrar okutun veya sonraki ekranda elle yazın.');
    }
  };

  const goNext = () => {
    if (stepIndex < PACKAGE_CAPTURE_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
      setCaptureError(null);
    } else {
      setPhase('review');
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      setCaptureError(null);
    }
  };

  const handleSkip = () => {
    if (step.required && !gtin) return;
    setSkipped((current) => (current.includes(step.kind) ? current : [...current, step.kind]));
    goNext();
  };

  const handleRetake = () => {
    setPhotos((current) => {
      const next = { ...current };
      delete next[step.kind];
      return next;
    });
  };

  const handleSaveDraft = async () => {
    if (isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const orderedPhotos = PACKAGE_CAPTURE_STEPS.map((s) => photos[s.kind]).filter((p): p is CapturedPhoto => Boolean(p));
      const created = createContributionDraft({
        gtin,
        photos: orderedPhotos,
        skippedSteps: skipped,
        candidates,
        packagingVersion: packagingVersion || null,
        now: new Date().toISOString(),
      });
      const result = await saveContributionDraft(created);
      if (!result.ok) {
        // Kayıt başarısız → "Taslak kaydedildi" GÖSTERİLMEZ; kullanıcı bilgilendirilir (proje sahibi düzeltmesi).
        setSaveError(result.errorMessage ?? 'Taslak kaydedilemedi. Tekrar deneyin.');
        return;
      }
      setDraft(created);
      setPhase('done');
    } finally {
      setIsSaving(false);
    }
  };

  if (phase === 'done' && draft) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Taslak kaydedildi</Text>
        <View style={styles.noticeCard} accessible accessibilityLabel="Katkı taslağı özeti">
          {summarizeContributionDraft(draft).map((line) => (
            <Text key={line} style={styles.body}>
              • {line}
            </Text>
          ))}
        </View>
        <Text style={styles.helper}>
          Sınır: bu sürüm taslağı cihazda tutar, hiçbir yere göndermez. Sonraki adım: alan alan inceleme (aday kalır, doğrulanmış olmaz).
        </Text>
        {draft.gtin ? (
          <Pressable
            style={styles.primaryButton}
            accessibilityRole="button"
            accessibilityLabel="Alan alan incelemeye geç"
            onPress={() => router.replace({ pathname: '/package-review', params: { gtin: draft.gtin ?? '' } })}
          >
            <Text style={styles.primaryButtonText}>Alan alan incelemeye geç</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Ürün sonucuna dön" onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Ürün sonucuna dön</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (phase === 'review') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Metni doğrula</Text>
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>OCR bu sürümde yok</Text>
          <Text style={styles.body}>
            Fotoğraflar kaydedildi ama metin otomatik okunmaz. İstersen alanları ambalajdan bakarak yaz. Yazdıkların doğrulanmamış aday veridir; boş bıraktığın alan "eksik" kalır.
          </Text>
          {Object.values(photos).length > 0 ? <Text style={styles.helper}>{PHOTO_TEMPORARY_STORAGE_NOTICE}</Text> : null}
          {fixtureEnabled ? (
            <Text style={styles.fixtureBadge} accessibilityLabel="Geliştirme fixture uyarısı">
              ⚠ {FIXTURE_LABEL}: alanlar örnek metinle ön dolduruldu.
            </Text>
          ) : null}
        </View>

        <Text style={styles.label}>Barkod (GTIN)</Text>
        <TextInput
          style={[styles.input, gtinError ? styles.inputInvalid : null]}
          value={gtin ?? ''}
          onChangeText={(v) => setGtin(v.replace(/\D/g, '') || null)}
          keyboardType="number-pad"
          placeholder="8690000000000"
          accessibilityLabel="Barkod"
        />
        {gtinError ? (
          <Text style={styles.warnText} accessibilityLiveRegion="polite">
            {gtinError}
          </Text>
        ) : null}

        {DRAFT_TEXT_FIELDS.map(({ field, label, step: stepKind }) => (
          <View key={field} style={styles.fieldBlock}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.helper}>
              {photos[stepKind] ? 'Fotoğraf var.' : 'Fotoğraf yok.'}{' '}
              {field === 'allergenDeclaration' ? 'Boş kalırsa alerjen durumu "veri yok / doğrulanmamış" olur; yazsan da doğrulanana kadar aday sayılır.' : ''}
            </Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={texts[field] ?? ''}
              onChangeText={(v) => setTexts((current) => ({ ...current, [field]: v }))}
              multiline
              placeholder="İsteğe bağlı — ambalajdan yaz"
              accessibilityLabel={label}
            />
          </View>
        ))}

        <Text style={styles.label}>Ambalaj / etiket sürümü (isteğe bağlı)</Text>
        <Text style={styles.helper}>Örn. son kullanma tarihi veya parti kodu. Eski ambalaj yeni veriyi geçersiz kılabilir.</Text>
        <TextInput style={styles.input} value={packagingVersion} onChangeText={setPackagingVersion} placeholder="SKT 12.2027 / parti A1" accessibilityLabel="Ambalaj sürümü" />

        {saveError ? (
          <View style={styles.errorCard} accessible accessibilityLabel={`Kayıt hatası: ${saveError}`}>
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primaryButton, !gtin || Boolean(gtinError) || isSaving ? styles.buttonDisabled : null]}
          accessibilityRole="button"
          accessibilityLabel={isSaving ? 'Kaydediliyor' : 'Taslağı kaydet'}
          accessibilityState={{ disabled: !gtin || Boolean(gtinError) || isSaving }}
          disabled={!gtin || Boolean(gtinError) || isSaving}
          onPress={() => void handleSaveDraft()}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Kaydediliyor...' : 'Taslağı kaydet (aday, gönderilmez)'}</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          accessibilityRole="button"
          accessibilityLabel="Fotoğraf adımlarına dön"
          onPress={() => {
            setStepIndex(0);
            setPhase('capture');
          }}
        >
          <Text style={styles.secondaryButtonText}>Fotoğraf adımlarına dön</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Fotoğraf çekim adımları ────────────────────────────────────────────────
  const needsCameraRationale = permission !== null && !permission.granted && !currentPhoto;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.stepCounter} accessibilityLabel={`Adım ${stepIndex + 1} / ${PACKAGE_CAPTURE_STEPS.length}`}>
        Adım {stepIndex + 1} / {PACKAGE_CAPTURE_STEPS.length}
      </Text>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.why}</Text>
      <Text style={styles.helper}>Atlarsan: {step.skipConsequence}</Text>

      {permission === null ? (
        <View style={styles.cameraWrapper}>
          <View style={styles.photoTaken}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={[styles.photoTakenText, { marginTop: 8 }]}>Kamera izni kontrol ediliyor...</Text>
          </View>
        </View>
      ) : currentPhoto ? (
        <View style={styles.cameraWrapper}>
          <Image
            source={{ uri: currentPhoto.localUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={`${step.title} fotoğraf önizlemesi`}
          />
          <View style={styles.photoTakenBadge}>
            <Text style={styles.photoTakenBadgeText}>✔ Fotoğraf çekildi (önizleme)</Text>
          </View>
        </View>
      ) : needsCameraRationale ? (
        // Kamera izni gerekçesi önce gösterilir; OS izin isteği yalnız butona basınca tetiklenir.
        <View style={[styles.cameraWrapper, styles.rationaleBox]}>
          <Text style={styles.rationaleText}>
            Bu adımda ambalajın fotoğrafını çekmek için kamera erişimi gerekir. Fotoğraf yalnız bu
            cihazda, geçici olarak tutulur; bu sürümde hiçbir yere gönderilmez.
          </Text>
          <Pressable style={styles.primaryButton} accessibilityRole="button" accessibilityLabel="Kamera izni ver" onPress={() => void requestPermission()}>
            <Text style={styles.primaryButtonText}>Kamera izni ver</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            accessibilityRole="button"
            accessibilityLabel="Fotoğrafsız devam et, metni elle yaz"
            onPress={() => setPhase('review')}
          >
            <Text style={styles.secondaryButtonText}>Fotoğrafsız devam et (metni elle yaz)</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cameraWrapper}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={step.kind === 'barcode' ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] } : undefined}
            onBarcodeScanned={step.kind === 'barcode' && !gtin ? handleBarcodeScanned : undefined}
          />
        </View>
      )}

      {step.kind === 'barcode' ? (
        <Text style={styles.body} accessibilityLiveRegion="polite">
          {gtin ? `Okunan barkod: ${gtin}` : 'Barkod henüz okunmadı. Kamerayı barkoda tutun veya sonraki ekranda elle yazın.'}
        </Text>
      ) : null}
      {captureError ? <Text style={styles.warnText}>{captureError}</Text> : null}

      <View style={styles.actions}>
        {currentPhoto ? (
          <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Tekrar çek" onPress={handleRetake}>
            <Text style={styles.secondaryButtonText}>↺ Tekrar çek</Text>
          </Pressable>
        ) : !needsCameraRationale && permission !== null ? (
          <Pressable
            style={[styles.primaryButton, isTakingPhoto ? styles.buttonDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel="Fotoğraf çek"
            accessibilityState={{ disabled: isTakingPhoto }}
            disabled={isTakingPhoto}
            onPress={() => void handleTakePhoto()}
          >
            <Text style={styles.primaryButtonText}>{isTakingPhoto ? 'Çekiliyor...' : '◉ Fotoğraf çek'}</Text>
          </Pressable>
        ) : null}

        <View style={styles.navRow}>
          {stepIndex > 0 ? (
            <Pressable style={[styles.secondaryButton, styles.navButton]} accessibilityRole="button" accessibilityLabel="Önceki adım" onPress={goPrev}>
              <Text style={styles.secondaryButtonText}>◀ Önceki adım</Text>
            </Pressable>
          ) : null}
          {currentPhoto || (step.kind === 'barcode' && gtin) || skipped.includes(step.kind) ? (
            <Pressable style={[styles.primaryButton, styles.navButton]} accessibilityRole="button" accessibilityLabel="Sonraki adım" onPress={goNext}>
              <Text style={styles.primaryButtonText}>Sonraki adım →</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={[styles.secondaryButton, step.required && !gtin ? styles.buttonDisabled : null]}
          accessibilityRole="button"
          accessibilityLabel={step.required && !gtin ? 'Bu adım atlanamaz' : 'Bu adımı atla'}
          accessibilityState={{ disabled: step.required && !gtin }}
          disabled={step.required && !gtin}
          onPress={handleSkip}
        >
          <Text style={styles.secondaryButtonText}>{step.required && !gtin ? 'Barkod zorunlu — atlanamaz' : 'Bu adımı atla'}</Text>
        </Pressable>
        <Pressable style={styles.linkButton} accessibilityRole="button" accessibilityLabel="Vazgeç ve geri dön" onPress={() => router.back()}>
          <Text style={styles.linkButtonText}>Vazgeç</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: '#FFFFFF' },
  stepCounter: { fontSize: 13, color: '#6B7280' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  body: { fontSize: 15, lineHeight: 21, color: '#374151' },
  helper: { fontSize: 13, lineHeight: 18, color: '#6B7280' },
  warnText: { fontSize: 13, lineHeight: 18, color: '#92400E' },
  label: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 4 },
  fieldBlock: { gap: 4 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputInvalid: { borderColor: '#DC2626' },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  cameraWrapper: { width: '100%', height: 300, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111827' },
  rationaleBox: { alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  rationaleText: { fontSize: 14, lineHeight: 20, color: '#F9FAFB', textAlign: 'center' },
  photoTaken: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoTakenBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
  },
  photoTakenBadgeText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  photoTakenText: { fontSize: 15, color: '#FFFFFF' },
  noticeCard: { borderRadius: 12, padding: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', gap: 6 },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  fixtureBadge: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  errorCard: { borderRadius: 10, padding: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { fontSize: 13, lineHeight: 18, color: '#991B1B' },
  actions: { gap: 8 },
  navRow: { flexDirection: 'row', gap: 8 },
  navButton: { flex: 1 },
  primaryButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  secondaryButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'center' },
  linkButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  linkButtonText: { fontSize: 14, color: '#6B7280', textDecorationLine: 'underline' },
  buttonDisabled: { opacity: 0.5 },
});
