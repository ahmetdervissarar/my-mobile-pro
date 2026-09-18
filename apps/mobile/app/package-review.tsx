/**
 * RafSkoru — İnsan alan incelemesi ekranı (Aşama 6, ADR-005).
 * app/package-review.tsx
 *
 * Katkı taslağındaki aday alanlar fotoğrafla yan yana gösterilir; her alan için Doğrula / Düzelt /
 * Okunamıyor. Sonuç `locally_reviewed_candidate`: doğrulanmış ürün DEĞİLDİR, alerjen kararına ve
 * skorlara girmez, hiçbir yere gönderilmez. Bilgi hiyerarşisi: alerjen → kimlik/eşleşme → alanlar →
 * kaynak/gözlem → eksik/çatışma → sonraki eylem. `product-result.tsx` büyütülmez; akış buradadır.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { isLocalProductRecoveryEnabled } from '../src/localProduct/featureFlag';
import { loadLatestContributionDraft } from '../src/localProduct/contributionDraftStorage';
import { PHOTO_TEMPORARY_STORAGE_NOTICE } from '../src/localProduct/contributionDraft';
import { isValidGtin } from '../src/localProduct/gtin';
import { applyHumanFieldChecks, buildReviewItems, isReviewComplete, summarizeReviewedRecord } from '../src/localProduct/resolution/review';
import type { FieldDecisionInput, ReviewDecisions } from '../src/localProduct/resolution/review';
import { loadLatestReviewedRecord, saveLocallyReviewedRecord } from '../src/localProduct/resolution/reviewStorage';
import { createContributionDraftProvider, createVerifiedLocalProvider, emptyVerifiedLocalStore } from '../src/localProduct/resolution/providers';
import { runProductResolution } from '../src/localProduct/resolution/resolve';
import type { LocallyReviewedRecord, ProductResolutionAttempt, ResolutionUiState } from '../src/localProduct/resolution/types';
import { deriveResolutionUiState } from '../src/localProduct/resolution/uiState';
import { AllergenReviewBlock } from '../src/localProduct/review/AllergenReviewBlock';
import { ResolutionStateBanner } from '../src/localProduct/review/ResolutionStateBanner';
import { ReviewFieldCard } from '../src/localProduct/review/ReviewFieldCard';
import type { ContributionDraft, DraftTextField } from '../src/localProduct/types';
import { loadUserSensitivityProfile } from '../src/userProfile/userProfileStorage';
import { emptyUserSensitivityProfile } from '../src/userProfile/userProfileTypes';
import type { UserSensitivityProfile } from '../src/userProfile/userProfileTypes';

export default function PackageReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ gtin?: string }>();
  const gtin = typeof params.gtin === 'string' && isValidGtin(params.gtin) ? params.gtin : null;

  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<ContributionDraft | null>(null);
  const [attempt, setAttempt] = useState<ProductResolutionAttempt | null>(null);
  const [existingReview, setExistingReview] = useState<LocallyReviewedRecord | null>(null);
  const [decisions, setDecisions] = useState<ReviewDecisions>({});
  const [savedRecord, setSavedRecord] = useState<LocallyReviewedRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    const [loadedDraft, loadedReview] = await Promise.all([loadLatestContributionDraft(gtin), loadLatestReviewedRecord(gtin)]);
    setDraft(loadedDraft);
    setExistingReview(loadedReview);
    // OFF kaynağı bu ekranda yeniden sorgulanmaz (ürün sonuç ekranı zaten backend'den aldı); burada
    // yalnız cihazdaki kaynaklar (taslak + boş doğrulanmış depo) çözümlenir. Üretici kaynağı uygulanmadı.
    const resolved = await runProductResolution(
      { gtin, identityHint: null },
      [createVerifiedLocalProvider(emptyVerifiedLocalStore), createContributionDraftProvider(async () => loadedDraft)],
      { now: () => new Date().toISOString(), review: loadedReview, hasPackagingPhotos: (loadedDraft?.photos.length ?? 0) > 0 },
    );
    setAttempt(resolved);
    setIsLoading(false);
  }, [gtin]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => (draft ? buildReviewItems(draft, attempt?.merged ?? null) : []), [draft, attempt]);
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

  const handleSave = async () => {
    if (!draft || isSaving || !complete) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const record = applyHumanFieldChecks(draft, decisions, new Date().toISOString());
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

  const allergenItem = items.find((i) => i.isAllergen) ?? null;
  const merged = attempt?.merged ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">
        Alan alan inceleme
      </Text>
      <ResolutionStateBanner state={uiState} />

      {/* 1. Alerjen kapısı */}
      <AllergenReviewBlock
        candidateText={allergenItem?.candidateText ?? null}
        hasAllergenPhoto={Boolean(allergenItem?.photo)}
        profileAllergens={userProfile.allergens}
      />

      {/* 2. Ürün kimliği ve eşleşme düzeyi */}
      <View style={styles.section} accessible accessibilityLabel={`Barkod ${gtin ?? 'yok'}. Eşleşme: ${merged?.matchLevel === 'exact_gtin' ? 'aynı barkod' : 'yok'}`}>
        <Text style={styles.sectionTitle}>Ürün kimliği</Text>
        <Text style={styles.body}>Barkod: {gtin ?? 'geçersiz / yok'}</Text>
        <Text style={styles.body}>
          Eşleşme: {merged?.matchLevel === 'exact_gtin' ? 'aynı barkod (taslak bu barkoda ait)' : merged?.matchLevel === 'candidate_no_gtin' ? 'yalnız aday (barkodsuz)' : 'kayıt yok'}
        </Text>
      </View>

      {savedRecord ? (
        <View style={styles.section} accessible accessibilityLabel="İnceleme özeti">
          {summarizeReviewedRecord(savedRecord).map((line) => (
            <Text key={line} style={styles.body}>
              • {line}
            </Text>
          ))}
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
            <ReviewFieldCard key={item.field} item={item} decision={decisions[item.field]} onDecision={(d) => setDecision(item.field, d)} />
          ))}

          {/* 4. Kaynak ve gözlem tarihi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kaynak ve gözlem</Text>
            <Text style={styles.body}>Kaynak: kullanıcı ambalaj fotoğrafı ve elle yazılan aday metin (doğrulanmamış).</Text>
            <Text style={styles.body}>Gözlem zamanı: {draft?.observedAt ?? 'fotoğraf yok'}</Text>
            <Text style={styles.body}>Ambalaj sürümü: {draft?.packagingVersion ?? 'belirtilmedi'}</Text>
            {draft && draft.photos.length > 0 ? <Text style={styles.helper}>{PHOTO_TEMPORARY_STORAGE_NOTICE}</Text> : null}
            {attempt?.providerResults.map((r) => (
              <Text key={r.providerId} style={styles.helper}>
                {r.providerId === 'off' ? 'Open Food Facts' : r.providerId === 'verified_local' ? 'Doğrulanmış yerel kayıt' : r.providerId === 'contribution_draft' ? 'Cihazdaki taslak' : 'Üretici resmî kaynağı'}
                : {r.status === 'ok' ? 'aday var' : r.reason ?? r.status}
              </Text>
            ))}
          </View>

          {/* 5. Eksik / çatışmalı alanlar */}
          {merged ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Eksik ve çatışmalı alanlar</Text>
              <Text style={styles.body}>Eksik: {merged.missingFields.length > 0 ? merged.missingFields.length + ' alan (tahminle doldurulmaz)' : 'yok'}</Text>
              {merged.conflicts.length > 0 ? merged.conflicts.map((c) => (
                <Text key={c.field} style={styles.warn}>
                  ≠ {c.field}: {c.note}
                </Text>
              )) : (
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
            accessibilityLabel={isSaving ? 'Kaydediliyor' : 'Yerel aday olarak kaydet'}
            accessibilityState={{ disabled: !complete || isSaving }}
            disabled={!complete || isSaving}
            onPress={() => void handleSave()}
          >
            <Text style={styles.primaryButtonText}>{isSaving ? 'Kaydediliyor...' : 'Yerel aday olarak kaydet (doğrulanmış değil)'}</Text>
          </Pressable>
          {!complete ? <Text style={styles.helper}>Kaydetmek için her alan için bir karar verin.</Text> : null}
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
  section: { borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  body: { fontSize: 15, lineHeight: 21, color: '#374151' },
  helper: { fontSize: 13, lineHeight: 18, color: '#6B7280' },
  warn: { fontSize: 13, lineHeight: 18, color: '#92400E' },
  errorCard: { borderRadius: 10, padding: 10, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  errorText: { fontSize: 13, lineHeight: 18, color: '#991B1B' },
  primaryButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#111827' },
  primaryButtonText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  secondaryButton: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF' },
  secondaryButtonText: { fontSize: 15, fontWeight: '600', color: '#111827', textAlign: 'center' },
  buttonDisabled: { opacity: 0.5 },
});
