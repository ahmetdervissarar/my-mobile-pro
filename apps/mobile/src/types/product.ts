export type TrafficLightLevel = 'low' | 'medium' | 'high' | 'unknown';

export type NutritionValue = {
  value: number | null;
  unit: 'g' | 'mg' | null;
  level: TrafficLightLevel;
};

export type TrafficLightNutrition = {
  fat: NutritionValue;
  saturatedFat: NutritionValue;
  sugars: NutritionValue;
  salt: NutritionValue;
};

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
  trafficLight?: TrafficLightNutrition | null;
};