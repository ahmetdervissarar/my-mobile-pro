export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type RiskWarning = {
  code: string;
  message: string;
  level: RiskLevel;
};

export type ProductRiskInput = {
  name?: string | null;
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
  const nameLower = product.name?.toLocaleLowerCase('tr-TR') ?? '';

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


  const processedMeatKeywords = ['salam', 'sosis', 'sucuk', 'jambon', 'f\u00fcme', 'past\u0131rma', 'parizer', '\u015fark\u00fcteri'];
  if (processedMeatKeywords.some((keyword) => nameLower.includes(keyword))) {
    warnings.push({
      code: 'PROCESSED_MEAT_PRECAUTION',
      level: 'medium',
      message: 'Bu \u00fcr\u00fcn i\u015flenmi\u015f et veya \u015fark\u00fcteri grubunda olabilir. Alerjen, katk\u0131 maddesi ve \u00e7apraz bula\u015fma beyanlar\u0131 ambalaj \u00fczerinden dikkatle kontrol edilmelidir.',
    });
  }

  const sweetSnackKeywords = ['\u00e7ikolata', 'cikolata', 'gofret', 'bisk\u00fcvi', 'biskuvi', 'kek', 'krema', 'bar', 'kakaolu'];
  if (sweetSnackKeywords.some((keyword) => nameLower.includes(keyword))) {
    warnings.push({
      code: 'SWEET_SNACK_ALLERGEN_PRECAUTION',
      level: 'medium',
      message: 'Bu \u00fcr\u00fcn s\u00fct, f\u0131nd\u0131k/f\u0131st\u0131k, soya, gluten veya benzeri alerjenlerle ili\u015fkili olabilir. Alerjisi veya hassasiyeti olan kullan\u0131c\u0131lar i\u00e7erik ve alerjen beyan\u0131n\u0131 kontrol etmelidir.',
    });
  }

  const veganAlternativeKeywords = ['vegan', 'bitkisel', 'plant-based', 'bitkisel s\u00fct', 'vegan peynir', 'vegan burger'];
  if (veganAlternativeKeywords.some((keyword) => nameLower.includes(keyword))) {
    warnings.push({
      code: 'VEGAN_ALLERGEN_PRECAUTION',
      level: 'medium',
      message: 'Vegan veya bitkisel ibaresi \u00fcr\u00fcn\u00fcn alerjensiz oldu\u011fu anlam\u0131na gelmez. \u00c7apraz bula\u015fma ve alerjen beyanlar\u0131 kontrol edilmelidir.',
    });
  }

  return {
    overallRisk: getHighestRiskLevel(warnings),
    warnings,
    isEvaluated: true,
  };
}
