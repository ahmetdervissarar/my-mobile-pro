import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  evaluateBasket,
  type BasketEvaluateResponse,
  type BasketItem,
} from '../src/api/basketClient';

const INITIAL_ITEMS: BasketItem[] = [
  {
    type: 'product_group',
    productGroupKey: 'rice',
    label: 'Pirinç',
    quantity: { amount: 1, unit: 'kilogram' },
  },
  {
    type: 'product_group',
    productGroupKey: 'milk',
    label: 'Süt',
    quantity: { amount: 1, unit: 'liter' },
  },
];

export default function BasketScreen() {
  const router = useRouter();
  const [items] = useState<BasketItem[]>(INITIAL_ITEMS);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setErrorMessage(null);

    try {
      const result: BasketEvaluateResponse = await evaluateBasket({ items });

      router.push({
        pathname: '/basket-result',
        params: {
          result: JSON.stringify(result),
        },
      });
    } catch {
      setErrorMessage('Sepet değerlendirmesi şu anda tamamlanamadı.');
    } finally {
      setIsEvaluating(false);
    }
  };

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
        Deneysel modül
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: '#111827',
          fontSize: 32,
          fontWeight: '800',
        }}
      >
        Sepet Oluştur
      </Text>

      <Text
        style={{
          marginTop: 10,
          color: '#4B5563',
          fontSize: 14,
          lineHeight: 21,
        }}
      >
        Bu ekran şu anda gizli altyapı ekranıdır. Ana ekrana henüz bağlanmadı.
        Sepet öğeleri şimdilik ürün grubu niyeti olarak tutulur; gerçek ürün
        verisi geldiğinde aynı yapı markalı ürünlere genişleyecek.
      </Text>

      <View
        style={{
          marginTop: 24,
          gap: 10,
        }}
      >
        {items.map((item) => (
          <View
            key={`${item.type}:${item.productGroupKey}:${item.label}`}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              padding: 14,
              backgroundColor: '#F9FAFB',
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
                  fontSize: 16,
                  fontWeight: '700',
                }}
              >
                {item.label}
              </Text>

              <Text
                style={{
                  borderRadius: 999,
                  backgroundColor: '#EEF2FF',
                  color: '#3730A3',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  fontSize: 11,
                  fontWeight: '700',
                }}
              >
                Kategori
              </Text>
            </View>

            <Text
              style={{
                marginTop: 6,
                color: '#6B7280',
                fontSize: 13,
              }}
            >
              {item.quantity.amount} {item.quantity.unit} • {item.productGroupKey}
            </Text>
          </View>
        ))}
      </View>

      {errorMessage ? (
        <Text
          style={{
            marginTop: 14,
            color: '#B91C1C',
            fontSize: 13,
            fontWeight: '600',
          }}
        >
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        onPress={handleEvaluate}
        disabled={isEvaluating}
        style={{
          marginTop: 20,
          borderRadius: 12,
          backgroundColor: '#111827',
          paddingVertical: 14,
          alignItems: 'center',
          opacity: isEvaluating ? 0.65 : 1,
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          {isEvaluating ? 'Sepet değerlendiriliyor...' : 'Sepeti Tamamla'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
