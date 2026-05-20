import { distanceMeters } from '../geo/distance.js';
import { normalizeMarketName } from '../normalize/marketName.js';
import type { StoreLocator, StoreLocatorQuery } from './storeLocator.js';
import type { MarketChainCode, Store } from './storeTypes.js';

const GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACES_NEARBY_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const FIELD_MASK = 'places.id,places.displayName,places.location,places.primaryType,places.types,places.attributions';

const DEFAULT_RADIUS_METERS = 5_000;
const DEFAULT_MAX_RESULTS = 1;
const MAX_RESULTS_CAP = 5;
const NEARBY_RESULT_COUNT = 20;
const CACHE_TTL_MS = 10 * 60 * 1000;

const DEFAULT_DAILY_NEARBY_LIMIT = 100;
const DEFAULT_DAILY_TEXT_LIMIT = 50;

const VALID_STORE_TYPES = new Set([
  'supermarket',
  'hypermarket',
  'grocery_store',
  'food_store',
  'store',
  'discount_supermarket',
  'warehouse_store',
  'general_store',
]);

const CHAIN_TEXT_QUERY: Record<Exclude<MarketChainCode, 'UNKNOWN'>, string> = {
  BIM: 'BİM',
  A101: 'A101',
  SOK: 'Şok Market',
  MIGROS: 'Migros',
  CARREFOURSA: 'CarrefourSA',
  BIZIM_TOPTAN: 'Bizim Toptan',
};

type GoogleCallKind = 'nearby' | 'text';

interface GooglePlace {
  id?: string;
  displayName?: {
    text?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  primaryType?: string;
  types?: string[];
}

interface GooglePlacesSearchResponse {
  places?: GooglePlace[];
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

interface LocatedGooglePlace extends GooglePlace {
  location: {
    latitude: number;
    longitude: number;
  };
}

interface Candidate {
  place: LocatedGooglePlace;
  meters: number;
}

interface DailyGoogleUsage {
  day: string;
  nearby: number;
  text: number;
}

function isKnownChainCode(
  chainCode: MarketChainCode,
): chainCode is Exclude<MarketChainCode, 'UNKNOWN'> {
  return chainCode !== 'UNKNOWN';
}

function hasValidLocation(place: GooglePlace): place is LocatedGooglePlace {
  return (
    typeof place.location?.latitude === 'number' &&
    Number.isFinite(place.location.latitude) &&
    typeof place.location.longitude === 'number' &&
    Number.isFinite(place.location.longitude)
  );
}

function hasValidStoreType(place: GooglePlace): boolean {
  const candidateTypes = [place.primaryType, ...(place.types ?? [])].filter(
    (type): type is string => typeof type === 'string' && type.length > 0,
  );

  return candidateTypes.some((type) => VALID_STORE_TYPES.has(type));
}

function verifyChain(place: GooglePlace, expectedChainCode: MarketChainCode): boolean {
  const name = place.displayName?.text;

  if (!name) {
    return false;
  }

  return normalizeMarketName(name).chainCode === expectedChainCode;
}

function roundForCache(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function currentUtcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function parsePositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = Number.parseInt(raw ?? '', 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function isGooglePlacesDisabled(): boolean {
  return process.env.GOOGLE_PLACES_DISABLED === 'true';
}

function nearbyCacheKey(query: StoreLocatorQuery, radiusMeters: number): string {
  return [
    roundForCache(query.latitude),
    roundForCache(query.longitude),
    radiusMeters,
    NEARBY_RESULT_COUNT,
  ].join(':');
}

function textCacheKey(query: StoreLocatorQuery, radiusMeters: number, pageSize: number): string {
  return [
    query.chainCode,
    roundForCache(query.latitude),
    roundForCache(query.longitude),
    radiusMeters,
    pageSize,
  ].join(':');
}

function coordinateDedupeKey(candidate: Candidate): string {
  const normalized = normalizeMarketName(candidate.place.displayName?.text);

  return [
    normalized.chainCode,
    candidate.place.location.latitude.toFixed(5),
    candidate.place.location.longitude.toFixed(5),
  ].join(':');
}

function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const unique: Candidate[] = [];

  for (const candidate of candidates) {
    const key = coordinateDedupeKey(candidate);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(candidate);
  }

  return unique;
}

export class GooglePlacesStoreLocator implements StoreLocator {
  readonly name = 'google_places';

  private readonly nearbyCache = new Map<string, CacheEntry<GooglePlace[]>>();
  private readonly textCache = new Map<string, CacheEntry<GooglePlace[]>>();

  private usage: DailyGoogleUsage = {
    day: currentUtcDay(),
    nearby: 0,
    text: 0,
  };

  constructor(private readonly apiKey: string | undefined = process.env.GOOGLE_PLACES_API_KEY) {}

  async findNearby(query: StoreLocatorQuery): Promise<Store[]> {
    if (!this.apiKey || isGooglePlacesDisabled() || !isKnownChainCode(query.chainCode)) {
      return [];
    }

    const maxResults = Math.min(query.maxResults ?? DEFAULT_MAX_RESULTS, MAX_RESULTS_CAP);
    const radiusMeters = query.radiusMeters ?? DEFAULT_RADIUS_METERS;

    const nearbyPlaces = await this.searchNearby(query, radiusMeters);
    const nearbyCandidates = this.buildCandidates(nearbyPlaces, query, radiusMeters);

    if (nearbyCandidates.length > 0) {
      return this.toStores(nearbyCandidates, query.chainCode, maxResults);
    }

    const textPlaces = await this.searchText(
      query,
      radiusMeters,
      Math.min(Math.max(maxResults * 5, 5), 20),
    );
    const textCandidates = this.buildCandidates(textPlaces, query, radiusMeters);

    return this.toStores(textCandidates, query.chainCode, maxResults);
  }

  private async searchNearby(
    query: StoreLocatorQuery,
    radiusMeters: number,
  ): Promise<GooglePlace[]> {
    const key = nearbyCacheKey(query, radiusMeters);
    const cached = this.getCached(this.nearbyCache, key);

    if (cached) {
      return cached;
    }

    if (!this.canCallGoogle('nearby')) {
      return [];
    }

    this.recordGoogleCall('nearby');

    const response = await fetch(GOOGLE_PLACES_NEARBY_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey ?? '',
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: ['supermarket', 'grocery_store'],
        maxResultCount: NEARBY_RESULT_COUNT,
        rankPreference: 'DISTANCE',
        languageCode: 'tr',
        regionCode: 'TR',
        locationRestriction: {
          circle: {
            center: {
              latitude: query.latitude,
              longitude: query.longitude,
            },
            radius: radiusMeters,
          },
        },
      }),
    });

    const data = (await response.json()) as GooglePlacesSearchResponse;
    const places = response.ok && !data.error ? data.places ?? [] : [];

    this.setCached(this.nearbyCache, key, places);

    return places;
  }

  private async searchText(
    query: StoreLocatorQuery,
    radiusMeters: number,
    pageSize: number,
  ): Promise<GooglePlace[]> {
    if (!isKnownChainCode(query.chainCode)) {
      return [];
    }

    const key = textCacheKey(query, radiusMeters, pageSize);
    const cached = this.getCached(this.textCache, key);

    if (cached) {
      return cached;
    }

    if (!this.canCallGoogle('text')) {
      return [];
    }

    this.recordGoogleCall('text');

    const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey ?? '',
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: CHAIN_TEXT_QUERY[query.chainCode],
        languageCode: 'tr',
        regionCode: 'TR',
        pageSize,
        locationBias: {
          circle: {
            center: {
              latitude: query.latitude,
              longitude: query.longitude,
            },
            radius: radiusMeters,
          },
        },
      }),
    });

    const data = (await response.json()) as GooglePlacesSearchResponse;
    const places = response.ok && !data.error ? data.places ?? [] : [];

    this.setCached(this.textCache, key, places);

    return places;
  }

  private buildCandidates(
    places: GooglePlace[],
    query: StoreLocatorQuery,
    radiusMeters: number,
  ): Candidate[] {
    const candidates = places
      .filter((place) => verifyChain(place, query.chainCode))
      .filter(hasValidLocation)
      .filter(hasValidStoreType)
      .map((place) => ({
        place,
        meters: distanceMeters(
          { latitude: query.latitude, longitude: query.longitude },
          { latitude: place.location.latitude, longitude: place.location.longitude },
        ),
      }))
      .filter((candidate) => candidate.meters <= radiusMeters)
      .sort((first, second) => first.meters - second.meters);

    return dedupeCandidates(candidates);
  }

  private toStores(
    candidates: Candidate[],
    chainCode: Exclude<MarketChainCode, 'UNKNOWN'>,
    maxResults: number,
  ): Store[] {
    return dedupeCandidates(candidates)
      .sort((first, second) => first.meters - second.meters)
      .slice(0, maxResults)
      .map(({ place }): Store => ({
        chainCode,
        displayName: normalizeMarketName(place.displayName?.text).displayName,
        branchName: place.displayName?.text,
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      }));
  }

  private getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const cached = cache.get(key);

    if (!cached) {
      return undefined;
    }

    if (cached.expiresAt <= Date.now()) {
      cache.delete(key);
      return undefined;
    }

    return cached.value;
  }

  private setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
    cache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });
  }

  private resetUsageIfNeeded(): void {
    const today = currentUtcDay();

    if (this.usage.day !== today) {
      this.usage = {
        day: today,
        nearby: 0,
        text: 0,
      };
    }
  }

  private canCallGoogle(kind: GoogleCallKind): boolean {
    this.resetUsageIfNeeded();

    const limit =
      kind === 'nearby'
        ? parsePositiveIntegerEnv('GOOGLE_PLACES_DAILY_NEARBY_LIMIT', DEFAULT_DAILY_NEARBY_LIMIT)
        : parsePositiveIntegerEnv('GOOGLE_PLACES_DAILY_TEXT_LIMIT', DEFAULT_DAILY_TEXT_LIMIT);

    return this.usage[kind] < limit;
  }

  private recordGoogleCall(kind: GoogleCallKind): void {
    this.resetUsageIfNeeded();
    this.usage[kind] += 1;
  }
}
