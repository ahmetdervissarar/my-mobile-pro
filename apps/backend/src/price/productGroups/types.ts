export type ProductPackageUnit = 'ml' | 'l' | 'g' | 'kg' | 'unit';

export type NormalizedPackageUnit = 'ml' | 'g' | 'unit';

export interface ProductPackageSize {
  value: number;
  unit: ProductPackageUnit;
  normalizedValue: number;
  normalizedUnit: NormalizedPackageUnit;
  text?: string;
}

export type ProductGroupConfidence = 'exact' | 'strong' | 'assisted' | 'unknown';

export type ProductGroupSource = 'barcode' | 'name_rule' | 'off_assisted' | 'none';

export interface ProductGroupResolution {
  productGroupKey: string | null;
  coarseGroup: string | null;
  groupConfidence: ProductGroupConfidence;
  groupSource: ProductGroupSource;
  packageSize: ProductPackageSize | null;
  alternativesEligible: boolean;
  ruleId?: string;
}

export interface ProductGroupCatalogEntry {
  key: string;
  coarseGroup: string;
  include: string[];
  exclude: string[];
  offHints?: string[];
  packageUnits?: ProductPackageUnit[];
}
