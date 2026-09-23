import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BasketEvaluateResponse, BasketMarketEvaluation } from '../src/api/basketClient';

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function parseBasketResult(value: string): BasketEvaluateResponse | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as BasketEvaluateResponse;
  } catch {
    return null;
  }
}

function formatScore(value: number | null | undefined): string {
  return typeof value === 'number' ? `${Math.round(value)}/100` : 'Hazırlanıyor';
}

function formatCoverage(value: BasketEvaluateResponse['basketProfile']['coverage']): string {
  if (value === 'full') return 'Tam';
  if (value === 'partial') return 'Kısmi';

  return 'Veri bekleniyor';
}

function formatMarketStatus(
  value: BasketEvaluateResponse['marketEvaluations']['status'],
): string {
  if (value === 'real') return 'Gerçek veri';
  if (value === 'demo') return 'Beta fiyat verisi';

  return 'Veri yetersiz';
}

function getMarketStatusMessage(
  marketEvaluations: BasketEvaluateResponse['marketEvaluations'],
): string {
  if (marketEvaluations.status === 'real') {
    return 'Market fiyatı ve bulunurluk verisi bağlı. Tam kapsamlı marketler karşılaştırılıyor.';
  }

  if (marketEvaluations.status === 'demo') {
    return 'Bu bölüm beta fiyat verisiyle çalışıyor. Eksik ürün olan marketler en ucuz market olarak seçilmez.';
  }

  return (
    marketEvaluations.insufficientDataReason ??
    'Hiçbir market sepetin tamamı için yeterli fiyat verisi sunmadı.'
  );
}

function formatPriceEstimate(market: BasketMarketEvaluation): string {
  if (!market.priceEstimate) {
    return 'Tam sepet fiyatı yok';
  }

  const formatted = market.priceEstimate.amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatted} TL`;
}

function formatAvailability(market: BasketMarketEvaluation): string {
  return `${market.availability.available}/${market.availability.total} ürün fiyatlandı`;
}

function sortMarketsForDisplay(
  markets: BasketMarketEvaluation[],
): BasketMarketEvaluation[] {
  return [...markets].sort((a, b) => {
    const aHasFullPrice = a.priceEstimate ? 1 : 0;
    const bHasFullPrice = b.priceEstimate ? 1 : 0;

    if (aHasFullPrice !== bHasFullPrice) {
      return bHasFullPrice - aHasFullPrice;
    }

    const aPrice = a.priceEstimate?.amount ?? Number.POSITIVE_INFINITY;
    const bPrice = b.priceEstimate?.amount ?? Number.POSITIVE_INFINITY;

    if (aPrice !== bPrice) {
      return aPrice - bPrice;
    }

    return a.name.localeCompare(b.name, 'tr-TR');
  });
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
  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 14,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
        padding: 14,
      }}
    >
      <Text
        style={{
          color: '#4338CA',
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>

      <View
        style={{
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Text
          style={{
            flex: 1,
            color: '#111827',
            fontSize: 16,
            fontWeight: '800',
          }}
        >
          {market.name}
        </Text>

        <Text
          style={{
            color: '#111827',
            fontSize: 20,
            fontWeight: '900',
          }}
        >
          {formatPriceEstimate(market)}
        </Text>
      </View>

      <Text
        style={{
          marginTop: 6,
          color: '#4F46E5',
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {helper} • {formatAvailability(market)}
      </Text>
    </View>
  );
}

export default function BasketResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ result?: string }>();
  const result = parseBasketResult(getSingleParam(params.result));

  if (!result) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#fff',
          paddingHorizontal: 24,
          paddingTop: Math.max(insets.top, 32),
        }}
      >
        <Text
          style={{
            color: '#111827',
            fontSize: 24,
            fontWeight: '800',
          }}
        >
          Sepet sonucu bulunamadı
        </Text>

        <Text
          style={{
            marginTop: 10,
            color: '#6B7280',
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          Sepet sonucu okunamadı. Sepete dönüp tekrar deneyebilirsin.
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 20,
            borderRadius: 12,
            backgroundColor: '#111827',
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            Geri dön
          </Text>
        </Pressable>
      </View>
    );
  }

  const { basketProfile, marketEvaluations } = result;
  const cheapestMarket = marketEvaluations.markets.find(
    (market) => market.marketId === marketEvaluations.cheapestMarketId,
  );
  const bestRafScoreMarket = marketEvaluations.markets.find(
    (market) => market.marketId === marketEvaluations.bestRafScoreMarketId,
  );
  const sortedMarkets = sortMarketsForDisplay(marketEvaluations.markets);

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#fff',
      }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: Math.max(insets.top, 32),
        paddingBottom: 40,
      }}
    >
      <Text
        style={{
          color: '#6B7280',
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Sepet sonucu
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: '#111827',
          fontSize: 32,
          fontWeight: '800',
        }}
      >
        Sepet RafSkoru
      </Text>

      <View
        style={{
          marginTop: 20,
          borderRadius: 18,
          backgroundColor: '#F9FAFB',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          padding: 18,
        }}
      >
        <Text
          style={{
            color: '#111827',
            fontSize: basketProfile.basketRafSkoru === null ? 30 : 36,
            fontWeight: '900',
          }}
        >
          {formatScore(basketProfile.basketRafSkoru)}
        </Text>

        <Text
          style={{
            marginTop: 6,
            color: '#6B7280',
            fontSize: 13,
          }}
        >
          Kapsam: {formatCoverage(basketProfile.coverage)} • Ürün sayısı:{' '}
          {basketProfile.itemCount}
        </Text>

        {basketProfile.basketRafSkoru === null ? (
          <Text
            style={{
              marginTop: 10,
              color: '#4B5563',
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Bu sepet için skor altyapısı hazır. Gerçek ürün ve market verisi
            bağlandığında burada sepet skoru gösterilecek.
          </Text>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 18,
          gap: 10,
        }}
      >
        {basketProfile.perItem.map((item) => (
          <View
            key={`${item.type}:${item.productGroupKey}:${item.label}`}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 14,
            }}
          >
            <Text
              style={{
                color: '#111827',
                fontSize: 15,
                fontWeight: '700',
              }}
            >
              {item.label}
            </Text>

            <Text
              style={{
                marginTop: 5,
                color: '#6B7280',
                fontSize: 12,
              }}
            >
              {item.type === 'product_group' ? 'Kategori niyeti' : 'Ürün'} •{' '}
              {item.score === null ? 'Skor hazırlanıyor' : formatScore(item.score)}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={{
          marginTop: 20,
          borderRadius: 16,
          backgroundColor: '#EEF2FF',
          padding: 16,
        }}
      >
        <Text
          style={{
            color: '#3730A3',
            fontSize: 15,
            fontWeight: '800',
          }}
        >
          Market değerlendirmesi
        </Text>

        <Text
          style={{
            marginTop: 6,
            color: '#4338CA',
            fontSize: 13,
            fontWeight: '700',
          }}
        >
          Durum: {formatMarketStatus(marketEvaluations.status)}
        </Text>

        <Text
          style={{
            marginTop: 6,
            color: '#4338CA',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {getMarketStatusMessage(marketEvaluations)}
        </Text>

        {cheapestMarket ? (
          <MarketHighlightCard
            title="En ucuz tam sepet"
            market={cheapestMarket}
            helper="Eksik ürün yok"
          />
        ) : null}

        {bestRafScoreMarket && bestRafScoreMarket.marketId !== cheapestMarket?.marketId ? (
          <MarketHighlightCard
            title="En iyi sepet skoru"
            market={bestRafScoreMarket}
            helper={`Sepet skoru: ${formatScore(bestRafScoreMarket.marketBasketRafSkoru)}`}
          />
        ) : null}

        {marketEvaluations.status === 'insufficient_data' ? (
          <View
            style={{
              marginTop: 12,
              borderRadius: 14,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#C7D2FE',
              padding: 14,
            }}
          >
            <Text
              style={{
                color: '#3730A3',
                fontSize: 13,
                fontWeight: '800',
              }}
            >
              Market sıralaması yapılmadı
            </Text>
            <Text
              style={{
                marginTop: 6,
                color: '#4338CA',
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Eksik ürün olan marketler yanlış biçimde “en ucuz” gösterilmez.
            </Text>
          </View>
        ) : null}

        {sortedMarkets.length > 0 ? (
          <View
            style={{
              marginTop: 14,
              gap: 8,
            }}
          >
            <Text
              style={{
                color: '#3730A3',
                fontSize: 13,
                fontWeight: '800',
              }}
            >
              Market kapsamı
            </Text>

            {sortedMarkets.slice(0, 5).map((market) => (
              <View
                key={market.marketId}
                style={{
                  borderRadius: 12,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E0E7FF',
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: '#111827',
                      fontSize: 13,
                      fontWeight: '800',
                    }}
                  >
                    {market.name}
                  </Text>

                  <Text
                    style={{
                      color: market.priceEstimate ? '#111827' : '#6B7280',
                      fontSize: 13,
                      fontWeight: '800',
                    }}
                  >
                    {formatPriceEstimate(market)}
                  </Text>
                </View>

                <Text
                  style={{
                    marginTop: 4,
                    color: '#4F46E5',
                    fontSize: 11,
                    lineHeight: 16,
                  }}
                >
                  {formatAvailability(market)}
                  {market.availability.missing.length > 0
                    ? ` • Eksik: ${market.availability.missing.slice(0, 2).join(', ')}`
                    : ' • Tam kapsam'}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View
        style={{
          marginTop: 14,
          borderRadius: 12,
          backgroundColor: '#F9FAFB',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          padding: 12,
        }}
      >
        <Text
          style={{
            color: '#374151',
            fontSize: 12,
            fontWeight: '800',
          }}
        >
          Kapalı beta veri notu
        </Text>
        <Text
          style={{
            marginTop: 5,
            color: '#6B7280',
            fontSize: 11,
            lineHeight: 16,
          }}
        >
          Sepet skorları yardımcı göstergedir. Konum yalnızca yakın market ve fiyat karşılaştırması için kullanılır; beta sürecinde sonuçlar ürün etiketi ve güncel market fiyatıyla kontrol edilmelidir.
        </Text>
      </View>
      <Pressable
        onPress={() => router.back()}
        style={{
          marginTop: 20,
          borderRadius: 12,
          backgroundColor: '#111827',
          paddingVertical: 14,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          Sepete dön
        </Text>
      </Pressable>
    </ScrollView>
  );
}