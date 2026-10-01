import { Pressable, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from '../../ui/theme';
import { getAllergenStatusLine, type AllergenStatusTone } from './allergenStatusLine';
import type { AllergenBannerData } from './helpers';

export interface AllergenStatusRowProps {
  data: AllergenBannerData;
  onPress: () => void;
}

/** Ürün sayfasında her zaman görünen tek satır alerjen durumu — dokununca AllergenDetailSheet açılır. */
export function AllergenStatusRow({ data, onPress }: AllergenStatusRowProps) {
  const { colors } = useTheme();
  const line = getAllergenStatusLine(data);

  const toneStyle: Record<AllergenStatusTone, { bg: string; fg: string }> = {
    danger: { bg: colors.dangerBg, fg: colors.danger },
    caution: { bg: colors.cautionBg, fg: colors.caution },
    neutral: { bg: colors.soft, fg: colors.ink },
  };
  const style = toneStyle[line.tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Alerjen durumu: ${line.text}. Ayrıntı için dokun.`}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        borderRadius: radii.lg,
        paddingHorizontal: spacing.md,
        backgroundColor: style.bg,
      }}
    >
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: style.fg }} numberOfLines={2}>
        {line.text}
      </Text>
      <Text style={{ fontSize: 18, color: style.fg, fontWeight: '700' }}>›</Text>
    </Pressable>
  );
}
