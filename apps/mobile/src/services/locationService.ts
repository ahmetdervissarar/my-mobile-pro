import * as Location from "expo-location";

export async function getUserLocationForPricing(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== Location.PermissionStatus.GRANTED) {
      return null;
    }

    const currentPosition = await Location.getCurrentPositionAsync({});

    return {
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
    };
  } catch {
    return null;
  }
}
