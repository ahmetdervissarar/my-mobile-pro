const DEFAULT_PRICE_API_BASE_URL = 'http://localhost:3001';

export function getPriceApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_PRICE_API_URL?.trim();

  if (configuredUrl && configuredUrl.length > 0) {
    return configuredUrl;
  }

  return DEFAULT_PRICE_API_BASE_URL;
}
