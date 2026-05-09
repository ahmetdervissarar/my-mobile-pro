import { useState } from 'react';
import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from 'expo-camera';

export default function BarcodeScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scannedBarcode) {
      return;
    }

    setScannedBarcode(result.data);
    router.replace({
      pathname: '/product-result',
      params: {
        barcode: result.data,
        productName: undefined,
        searchType: 'barcode',
      },
    });
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Barkod Okut</Text>
        <Text style={styles.infoText}>Barkod okutmak için kamera izni gerekli.</Text>
        <Button title="Kamera izni ver" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Barkod Okut</Text>

      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
          }}
          onBarcodeScanned={scannedBarcode ? undefined : handleBarcodeScanned}
        />
      </View>

      <Text style={styles.resultLabel}>Okutulan Barkod:</Text>
      <Text style={styles.resultValue}>{scannedBarcode ?? '-'}</Text>

      <Button title="Tekrar okut" onPress={() => setScannedBarcode(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  cameraWrapper: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  resultLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
});
