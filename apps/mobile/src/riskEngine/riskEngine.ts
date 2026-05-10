export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type RiskWarning = {
  code: string;
  message: string;
  level: RiskLevel;
};

export type ProductRiskInput = {
  ingredients?: string | null;
  allergens?: string[] | null;
  additives?: string[] | null;
  novaGroup?: number | null;
};

export type ProductRiskResult = {
  overallRisk: RiskLevel;
  warnings: RiskWarning[];
  isEvaluated: boolean;
};

const riskWeight: Record<RiskLevel, number> = {
  low: 1,
  unknown: 2,
  medium: 3,
  high: 4,
};

function getHighestRiskLevel(warnings: RiskWarning[]): RiskLevel {
  if (warnings.length === 0) {
    return 'low';
  }

  return warnings.reduce<RiskLevel>((highest, warning) => {
    return riskWeight[warning.level] > riskWeight[highest] ? warning.level : highest;
  }, 'low');
}

export function evaluateProductRisks(product: ProductRiskInput): ProductRiskResult {
  const warnings: RiskWarning[] = [];

  if (!product.ingredients || product.ingredients.trim().length === 0) {
    warnings.push({
      code: 'MISSING_INGREDIENTS',
      level: 'medium',
      message: 'İçindekiler bilgisi bulunamadı. Ambalaj üzerindeki içerik listesi kontrol edilmelidir.',
    });
  }

  if (!product.allergens || product.allergens.length === 0) {
    warnings.push({
      code: 'MISSING_ALLERGEN_INFO',
      level: 'high',
      message: 'Alerjen bilgisi eksik. Alerjisi veya hassasiyeti olan kullanıcılar ambalaj üzerindeki alerjen beyanını kontrol etmelidir.',
    });
  }

  if (product.additives && product.additives.length > 0) {
    warnings.push({
      code: 'CONTAINS_ADDITIVES',
      level: 'medium',
      message: 'Bu ürün katkı maddesi içeriyor olabilir. Katkı maddelerine hassasiyeti olan kullanıcılar dikkatli olmalıdır.',
    });
  }

  if (product.novaGroup === 4) {
    warnings.push({
      code: 'NOVA_GROUP_4',
      level: 'high',
      message: 'Bu ürün ultra işlenmiş ürün grubunda olabilir. Düzenli tüketim açısından dikkatli değerlendirilmelidir.',
    });
  }

  return {
    overallRisk: getHighestRiskLevel(warnings),
    warnings,
    isEvaluated: true,
  };
}
