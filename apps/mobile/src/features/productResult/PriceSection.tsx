import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatPriceForDisplay, priceStatusLabel } from '../../price/priceClient';
import {
  getPriceScoreConfidenceText,
  getPriceScoreDisplayValue,
  getPriceScoreStatusText,
} from '../../price/priceScoreDisplay';
import type { EnrichedMarketOffer, PriceResolveResponse } from '../../price/types';
import { radii, spacing, useTheme } from '../../ui/theme';
import {
  formatOfferDistanceLabel,
  formatOfferStoreLabel,
  getPriceConfidenceBadge,
  getPriceSourceMetaText,
  isSameOffer,
  type PriceConfidenceBadgeTone,
} from './helpers';

export interface PriceSectionProps {
  isPriceLoading: boolean;
  priceResult: PriceResolveResponse['result'] | null;
  priceDisclaimer: string;
  priceError: string | null;
  fallbackPriceText: string;
}

function badgeColors(
  tone: PriceConfidenceBadgeTone,
  colors: ReturnType<typeof useTheme>['colors'],
): { bg: string; fg: string } {
  if (tone === 'live') return { bg: colors.soft, fg: colors.leaf };
  if (tone === 'recent') return { bg: colors.infoBg, fg: colors.info };
  if (tone === 'missing') return { bg: colors.soft, fg: colors.muted };
  return { bg: colors.warnBg, fg: colors.warn };
}

/** "Fiyatlar" — en iyi fiyat, kaynak/tarih ve diğer market seçenekleri. */
export function PriceSection({
  isPriceLoading,
  priceResult,
  priceDisclaimer,
  priceError,
  fallbackPriceText,
}: PriceSectionProps) {
  const { colors } = useTheme();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (isPriceLoading && !priceResult) {
    return (
      <View style={{ borderRadius: radii.md, backgroundColor: colors.soft, padding: spacing.md }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>Fiyatlar sorgulanıyor...</Text>
      </View>
    );
  }

  if (!priceResult) {
    return (
      <View style={{ borderRadius: radii.md, backgroundColor: colors.soft, padding: spacing.md }}>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {fallbackPriceText || 'Fiyat bilgisi henüz hazır değil.'}
        </Text>
      </View>
    );
  }

  const bestOffer = priceResult.bestOffer ?? null;
  const offerOptions = priceResult.offers ?? [];
  const otherOffers: EnrichedMarketOffer[] = bestOffer
    ? offerOptions.filter((offer) => !isSameOffer(offer, bestOffer)).slice(0, 5)
    : offerOptions.slice(1, 6);
  const fallbackMarketPrices = priceResult.marketPrices ?? [];
  const badge = getPriceConfidenceBadge(priceResult);
  const badgeStyle = badgeColors(badge.tone, colors);
  const sourceMetaText = getPriceSourceMetaText(priceResult);
  const hasPrice = priceResult.price !== null;

  return (
    <View
      style={{
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
        padding: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>EN İYİ FİYAT</Text>
        <View
          style={{
            borderRadius: radii.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 3,
            backgroundColor: badgeStyle.bg,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: badgeStyle.fg }}>{badge.label}</Text>
        </View>
      </View>

      {hasPrice ? (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink, flex: 1 }} numberOfLines={1}>
              {bestOffer ? formatOfferStoreLabel(bestOffer) : priceResult.marketName}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.pine }}>
              {formatPriceForDisplay(bestOffer?.price ?? priceResult.price, bestOffer?.currency ?? priceResult.currency)}
            </Text>
          </View>

          {bestOffer ? (
            <Text style={{ fontSize: 12.5, color: colors.muted }}>{formatOfferDistanceLabel(bestOffer)}</Text>
          ) : null}
        </>
      ) : (
        <Text style={{ fontSize: 13, color: colors.muted }}>Bu ürün için fiyat verisi bulunamadı.</Text>
      )}

      <Text style={{ fontSize: 12, color: colors.muted }}>{sourceMetaText}</Text>

      <View style={{ borderRadius: radii.sm, backgroundColor: colors.soft, padding: spacing.sm }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }}>
          Fiyat Skoru: {getPriceScoreDisplayValue(priceResult.priceScore)}
        </Text>
        <Text style={{ fontSize: 11.5, color: colors.muted }}>{getPriceScoreStatusText(priceResult.priceScore)}</Text>
      </View>

      <Pressable
        onPress={() => setIsDetailsOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={isDetailsOpen ? 'Fiyat detaylarını gizle' : 'Fiyat detaylarını göster'}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.pine2 }}>
          {isDetailsOpen ? 'Detayları gizle' : 'Detayları göster'}
        </Text>
      </Pressable>

      {isDetailsOpen ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {getPriceScoreConfidenceText(priceResult.priceScore)}
          </Text>

          {bestOffer && otherOffers.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Diğer marketler</Text>
              {otherOffers.map((offer, index) => (
                <View
                  key={`${offer.chainCode}-${offer.displayName}-${offer.price}-${index}`}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 6,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.line,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
                      {formatOfferStoreLabel(offer)}
                    </Text>
                    <Text style={{ fontSize: 11.5, color: colors.muted }}>{formatOfferDistanceLabel(offer)}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                    {formatPriceForDisplay(offer.price, offer.currency)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {!bestOffer && fallbackMarketPrices.length > 1 ? (
            <View style={{ gap: 2 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Diğer fiyat seçenekleri</Text>
              {fallbackMarketPrices.slice(1, 6).map((marketOption, index) => (
                <Text key={`${marketOption.marketName}-${marketOption.price}-${index}`} style={{ fontSize: 12.5, color: colors.muted }}>
                  {marketOption.marketName} · {formatPriceForDisplay(marketOption.price, marketOption.currency)}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={{ fontSize: 11.5, color: colors.muted }}>
            {priceStatusLabel(priceResult.status)}
            {priceResult.updatedAt ? ` · Güncelleme: ${priceResult.updatedAt}` : ''}
          </Text>

          {priceResult.note ? <Text style={{ fontSize: 11.5, color: colors.muted }}>{priceResult.note}</Text> : null}

          <Text style={{ fontSize: 11.5, color: colors.muted }}>{priceDisclaimer}</Text>
        </View>
      ) : null}

      {priceError ? <Text style={{ fontSize: 12, color: colors.danger }}>{priceError}</Text> : null}
    </View>
  );
}
