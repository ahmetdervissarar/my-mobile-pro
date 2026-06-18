export { inferProductGroupKey } from './inferProductGroupKey.js';
export type { ProductGroupCatalogEntry, ProductGroupConfidence, ProductGroupResolution, ProductGroupSource, ProductPackageSize, ProductPackageUnit } from './types.js';
export { PRODUCT_GROUP_CATALOG, findProductGroupCatalogEntry } from './catalog.js';
export { arePackageSizesComparable, parsePackageSizeFromText } from './packageSize.js';
export { resolveProductGroup } from './resolveProductGroup.js';
export type { ProductGroupResolverInput } from './resolveProductGroup.js';
export { getAlternativeSuppressionReason, logAlternativeSuppression } from './alternativeSuppression.js';
export type { AlternativeSuppressionEvent, AlternativeSuppressionReason } from './alternativeSuppression.js';

export { PRODUCT_GROUP_REGISTRY, findProductGroupRegistryEntry } from './registry.js';
export type { ProductGroupEligibility, ProductGroupPackageSizeCompatibility, ProductGroupPriceNormalizer, ProductGroupRegistryEntry, ProductGroupRiskLevel } from './registry.js';
