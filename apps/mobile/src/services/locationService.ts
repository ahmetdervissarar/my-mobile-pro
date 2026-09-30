import * as Location from "expo-location";

import { roundToCoarseGrid } from "./locationPrecision";

export type PricingLocation = {
  latitude: number;
  longitude: number;
};

/**
 * P1-7: bu fonksiyon YALNIZCA kullanıcı açıkça mağaza/mesafe bilgisi
 * isteyen bir eylemde bulunduğunda çağrılmalıdır — ürün ekranı açılışında
 * OTOMATİK çağrılmaz (bkz. product-result.tsx, önceki davranışın
 * kaldırılması). İzin isteği de bu çağrının içinde, yalnız o an tetiklenir.
 */
export async function getUserLocationForPricing(): Promise<PricingLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      return null;
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: roundToCoarseGrid(currentLocation.coords.latitude),
      longitude: roundToCoarseGrid(currentLocation.coords.longitude),
    };
  } catch {
    return null;
  }
}
