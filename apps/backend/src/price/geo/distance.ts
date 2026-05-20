const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export function distanceMeters(from: GeoPoint, to: GeoPoint): number {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function distanceText(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return '';
  }

  if (meters < 1000) {
    const roundedMeters = Math.max(10, Math.round(meters / 10) * 10);
    return `${roundedMeters} m uzakta`;
  }

  const kilometers = meters / 1000;

  if (kilometers >= 10) {
    return `${Math.round(kilometers)} km uzakta`;
  }

  const oneDecimal = Math.round(kilometers * 10) / 10;
  return `${oneDecimal.toString().replace('.', ',')} km uzakta`;
}
