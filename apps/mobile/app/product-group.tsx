import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

export default function ProductGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    productGroupKey?: string;
    label?: string;
  }>();

  const productGroupKey = getSingleParam(params.productGroupKey);
  const label = getSingleParam(params.label) || 'Ürün Grubu';

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
          color: '#6B7280',
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        Kategori
      </Text>

      <Text
        style={{
          marginTop: 8,
          color: '#111827',
          fontSize: 32,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>

      {productGroupKey ? (
        <Text
          style={{
            marginTop: 6,
            color: '#6B7280',
            fontSize: 13,
          }}
        >
          Grup anahtarı: {productGroupKey}
        </Text>
      ) : null}

      <View
        style={{
          marginTop: 24,
          borderRadius: 16,
          backgroundColor: '#F9FAFB',
          padding: 16,
          borderWidth: 1,
          borderColor: '#E5E7EB',
        }}
      >
        <Text
          style={{
            color: '#111827',
            fontSize: 17,
            fontWeight: '700',
          }}
        >
          Ürün grubu ekranı hazır
        </Text>

        <Text
          style={{
            marginTop: 8,
            color: '#4B5563',
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          Bu ekran şu anda kategori önerisinin ürün sonucu gibi davranmasını engeller. Gerçek ürün verisi bağlandığında bu sayfada aynı gruptaki markalı ürünler, fiyatlar ve karşılaştırılabilir seçenekler listelenecek.
        </Text>
      </View>

      <View
        style={{
          marginTop: 16,
          borderRadius: 16,
          backgroundColor: '#EEF2FF',
          padding: 16,
        }}
      >
        <Text
          style={{
            color: '#3730A3',
            fontSize: 14,
            fontWeight: '700',
          }}
        >
          Sonraki veri aşaması
        </Text>

        <Text
          style={{
            marginTop: 6,
            color: '#4338CA',
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          Bu kategoriye ürün indeksi bağlandığında örneğin X Marka Baldo Pirinç 1 kg, Y Marka Osmancık Pirinç 1 kg gibi gerçek ürün önerileri burada görünecek.
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
          Aramaya dön
        </Text>
      </Pressable>
    </View>
  );
}
