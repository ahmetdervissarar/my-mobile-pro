import { Text, View } from 'react-native';

import type { BasketEvaluateResponse, BasketMarketEvaluation } from '../../api/basketClient';
import { EmptyState } from '../../ui/EmptyState';
import { radii, spacing, useTheme } from '../../ui/theme';
import {
  formatAvailability,
  formatMarketStatus,
  formatPriceEstimate,
  formatScore,
  getMarketStatusMessage,
  sortMarketsForDisplay,
} from './helpers';

export interface PriceTabProps {
  marketEvaluations: BasketEvaluateResponse['marketEvaluations'] | null;
}

function MarketHighlightCard({
  title,
  market,
  helper,
}: {
  title: string;
  market: BasketMarketEvaluation;
  helper: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.line,
        padding: spacing.md,
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: colors.pine2, textTransform: 'uppercase' }}>
        {title}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink }}>{market.name}</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{formatPriceEstimate(market)}</Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.muted }}>
        {helper} · {formatAvailability(market)}
      </Text>
    </View>
  );
}

export function PriceTab({ marketEvaluations }: PriceTabProps) {
  const { colors } = useTheme();

  if (!marketEvaluations) {
    return <EmptyState title="Market fiyatları hesaplanıyor..." />;
  }

  const cheapestMarket = marketEvaluations.markets.find((m) => m.marketId === marketEvaluations.cheapestMarketId);
  const bestRafScoreMarket = marketEvaluations.markets.find((m) => m.marketId === marketEvaluations.bestRafScoreMarketId);
  const sortedMarkets = sortMarketsForDisplay(marketEvaluations.markets);

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
        Durum: {formatMarketStatus(marketEvaluations.status)}
      </Text>
      <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>
        {getMarketStatusMessage(marketEvaluations)}
      </Text>

      {cheapestMarket ? (
        <MarketHighlightCard title="En uygun tam sepet" market={cheapestMarket} helper="Eksik ürün yok" />
      ) : null}

      {bestRafScoreMarket && bestRafScoreMarket.marketId !== cheapestMarket?.marketId ? (
        <MarketHighlightCard
          title="En iyi sepet skoru"
          market={bestRafScoreMarket}
          helper={`Sepet skoru: ${formatScore(bestRafScoreMarket.marketBasketRafSkoru)}`}
        />
      ) : null}

      {marketEvaluations.status === 'insufficient_data' ? (
        <View style={{ borderRadius: radii.md, backgroundColor: colors.warnBg, padding: spacing.md, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.warn }}>Market sıralaması yapılmadı</Text>
          <Text style={{ fontSize: 12, color: colors.warn, lineHeight: 17 }}>
            Eksik ürün olan marketler yanlış biçimde "en ucuz" gösterilmez.
          </Text>
        </View>
      ) : null}

      {sortedMarkets.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted }}>Market kapsamı</Text>

          {sortedMarkets.slice(0, 8).map((market) => (
            <View
              key={market.marketId}
              style={{
                borderRadius: radii.sm,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.surface,
                padding: spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink }}>{market.name}</Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: market.priceEstimate ? colors.ink : colors.muted,
                  }}
                >
                  {formatPriceEstimate(market)}
                </Text>
              </View>
              <Text style={{ fontSize: 11.5, color: colors.muted, marginTop: 2 }}>
                {formatAvailability(market)}
                {market.availability.missing.length > 0
                  ? ` · Eksik: ${market.availability.missing.slice(0, 2).join(', ')}`
                  : ' · Tam kapsam'}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
