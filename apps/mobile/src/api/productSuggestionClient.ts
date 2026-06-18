import { getPriceApiBaseUrl } from './config';

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
}

export interface SearchSuggestResponse {
  ok?: boolean;
  query?: string;
  suggestions?: SearchSuggestion[];
}

export async function fetchSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  try {
    const url = `${getPriceApiBaseUrl()}/api/search/suggest?q=${encodeURIComponent(trimmedQuery)}`;
    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const json = (await response.json()) as SearchSuggestResponse;

    return Array.isArray(json.suggestions) ? json.suggestions : [];
  } catch {
    return [];
  }
}
