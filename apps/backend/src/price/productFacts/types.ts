export type ProductFactsSource = 'off' | 'beta_inference';

export type ProductFactsNutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type ProductFactsNovaGroup = 1 | 2 | 3 | 4;

export type ProductFactsTrafficLightValue = 'low' | 'medium' | 'high';

export interface ProductFactsTrafficLight {
  sugar?: ProductFactsTrafficLightValue | null;
  salt?: ProductFactsTrafficLightValue | null;
  saturatedFat?: ProductFactsTrafficLightValue | null;
  fat?: ProductFactsTrafficLightValue | null;
}

export interface ProductFacts {
  barcode?: string | null;
  productName?: string | null;
  imageUrl?: string | null;

  nutriScoreGrade?: ProductFactsNutriScoreGrade | null;
  novaGroup?: ProductFactsNovaGroup | null;
  trafficLight?: ProductFactsTrafficLight | null;

  ingredientsText?: string | null;
  additives?: string[];
  allergens?: string[];

  dataSource: ProductFactsSource;
  isComplete: boolean;
}
