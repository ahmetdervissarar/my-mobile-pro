/**
 * RafSkoru — Adet Seçici
 * src/ui/Stepper.tsx
 */

import { Pressable, Text, View } from 'react-native';

import { radii, useTheme } from './theme';

export interface StepperProps {
  value: number;
  onChange: (nextValue: number) => void;
  min?: number;
  max?: number;
  unitLabel?: string;
}

export function Stepper({ value, onChange, min = 1, max = 99, unitLabel }: StepperProps) {
  const { colors } = useTheme();

  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: colors.soft,
        borderRadius: radii.md,
      }}
    >
      <Pressable
        onPress={decrease}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Adedi azalt"
        style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: value <= min ? 0.4 : 1 }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>−</Text>
      </Pressable>

      <Text style={{ minWidth: 28, textAlign: 'center', fontWeight: '700', color: colors.ink }}>
        {value}
        {unitLabel ? ` ${unitLabel}` : ''}
      </Text>

      <Pressable
        onPress={increase}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Adedi artır"
        style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center', opacity: value >= max ? 0.4 : 1 }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>+</Text>
      </Pressable>
    </View>
  );
}
