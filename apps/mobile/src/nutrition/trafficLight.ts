import type {
  NutritionValue,
  TrafficLightLevel,
  TrafficLightNutrition,
} from '../types/product';

type TrafficLightNutrient = 'fat' | 'saturatedFat' | 'sugars' | 'salt';

type SolidFoodThreshold = {
  lowMax: number;
  highMinExclusive: number;
};

const SOLID_FOOD_THRESHOLDS: Record<TrafficLightNutrient, SolidFoodThreshold> = {
  fat: {
    lowMax: 3,
    highMinExclusive: 17.5,
  },
  saturatedFat: {
    lowMax: 1.5,
    highMinExclusive: 5,
  },
  sugars: {
    lowMax: 5,
    highMinExclusive: 22.5,
  },
  salt: {
    lowMax: 0.3,
    highMinExclusive: 1.5,
  },
};

function classifyTrafficLightLevel(
  value: number | null | undefined,
  nutrient: TrafficLightNutrient,
): TrafficLightLevel {
  if (value == null || Number.isNaN(value)) {
    return 'unknown';
  }

  const threshold = SOLID_FOOD_THRESHOLDS[nutrient];

  if (value <= threshold.lowMax) {
    return 'low';
  }

  if (value > threshold.highMinExclusive) {
    return 'high';
  }

  return 'medium';
}

function createNutritionValue(
  value: number | null | undefined,
  nutrient: TrafficLightNutrient,
): NutritionValue {
  if (value == null || Number.isNaN(value)) {
    return {
      value: null,
      unit: null,
      level: 'unknown',
    };
  }

  return {
    value,
    unit: 'g',
    level: classifyTrafficLightLevel(value, nutrient),
  };
}

export function createTrafficLightNutrition(input: {
  fat: number | null | undefined;
  saturatedFat: number | null | undefined;
  sugars: number | null | undefined;
  salt: number | null | undefined;
}): TrafficLightNutrition {
  return {
    fat: createNutritionValue(input.fat, 'fat'),
    saturatedFat: createNutritionValue(input.saturatedFat, 'saturatedFat'),
    sugars: createNutritionValue(input.sugars, 'sugars'),
    salt: createNutritionValue(input.salt, 'salt'),
  };
}

export function getTrafficLightLevelLabel(level: TrafficLightLevel): string {
  if (level === 'low') return 'Düşük';
  if (level === 'medium') return 'Orta';
  if (level === 'high') return 'Yüksek';
  return 'Bilinmiyor';
}

export function getTrafficLightNutrientLabel(nutrient: TrafficLightNutrient): string {
  if (nutrient === 'fat') return 'Yağ';
  if (nutrient === 'saturatedFat') return 'Doymuş yağ';
  if (nutrient === 'sugars') return 'Şeker';
  return 'Tuz';
}

export function formatNutritionValue(value: NutritionValue): string {
  if (value.value == null || value.unit == null) {
    return 'Veri yok';
  }

  return `${value.value} ${value.unit}/100 g`;
}