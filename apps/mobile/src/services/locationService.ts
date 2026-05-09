import * as Location from 'expo-location';

export async function getUserLocationForPricing(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== Location.PermissionStatus.GRANTED) {
      return null;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});

    return {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };
  } catch {
    return null;
  }
}
