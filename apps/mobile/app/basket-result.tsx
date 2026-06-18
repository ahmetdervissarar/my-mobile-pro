import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { BasketEvaluateResponse } from '../src/api/basketClient';

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

function formatScore(value: number | null): string {
  return typeof value === 'number' ? `${Math.round(value)}/100` : 'Hazırlanıyor';
}

function formatCoverage(value: BasketEvaluateResponse['basketProfile']['coverage']): string {
  if (value === 'full') {
    return 'Tam';
  }

  if (value === 'partial') {
    return 'Kısmi';
  }

  return 'Veri bekleniyor';
}

function formatMarketStatus(
  value: BasketEvaluateResponse['marketEvaluations']['status'],
): string {
  if (value === 'real') {
    return 'Gerçek veri';
  }

  if (value === 'demo') {
    return 'Örnek veri';
  }

  return 'Veri bekleniyor';
}

function getMarketStatusMessage(
  value: BasketEvaluateResponse['marketEvaluations']['status'],
): string {
  if (value === 'real') {
    return 'Market fiyatı ve bulunurluk verisi bağlı. Market sıralaması gösterilebilir.';
  }

  if (value === 'demo') {
    return 'Bu bölüm şu anda örnek verilerle çalışıyor. Gerçek fiyat gibi sunulmaz.';
  }

  return 'Market fiyatı ve bulunurluk verisi henüz bağlı değil. Bu nedenle market sıralaması gösterilmiyor.';
}

export default function BasketResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ result?: string }>();
  const result = parseBasketResult(getSingleParam(params.result));

  if (!result) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#fff',
          paddingHorizontal: 24,
          paddingTop: 32,
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

  return (
    <ScrollView
      style={{
        flex: 1,
        backgroundColor: '#fff',
      }}
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 32,
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
          {getMarketStatusMessage(marketEvaluations.status)}
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
