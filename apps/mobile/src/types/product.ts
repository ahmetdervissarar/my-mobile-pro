export type ProductResult = {
  id: string;
  name: string;
  barcode: string;
  searchSource: 'barcode' | 'name' | 'photo';
  healthScore: number;
  priceText: string;
  warnings: string[];
  allergens: string[];
  additives: string[];
  ingredients: string | null;
  nutriScore: string | null;
  novaGroup: number | null;
};
