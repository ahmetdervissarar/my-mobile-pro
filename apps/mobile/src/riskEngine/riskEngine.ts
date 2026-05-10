import type { ProductResult } from '../types/product';

export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';

export type ProductRiskResult = {
  level: RiskLevel;
  messages: string[];
};

export function evaluateProductRisks(product: ProductResult): ProductRiskResult {
  const messages: string[] = [];
  let level: RiskLevel = 'low';

  if (!product.allergens || product.allergens.length === 0) {
    messages.push('Alerjen bilgisi eksik. Ambalaj kontrol edilmeli.');
    level = 'unknown';
  }

  if (product.additives && product.additives.length > 0) {
    messages.push('Katkı maddesi içeriyor olabilir.');
    level = level === 'high' ? 'high' : 'medium';
  }

  if (product.novaGroup === 4) {
    messages.push('Ultra işlenmiş ürün olabilir.');
    level = 'high';
  }

  if (!product.ingredients || product.ingredients.trim().length === 0) {
    messages.push('İçindekiler bilgisi bulunamadı.');
    if (level === 'low') {
      level = 'unknown';
    }
  }

  return {
    level,
    messages,
  };
}
