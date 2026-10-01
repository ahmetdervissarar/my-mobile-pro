/**
 * RafSkoru — Katlanır Bölüm
 * src/ui/CollapsibleSection.tsx
 *
 * Katmanlı sadeleştirme: ürün sayfasındaki açıklama metinleri artık kart
 * yüzeyinde değil, bu bölüm açılınca görünür. Güvenlik sınırı: uyarının
 * VARLIĞI/seviyesi `summary` ile başlıkta HER ZAMAN görünür — yalnız
 * AÇIKLAMA METNİ (children) katlanır, hiçbir uyarı gizlenmez.
 */
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, radii, spacing, useTheme } from './theme';

export interface CollapsibleSectionProps {
  title: string;
  /** Başlıkta sağda gri gösterilen durum özeti (ör. "Eksik", "Veri yok", "Yok", "Orta"). */
  summary?: string | null;
  /** Varsayılan: false — tüm bölümler kapalı başlar. */
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({ title, summary, defaultOpen = false, children }: CollapsibleSectionProps) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <View
      style={{
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        onPress={() => setIsOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${title}${summary ? `, ${summary}` : ''}${isOpen ? ', açık' : ', kapalı'}`}
        style={{
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {summary ? (
            <Text style={{ fontSize: 12, color: colors.muted }} numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
          <Text style={{ fontSize: 16, color: colors.muted }}>{isOpen ? '−' : '+'}</Text>
        </View>
      </Pressable>

      {isOpen ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm }}>{children}</View>
      ) : null}
    </View>
  );
}
