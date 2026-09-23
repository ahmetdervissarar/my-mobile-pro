import { getPriceApiBaseUrl } from './config';
import type {
  CatalogAllergenData,
  CatalogCompleteness,
  CatalogNova,
  CatalogNutriScore,
  CatalogProvenance,
} from './catalogTypes';

export type SearchSuggestion = ProductGroupSearchSuggestion | ProductSearchSuggestion;

export interface ProductGroupSearchSuggestion {
  type: 'product_group';
  productGroupKey: string;
  label: string;
  coverage: 'covered';
  source: 'product_group_registry';
}

export interface ProductSearchSuggestion {
  type: 'product';
  productId: string;
  productGroupKey: string;
  label: string;
  brand?: string;
  packageSize?: {
    amount: number;
    unit: string;
  };
  source: 'product_index';
  /** Aşağıdakiler yalnız katalogdan (OFF-TR) geldiğinde doludur. */
  imageUrl?: string | null;
  nutriScore?: CatalogNutriScore;
  nova?: CatalogNova;
  allergenData?: CatalogAllergenData;
  completeness?: CatalogCompleteness;
  provenance?: CatalogProvenance;
}

export interface SearchSuggestResponse {
  ok?: boolean;
  query?: string;
  suggestions?: SearchSuggestion[];
}

export interface ProductGroupBrowseResponse {
  ok?: boolean;
  productGroupKey?: string;
  suggestions?: ProductSearchSuggestion[];
}

/**
 * Ağ/HTTP/parse hatalarını genuine "sıfır sonuç" ile karıştırmamak için
 * bunları YUTMAZ, fırlatır — çağıran taraf "Bağlantı kurulamadı" ile
 * "Sonuç bulunamadı"yı ayırt edebilsin diye.
 */
export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  const url = `${getPriceApiBaseUrl()}/api/search/suggest?q=${encodeURIComponent(trimmedQuery)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`search_suggest_http_${response.status}`);
  }

  const json = (await response.json()) as SearchSuggestResponse;

  return Array.isArray(json.suggestions) ? json.suggestions : [];
}

/**
 * Kategori sayfası için: productGroupKey'e göre katalog taraması —
 * /api/search/suggest ile AYNI ProductSearchSuggestion şekli ve AYNI
 * katalog alerjen verisi. Ağ/HTTP/parse hataları fırlatılır (yutulmaz),
 * fetchSearchSuggestions ile aynı sebeple.
 */
export async function fetchProductsByGroup(productGroupKey: string): Promise<ProductSearchSuggestion[]> {
  const trimmedGroupKey = productGroupKey.trim();

  if (!trimmedGroupKey) {
    return [];
  }

  const url = `${getPriceApiBaseUrl()}/api/search/by-group?groupKey=${encodeURIComponent(trimmedGroupKey)}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`search_by_group_http_${response.status}`);
  }

  const json = (await response.json()) as ProductGroupBrowseResponse;

  return Array.isArray(json.suggestions) ? json.suggestions : [];
}
