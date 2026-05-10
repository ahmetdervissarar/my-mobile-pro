export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type RiskWarning = {
  code: string;
  title: string;
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
      title: '\u0130\u00e7indekiler bilgisi eksik',
      level: 'medium',
      message: '\u0130\u00e7indekiler bilgisi bulunamad\u0131. Ambalaj \u00fczerindeki i\u00e7erik listesi kontrol edilmelidir.',
    });
  }

  if (!product.allergens || product.allergens.length === 0) {
    warnings.push({
      code: 'MISSING_ALLERGEN_INFO',
      title: 'Alerjen bilgisi eksik',
      level: 'high',
      message: 'Alerjen bilgisi eksik. Alerjisi veya hassasiyeti olan kullan\u0131c\u0131lar ambalaj \u00fczerindeki alerjen beyan\u0131n\u0131 kontrol etmelidir.',
    });
  }

  if (product.additives && product.additives.length > 0) {
    warnings.push({
      code: 'CONTAINS_ADDITIVES',
      title: 'Katk\u0131 maddesi uyar\u0131s\u0131',
      level: 'medium',
      message: 'Bu \u00fcr\u00fcn katk\u0131 maddesi i\u00e7eriyor olabilir. Katk\u0131 maddelerine hassasiyeti olan kullan\u0131c\u0131lar dikkatli olmal\u0131d\u0131r.',
    });
  }

  if (product.novaGroup === 4) {
    warnings.push({
      code: 'NOVA_GROUP_4',
      title: 'Ultra i\u015flenmi\u015f \u00fcr\u00fcn uyar\u0131s\u0131',
      level: 'high',
      message: 'Bu \u00fcr\u00fcn ultra i\u015flenmi\u015f \u00fcr\u00fcn grubunda olabilir. D\u00fczenli t\u00fcketim a\u00e7\u0131s\u0131ndan dikkatli de\u011ferlendirilmelidir.',
    });
  }

  const processedMeatKeywords = ['salam', 'sosis', 'sucuk', 'jambon', 'f\u00fcme', 'past\u0131rma', 'parizer', '\u015fark\u00fcteri'];
  if (processedMeatKeywords.some((keyword) => nameLower.includes(keyword))) {
    warnings.push({
      code: 'PROCESSED_MEAT_PRECAUTION',
      title: '\u0130\u015flenmi\u015f et / \u015fark\u00fcteri uyar\u0131s\u0131',
      level: 'medium',
      message: 'Bu \u00fcr\u00fcn i\u015flenmi\u015f et veya \u015fark\u00fcteri grubunda olabilir. Alerjen, katk\u0131 maddesi ve \u00e7apraz bula\u015fma beyanlar\u0131 ambalaj \u00fczerinden dikkatle kontrol edilmelidir.',
    });
  }

  const sweetSnackKeywords = ['\u00e7ikolata', 'cikolata', 'gofret', 'bisk\u00fcvi', 'biskuvi', 'kek', 'krema', 'bar', 'kakaolu'];
  if (sweetSnackKeywords.some((keyword) => nameLower.includes(keyword))) {
    warnings.push({
      code: 'SWEET_SNACK_ALLERGEN_PRECAUTION',
      title: 'Tatl\u0131 \u00fcr\u00fcn alerjen uyar\u0131s\u0131',
      level: 'medium',
      message: 'Bu \u00fcr\u00fcn s\u00fct, f\u0131nd\u0131k/f\u0131st\u0131k, soya, gluten veya benzeri alerjenlerle ili\u015fkili olabilir. Alerjisi veya hassasiyeti olan kullan\u0131c\u0131lar i\u00e7erik ve alerjen beyan\u0131n\u0131 kontrol etmelidir.',
    });
  }

  const veganAlternativeKeywords = ['vegan', 'bitkisel', 'plant-based', 'bitkisel s\u00fct', 'vegan peynir', 'vegan burger'];
  if (veganAlternativeKeywords.some((keyword) => nameLower.includes(keyword))) {
    warnings.push({
      code: 'VEGAN_ALLERGEN_PRECAUTION',
      title: 'Vegan \u00fcr\u00fcn alerjen uyar\u0131s\u0131',
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
