import { AllergenBanner } from '../../ui/AllergenBanner';
import type { AllergenBannerData } from './helpers';

export interface AllergenSectionProps {
  data: AllergenBannerData;
}

/** Alerji uyarısı — RafSkoru'nda her zaman en üstte, puandan bağımsız. */
export function AllergenSection({ data }: AllergenSectionProps) {
  return (
    <AllergenBanner
      status={data.status}
      declaredList={data.declaredList}
      traceList={data.traceList}
      criticalMatches={data.criticalMatches}
      displayInfo={data.displayInfo}
    />
  );
}
