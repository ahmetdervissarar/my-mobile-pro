/**
 * RafSkoru — NOVA İşlenmişlik Rozeti
 * src/ui/NovaBadge.tsx
 */

import { Text, View } from 'react-native';

import { radii, spacing, useTheme } from './theme';

const NOVA_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: '#2E9E5B',
  2: '#8BC34A',
  3: '#F08C00',
  4: '#B42318',
};

const NOVA_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'İşlenmemiş / az işlenmiş',
  2: 'İşlenmiş mutfak malzemesi',
  3: 'İşlenmiş gıda',
  4: 'Ultra işlenmiş gıda',
};

export interface NovaBadgeProps {
  group: 1 | 2 | 3 | 4 | null;
}

export function NovaBadge({ group }: NovaBadgeProps) {
  const { colors } = useTheme();
  const color = group ? NOVA_COLORS[group] : colors.muted;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: colors.soft,
        borderRadius: radii.sm,
        paddingVertical: 2,
        paddingHorizontal: 2,
        paddingRight: spacing.sm,
      }}
      accessibilityLabel={group ? `NOVA grubu ${group}: ${NOVA_LABELS[group]}` : 'NOVA grubu: veri yok'}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{group ?? '–'}</Text>
      </View>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: colors.ink }}>
        {group ? NOVA_LABELS[group] : 'NOVA: veri yok'}
      </Text>
    </View>
  );
}
