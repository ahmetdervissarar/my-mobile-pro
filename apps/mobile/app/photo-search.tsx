import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function PhotoSearchScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isPhotoTaken, setIsPhotoTaken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!permission) {
      return;
    }

    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isTakingPhoto) {
      return;
    }

    try {
      setIsTakingPhoto(true);
      await cameraRef.current.takePictureAsync({ quality: 0.8 });
      setIsPhotoTaken(true);
      router.push({
        pathname: '/product-result',
        params: { searchType: 'photo' },
      });
    } catch {
      Alert.alert('Hata', 'Fotoğraf çekilirken bir sorun oluştu.');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.infoText}>Kamera izni kontrol ediliyor...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Fotoğrafla Ara</Text>
        <Text style={styles.infoText}>Kamera izni gerekli.</Text>
        <Button title="Kamera izni ver" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fotoğrafla Ara</Text>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />
      <View style={styles.buttonContainer}>
        <Button title={isTakingPhoto ? 'Çekiliyor...' : 'Fotoğraf çek'} onPress={handleTakePhoto} disabled={isTakingPhoto} />
      </View>
      {isPhotoTaken ? <Text style={styles.infoText}>Fotoğraf başarıyla çekildi.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#fff',
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  camera: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonContainer: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
  },
});
