import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { isPilotPreviewEnabled } from '../src/localProduct/featureFlag';

export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        backgroundColor: '#fff',
      }}
    >
      <Text
        style={{
          marginBottom: 32,
          fontSize: 36,
          fontWeight: '700',
          color: '#111827',
        }}
      >
        RafSkoru
      </Text>

      <View style={{ width: '100%', maxWidth: 320, gap: 12 }}>
        <Pressable
          onPress={() => router.push('/barcode-scan')}
          style={{
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: '#111827',
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>Barkod okut</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/search')}
          style={{
            alignItems: 'center',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#111827',
            backgroundColor: '#fff',
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827' }}>Ürün ara</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/photo-search')}
          style={{
            alignItems: 'center',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#111827',
            backgroundColor: '#fff',
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827' }}>Fotoğrafla ara</Text>
        </Pressable>

        {__DEV__ ? (
          <Pressable
            onPress={() => router.push('/basket')}
            style={{
              alignItems: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#4F46E5',
              backgroundColor: '#EEF2FF',
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#3730A3' }}>
              Sepet
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => router.push('/profile')}
          style={{
            alignItems: 'center',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#111827',
            backgroundColor: '#fff',
            paddingVertical: 14,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#111827' }}>Profilim</Text>
        </Pressable>

        {isPilotPreviewEnabled() ? (
          <Pressable
            onPress={() => router.push('/pilot-preview')}
            style={{
              alignItems: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#3D2E12',
              backgroundColor: '#FCE7C8',
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#3D2E12' }}>
              Pilot önizleme
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
