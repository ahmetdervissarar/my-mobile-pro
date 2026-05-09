export type ProductResult = {
  id: string;
  name: string;
  barcode: string;
  searchSource: 'barcode' | 'name' | 'photo';
  healthScore: number;
  priceText: string;
  warnings: string[];
};
