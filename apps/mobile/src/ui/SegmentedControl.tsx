/**
 * RafSkoru — Segmentli Kontrol
 * src/ui/SegmentedControl.tsx
 *
 * Örn. sepet ekranında "Puana göre / Fiyata göre" sekmeleri.
 */

import { Pressable, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, radii, useTheme } from './theme';

export interface SegmentedControlOption<T extends string> {
  key: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.soft,
        borderRadius: radii.md,
        padding: 4,
        gap: 4,
      }}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const isSelected = option.key === value;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET - 8,
              borderRadius: radii.sm + 3,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isSelected ? colors.surface : 'transparent',
            }}
          >
            <Text
              style={{
                fontWeight: '700',
                fontSize: 14,
                color: isSelected ? colors.ink : colors.muted,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
