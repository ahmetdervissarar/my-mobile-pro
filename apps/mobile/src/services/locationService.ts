import * as Location from "expo-location";

export type PricingLocation = {
  latitude: number;
  longitude: number;
};

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
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };
  } catch {
    return null;
  }
}
