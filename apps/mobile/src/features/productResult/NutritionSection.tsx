import { Text, View } from 'react-native';

import {
  formatNutritionValue,
  getTrafficLightLevelLabel,
  getTrafficLightNutrientLabel,
} from '../../nutrition/trafficLight';
import type { TrafficLightNutrition } from '../../types/product';
import { spacing, useTheme } from '../../ui/theme';

export interface NutritionSectionProps {
  trafficLight: TrafficLightNutrition | null;
}

const NUTRIENT_KEYS = ['fat', 'saturatedFat', 'sugars', 'salt'] as const;

/** "Besin değerleri" içeriği — YALNIZ besin sayıları + Traffic Light; uyarı/olumlu metin burada YOK (bkz. onaylı plan, madde 3). */
export function NutritionSection({ trafficLight }: NutritionSectionProps) {
  const { colors } = useTheme();

  if (!trafficLight) {
    return <Text style={{ fontSize: 13, color: colors.muted }}>Bu ürün için besin değeri verisi yok.</Text>;
  }

  return (
    <View style={{ gap: spacing.xs }}>
      {NUTRIENT_KEYS.map((key) => {
        const value = trafficLight[key];
        return (
          <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.ink }}>{getTrafficLightNutrientLabel(key)}</Text>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              {formatNutritionValue(value)} · {getTrafficLightLevelLabel(value.level)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
