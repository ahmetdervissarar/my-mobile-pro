import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import type { AlternativeCandidate, AlternativeSection as AlternativeSectionData } from '../alternatives/buildAlternativeSections';
import { getAllergenBannerDataFromCatalog } from './helpers';
import { SearchResultRow } from '../search/SearchResultRow';
import { getSearchCardMetaLine } from '../search/searchCardPresentation';
import { spacing, useTheme } from '../../ui/theme';
import type { UserSensitivityProfile } from '../../userProfile/userProfileTypes';

export interface AlternativesSectionProps {
  sections: AlternativeSectionData[];
  userProfile: UserSensitivityProfile;
}

/**
 * "Alternatifler" — aynı grup içindeki, profille çakışmayan adaylar.
 * Hiç önerilecek bir şey yoksa bu bileşen DEĞİL, çağıran taraf (product-result.tsx)
 * bütün bölümü (CollapsibleSection dahil) hiç render etmemeli (bkz. görev
 * onayı, madde 4: boş "Alternatifler: Yok" kartı kalktı).
 */
export function AlternativesSection({ sections, userProfile }: AlternativesSectionProps) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={{ gap: spacing.md }}>
      {sections.map((section) => (
        <View key={section.key} style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.muted }}>{section.title}</Text>
          {section.items.map((candidate) => (
            <AlternativeCard
              key={candidate.productId}
              candidate={candidate}
              userProfile={userProfile}
              onPress={() => router.push({ pathname: '/product-result', params: { barcode: candidate.productId } })}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function AlternativeCard({
  candidate,
  userProfile,
  onPress,
}: {
  candidate: AlternativeCandidate;
  userProfile: UserSensitivityProfile;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  // Fail-closed eleme buildAlternativeSections.ts'te zaten yapıldı — burada
  // SearchResultRow'un AYNI çekirdeği (evaluateCatalogAllergenDataForProfile,
  // dolaylı) tekrar çağrılır, yalnız rozet/kenar rengini türetmek için
  // (riskWarnings:[] — kritik eşleşme zaten yukarıda elendi, burada hiç çıkmaz).
  const allergenBannerData = getAllergenBannerDataFromCatalog({
    catalogAllergenData: candidate.allergenData,
    userProfile,
    riskWarnings: [],
  });

  return (
    <View style={{ gap: 2 }}>
      <SearchResultRow
        name={candidate.name ?? 'Ürün'}
        imageUrl={candidate.imageUrl}
        metaLine={getSearchCardMetaLine({ brand: candidate.brand ?? undefined, packageSize: candidate.packageSize ?? undefined })}
        allergenData={allergenBannerData}
        rafScore={candidate.rafScore}
        nutriScoreGrade={candidate.nutriScore.grade}
        novaGroup={candidate.nova.group}
        showNutriNova
        onPress={onPress}
      />
      {/* Sıralama güveni (görev onayı, madde 1): puanın hangi bileşenlerden
          geldiği her zaman kartta görünür — "daha iyi" denemeyecek ölçümler
          sessizce gizlenmesin. */}
      <Text style={{ fontSize: 11, color: colors.muted, paddingHorizontal: spacing.sm }}>
        Puan kapsamı: {candidate.scoreCoverageLabel}
      </Text>
    </View>
  );
}
