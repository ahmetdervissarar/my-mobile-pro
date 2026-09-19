/**
 * RafSkoru — İnsan alan incelemesi ekranı (Aşama 6 / 6B, ADR-005).
 * app/package-review.tsx
 *
 * OFF verisi bu ekrana mobil bir OFF çağrısıyla DEĞİL, ürün sonuç ekranının backend'den aldığı
 * `ProductFacts` snapshot'ıyla gelir (`productFactsSnapshot.ts`); snapshot yoksa mevcut backend ürün
 * çözümleme uç noktası (`PriceClient.resolve`, aynı sözleşme) kullanılır. Her alan kartı: mevcut kayıt →
 * ambalaj adayı → durum → karar. Sonuç `locally_reviewed_candidate`: doğrulanmış ürün DEĞİLDİR, alerjen
 * kararına ve skorlara girmez, hiçbir yere gönderilmez. Alerjen bloğu en üstte; "incelenen / toplam"
 * ilerlemesi üstte. Teknik sağlayıcı adı kullanıcıya gösterilmez. `product-result.tsx` büyütülmez.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { isLocalProductRecoveryEnabled } from '../src/localProduct/featureFlag';
import { deleteContributionDraft, loadLatestContributionDraft } from '../src/localProduct/contributionDraftStorage';
import { PHOTO_PERSISTENT_STORAGE_NOTICE, PHOTO_TEMPORARY_STORAGE_NOTICE, hasPersistentPhotos } from '../src/localProduct/contributionDraft';
import { isValidGtin } from '../src/localProduct/gtin';
import { deleteDraftPhotos } from '../src/localProduct/photoStorage';
import { isSnapshotFresh, loadProductFactsSnapshot, saveProductFactsSnapshot } from '../src/localProduct/productFactsSnapshot';
import { applyHumanFieldChecks, buildReviewItems, computeReviewProgress, isReviewComplete, summarizeReviewedRecord } from '../src/localProduct/resolution/review';
import type { FieldDecisionInput, ReviewDecisions } from '../src/localProduct/resolution/review';
import { deleteReviewedRecordsForDraft, loadLatestReviewedRecord, saveLocallyReviewedRecord } from '../src/localProduct/resolution/reviewStorage';
import { createContributionDraftProvider, createOffProvider, createVerifiedLocalProvider, emptyVerifiedLocalStore } from '../src/localProduct/resolution/providers';
import { runProductResolution } from '../src/localProduct/resolution/resolve';
import type { LocallyReviewedRecord, ProductResolutionAttempt, ResolutionUiState } from '../src/localProduct/resolution/types';
import { deriveResolutionUiState } from '../src/localProduct/resolution/uiState';
import { AllergenReviewBlock } from '../src/localProduct/review/AllergenReviewBlock';
import { ResolutionStateBanner } from '../src/localProduct/review/ResolutionStateBanner';
import { ReviewFieldCard } from '../src/localProduct/review/ReviewFieldCard';
import type { ContributionDraft, DraftTextField, ProductFactsWire } from '../src/localProduct/types';
import type { OcrRunResult } from '../src/localProduct/ocr/types';
import { PriceClient } from '../src/price/priceClient';
import { loadUserSensitivityProfile } from '../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../src/userProfile/userProfileTypes';

/**
 * - snapshot: 24 saatten yeni cihaz kaydı (ürün sonuç ekranının aldığı AYNI kayıt).
 * - backend_resolve: snapshot yok/eski → mevcut backend çözümleme uç noktası OFF kaynaklı kayıt döndürdü.
 * - stale_snapshot: backend yenileyemedi; 24 saatten eski cihaz kaydı "eski cihaz kaydı" etiketiyle kullanılır,
 *   güncel kayıt gibi GÖSTERİLMEZ.
 * - none: hiçbir OFF kaynaklı kayıt yok (backend OFF dışı bir kayıt döndürdüyse de none).
 */
type OffSourcePath = 'snapshot' | 'backend_resolve' | 'stale_snapshot' | 'none';

interface OffFactsLoad {
  facts: ProductFactsWire | null;
  path: OffSourcePath;
  snapshotSavedAt: string | null;
}

const priceClient = new PriceClient();

async function resolveFromBackend(gtin: string): Promise<ProductFactsWire | null> {
  try {
    const response = await priceClient.resolve({ barcode: gtin, productName: undefined });
    const facts = (response.result.productFacts ?? null) as ProductFactsWire | null;
    return facts && facts.dataSource === 'off' ? facts : null;
  } catch {
    return null;
  }
}

/** Mobil OFF'a doğrudan çağrı yapmaz; ikinci bir ürün veri modeli yoktur. */
async function loadOffFacts(gtin: string): Promise<OffFactsLoad> {
  const snapshot = await loadProductFactsSnapshot(gtin);
  if (snapshot && isSnapshotFresh(snapshot)) return { facts: snapshot.facts, path: 'snapshot', snapshotSavedAt: snapshot.savedAt };
  const refreshed = await resolveFromBackend(gtin);
  if (refreshed) {
    void saveProductFactsSnapshot(gtin, refreshed);
    return { facts: refreshed, path: 'backend_resolve', snapshotSavedAt: null };
  }
  if (snapshot) return { facts: snapshot.facts, path: 'stale_snapshot', snapshotSavedAt: snapshot.savedAt };
  return { facts: null, path: 'none', snapshotSavedAt: null };
}

function formatIso(iso: string | null): string {
  if (!iso) return 'yok';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]}` : iso;
}

export default function PackageReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gtin?: string }>();
  const gtin = typeof params.gtin === 'string' && isValidGtin(params.gtin) ? params.gtin : null;

  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<ContributionDraft | null>(null);
  const [attempt, setAttempt] = useState<ProductResolutionAttempt | null>(null);
  const [offPath, setOffPath] = useState<OffSourcePath>('none');
  const [offSavedAt, setOffSavedAt] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<LocallyReviewedRecord | null>(null);
  const [decisions, setDecisions] = useState<ReviewDecisions>({});
  // Alan bazında ham OCR sonucu (Aşama 7, düzeltme turu) — bileşen ağacında değil, burada kalıcı
  // tutulur; kaydedilirken applyHumanFieldChecks'e geçirilip inceleme kaydına yazılır.
  const [ocrResults, setOcrResults] = useState<Partial<Record<DraftTextField, OcrRunResult>>>({});
  const [savedRecord, setSavedRecord] = useState<LocallyReviewedRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'done' | 'error'>('idle');
  const [userProfile, setUserProfile] = useState<UserSensitivityProfile>(emptyUserSensitivityProfile);

  useEffect(() => {
    void loadUserSensitivityProfile().then(setUserProfile).catch(() => setUserProfile(emptyUserSensitivityProfile));
  }, []);

  const load = useCallback(async () => {
    if (!gtin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [loadedDraft, loadedReview, off] = await Promise.all([loadLatestContributionDraft(gtin), loadLatestReviewedRecord(gtin), loadOffFacts(gtin)]);
    setDraft(loadedDraft);
    setExistingReview(loadedReview);
    setOffPath(off.path);
    setOffSavedAt(off.snapshotSavedAt);
    const resolved = await runProductResolution(
      { gtin, identityHint: null },
      [
        createOffProvider(async () => off.facts),
        createVerifiedLocalProvider(emptyVerifiedLocalStore),
        createContributionDraftProvider(async () => loadedDraft),
      ],
      { now: () => new Date().toISOString(), review: loadedReview, hasPackagingPhotos: (loadedDraft?.photos.length ?? 0) > 0 },
    );
    setAttempt(resolved);
    setIsLoading(false);
  }, [gtin]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => (draft ? buildReviewItems(draft, attempt?.merged ?? null) : []), [draft, attempt]);
  const progress = computeReviewProgress(items, decisions);
  const complete = isReviewComplete(items, decisions);

  const uiState: ResolutionUiState = savedRecord
    ? deriveResolutionUiState({ attempt, isSearching: false, hasPackagingPhotos: (draft?.photos.length ?? 0) > 0, review: savedRecord })
    : isLoading
      ? 'searching_sources'
      : deriveResolutionUiState({ attempt, isSearching: false, hasPackagingPhotos: (draft?.photos.length ?? 0) > 0, review: existingReview });

  if (!isLocalProductRecoveryEnabled()) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Alan alan inceleme</Text>
        <Text style={styles.body}>Bu akış bu sürümde kapalı.</Text>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Geri dön" onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Geri dön</Text>
        </Pressable>
      </View>
    );
  }

  const setDecision = (field: DraftTextField, input: FieldDecisionInput) => setDecisions((current) => ({ ...current, [field]: input }));
  const setOcrResultForField = (field: DraftTextField, result: OcrRunResult) => setOcrResults((current) => ({ ...current, [field]: result }));

  const handleSave = async () => {
    if (!draft || isSaving || !complete) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const record = applyHumanFieldChecks(draft, decisions, new Date().toISOString(), ocrResults);
      const result = await saveLocallyReviewedRecord(record);
      if (!result.ok) {
        setSaveError(result.errorMessage ?? 'İnceleme kaydı kaydedilemedi. Tekrar deneyin.');
        return;
      }
      setSavedRecord(record);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!draft) return;
    const photosDeleted = deleteDraftPhotos(draft.id);
    const reviewsDeleted = await deleteReviewedRecordsForDraft(draft.id);
    const draftDeleted = await deleteContributionDraft(draft.id);
    if (photosDeleted && reviewsDeleted && draftDeleted) {
      setDraft(null);
      setSavedRecord(null);
      setExistingReview(null);
      setDecisions({});
      setOcrResults({});
      setDeleteState('done');
    } else {
      setDeleteState('error');
    }
  };

  const allergenItem = items.find((i) => i.isAllergen) ?? null;
  const merged = attempt?.merged ?? null;

  // "Taslağı ve fotoğrafları sil" hem inceleme sırasında hem kaydedilmiş aday özetinde erişilebilir kalır.
  const deleteControls =
    deleteState === 'confirm' ? (
      <View style={styles.errorCard}>
        <Text style={styles.errorText}>Taslak, inceleme kayıtları ve bu cihazdaki fotoğraf dosyaları silinecek. Geri alınamaz.</Text>
        <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.rowButton]} accessibilityRole="button" accessibilityLabel="Silmeyi iptal et" onPress={() => setDeleteState('idle')}>
            <Text style={styles.secondaryButtonText}>İptal</Text>
          </Pressable>
          <Pressable style={[styles.dangerButton, styles.rowButton]} accessibilityRole="button" accessibilityLabel="Taslağı ve fotoğrafları kalıcı olarak sil" onPress={() => void handleDelete()}>
            <Text style={styles.primaryButtonText}>Evet, sil</Text>
          </Pressable>
        </View>
      </View>
    ) : (
      <>
        <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Taslağı ve fotoğrafları sil" onPress={() => setDeleteState('confirm')}>
          <Text style={styles.secondaryButtonText}>Taslağı ve fotoğrafları sil</Text>
        </Pressable>
        {deleteState === 'error' ? <Text style={styles.warn}>Silme tamamlanamadı; bazı kayıtlar kalmış olabilir. Tekrar deneyin.</Text> : null}
      </>
    );
  const offCandidate = attempt?.candidates.find((c) => c.providerId === 'off') ?? null;
  const offStatusText =
    offPath === 'none'
      ? 'Open Food Facts kaynaklı kayıt yok: cihazda kayıt bulunmadı ve sunucudan alınamadı.'
      : !offCandidate
        ? 'Open Food Facts kaydı yetersiz; karşılaştırılacak alan yok.'
        : offPath === 'stale_snapshot'
          ? `ESKİ CİHAZ KAYDI: Open Food Facts kaydı ${formatIso(offSavedAt)} tarihinde alınmıştı; sunucudan yenilenemedi. Güncel kayıt olarak gösterilmez.`
          : offPath === 'snapshot'
            ? `Open Food Facts kaydı ürün sonuç ekranından alındı (cihaz kaydı: ${formatIso(offSavedAt)}, 24 saatten yeni).`
            : 'Open Food Facts kaydı sunucudan yenilendi.';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">
        Alan alan inceleme
      </Text>
      {draft && !savedRecord ? (
        <Text style={styles.progress} accessibilityLiveRegion="polite" accessibilityLabel={`İncelenen alan ${progress.decided} / ${progress.total}`} allowFontScaling>
          İncelenen alan: {progress.decided} / {progress.total}
        </Text>
      ) : null}
      <ResolutionStateBanner state={uiState} />

      {/* 1. Alerjen kapısı — her zaman en üstte */}
      <AllergenReviewBlock
        candidateText={allergenItem?.candidateText ?? null}
        hasAllergenPhoto={Boolean(allergenItem?.photo)}
        candidateDecision={decisions.allergenDeclaration?.decision ?? null}
        existingDeclarationText={allergenItem?.existingValueText ?? null}
        existingSourceLabel={allergenItem?.existingSourceLabel ?? null}
        profileAllergens={userProfile.allergens}
      />

      {/* 2. Ürün kimliği ve eşleşme düzeyi */}
      <View style={styles.section} accessible accessibilityLabel={`Barkod ${gtin ?? 'yok'}. Eşleşme: ${merged?.matchLevel === 'exact_gtin' ? 'aynı barkod' : 'yok'}. ${offStatusText}`}>
        <Text style={styles.sectionTitle}>Ürün kimliği</Text>
        <Text style={styles.body}>Barkod: {gtin ?? 'geçersiz / yok'}</Text>
        <Text style={styles.body}>
          Eşleşme: {merged?.matchLevel === 'exact_gtin' ? 'aynı barkod' : merged?.matchLevel === 'candidate_no_gtin' ? 'yalnız aday (barkodsuz)' : 'kayıt yok'}
        </Text>
        <Text style={styles.helper}>{offStatusText}</Text>
      </View>

      {savedRecord && draft ? (
        <View style={styles.section} accessible accessibilityLabel="İnceleme özeti">
          {summarizeReviewedRecord(savedRecord).map((line) => (
            <Text key={line} style={styles.body}>
              • {line}
            </Text>
          ))}
          <Pressable style={styles.primaryButton} accessibilityRole="button" accessibilityLabel="Ürün sonucuna dön" onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Ürün sonucuna dön</Text>
          </Pressable>
          {deleteControls}
        </View>
      ) : deleteState === 'done' ? (
        <View style={styles.section}>
          <Text style={styles.body}>Taslak, inceleme kayıtları ve fotoğraflar bu cihazdan silindi.</Text>
          <Pressable style={styles.primaryButton} accessibilityRole="button" accessibilityLabel="Ürün sonucuna dön" onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Ürün sonucuna dön</Text>
          </Pressable>
        </View>
      ) : !gtin ? (
        <Text style={styles.warn}>Geçerli bir barkod olmadan inceleme yapılamaz.</Text>
      ) : !draft && !isLoading ? (
        <View style={styles.section}>
          <Text style={styles.body}>Bu barkod için cihazda katkı taslağı yok. Önce paket fotoğraflarını çekin.</Text>
          <Pressable
            style={styles.primaryButton}
            accessibilityRole="button"
            accessibilityLabel="Paket bilgisini ekle"
            onPress={() => router.replace({ pathname: '/package-capture', params: { barcode: gtin } })}
          >
            <Text style={styles.primaryButtonText}>Paket bilgisini ekle</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* 3. Alanlar (alerjen alanı ilk sırada) */}
          {items.map((item) => (
            <ReviewFieldCard
              key={item.field}
              item={item}
              decision={decisions[item.field]}
              onDecision={(d) => setDecision(item.field, d)}
              ocrResult={ocrResults[item.field] ?? null}
              onOcrResult={(result) => setOcrResultForField(item.field, result)}
            />
          ))}

          {/* 4. Kaynak ve gözlem tarihi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kaynak ve gözlem</Text>
            <Text style={styles.body}>Ambalaj adayı: kullanıcı fotoğrafı ve elle yazılan metin (doğrulanmamış).</Text>
            <Text style={styles.body}>Ambalaj gözlem zamanı: {formatIso(draft?.observedAt ?? null)}</Text>
            <Text style={styles.body}>Ambalaj sürümü: {draft?.packagingVersion ?? 'belirtilmedi'}</Text>
            {offCandidate ? <Text style={styles.body}>Kayıtlı değerlerin kaynağı: Open Food Facts · alınma: {formatIso(offCandidate.fetchedAt)}</Text> : null}
            <Text style={styles.helper}>Doğrulanmış RafSkoru kaydı: bu sürümde yok. Üretici resmî kaynağı: bu sürümde bağlı değil.</Text>
            {draft && draft.photos.length > 0 ? (
              <Text style={styles.helper}>{hasPersistentPhotos(draft.photos) ? PHOTO_PERSISTENT_STORAGE_NOTICE : PHOTO_TEMPORARY_STORAGE_NOTICE}</Text>
            ) : null}
          </View>

          {/* 5. Eksik / çatışmalı alanlar */}
          {merged ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eksik ve çatışmalı alanlar</Text>
              <Text style={styles.body}>Eksik: {merged.missingFields.length > 0 ? `${merged.missingFields.length} alan (tahminle doldurulmaz)` : 'yok'}</Text>
              {merged.conflicts.length > 0 ? (
                merged.conflicts.map((c) => (
                  <Text key={c.field} style={styles.warn}>
                    ≠ Çatışma: {c.note}
                  </Text>
                ))
              ) : (
                <Text style={styles.body}>Çatışma: yok</Text>
              )}
            </View>
          ) : null}

          {/* 6. Sonraki eylem */}
          {saveError ? (
            <View style={styles.errorCard} accessible accessibilityLabel={`Kayıt hatası: ${saveError}`}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          ) : null}
          <Pressable
            style={[styles.primaryButton, !complete || isSaving ? styles.buttonDisabled : null]}
            accessibilityRole="button"
            accessibilityLabel={isSaving ? 'Kaydediliyor' : 'Yerel aday olarak kaydet. Doğrulanmış ürün değildir.'}
            accessibilityState={{ disabled: !complete || isSaving }}
            disabled={!complete || isSaving}
            onPress={() => void handleSave()}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Kaydediliyor...' : 'Yerel aday olarak kaydet — doğrulanmış ürün değildir.'}</Text>
          </Pressable>
          {!complete ? <Text style={styles.helper}>Kaydetmek için her alan için bir karar verin ({progress.decided} / {progress.total}).</Text> : null}

          {deleteControls}

          <Pressable style={styles.secondaryButton} accessibilityRole="button" accessibilityLabel="Vazgeç ve geri dön" onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Vazgeç</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12, backgroundColor: '#FFFFFF' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  progress: { fontSize: 14, fontWeight: '700', color: '#374151' },
  section: { borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  body: { fontSize: 15, lineHeight: 21, color: '#374151' },
  helper: { fontSize: 13, lineHeight: 18, color: '#6B7280' },
  warn: { fontSize: 13, lineHeight: 18, color: '#92400E' },
  errorCard: { borderRadius: 10, padding: 10, gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { fontSize: 13, lineHeight: 18, color: '#991B1B' },
  row: { flexDirection: 'row', gap: 8 },
  rowButton: { flex: 1 },
  primaryButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  dangerButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#991B1B' },
  secondaryButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'center' },
  buttonDisabled: { opacity: 0.5 },
});
